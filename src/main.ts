import { config } from 'dotenv';
import { App } from '@slack/bolt';
import { Context } from './basic/context';
import Lexer from './basic/lexer';
import { Parser } from './basic/parser';
import { ErrorValue, ObjectType, ValueObject } from './basic/object';
import { BufferedPrinter } from './bufferedprinter';
import { react } from './react';
import { decode } from 'html-entities';

config();

const contexts = new Map<string, Context>();
const inputPromises: Map<string, (i: string) => void> = new Map();
const printers = new Map<string, BufferedPrinter>();

const app = new App({
    token: process.env.BOT_TOKEN,
    socketMode: true,
    appToken: process.env.APP_TOKEN,
});

app.view(
    { callback_id: 'input_view', type: 'view_submission' },
    async (context) => {
        await context.ack();

        const actionId = context.view.blocks[0].element.action_id;

        const p = inputPromises.get(actionId);
        if (p) {
            p(context.view.state.values.input_box[actionId].value);
            inputPromises.delete(actionId);
        }
    },
);

app.view(
    { callback_id: 'input_view', type: 'view_closed' },
    async (context) => {
        await context.ack();

        const actionId = context.view.blocks[0].element.action_id;

        const p = inputPromises.get(actionId);
        if (p) {
            p('');
            inputPromises.delete(actionId);
        }
    },
);

app.command('/basic', async (context) => {
    await context.ack();
});

app.message(/(.*)/, async (context) => {
    const { text, user: userId } = context.message as {
        text: string;
        user: string;
    };

    if (!printers.has(userId)) {
        printers.set(userId, new BufferedPrinter());
    }

    const printer = printers.get(userId);
    printer.say = async (message: string) => {
        await context.say(message);
    };

    if (!contexts.has(userId)) {
        contexts.set(
            userId,
            new Context({
                print: printer.print.bind(printer),
                input: () => Promise.resolve(''),
                load: () => Promise.resolve([]),
                save: () => Promise.resolve(),
                createImage: () =>
                    Promise.resolve({
                        width: 0,
                        height: 0,
                        clear: () => 0,
                        getPixel: () => 0,
                        setPixel: () => 0,
                    }),
            }),
        );
    }

    const basicContext = contexts.get(userId);

    if (inputPromises.has(userId)) {
        inputPromises.get(userId)(text);
        inputPromises.delete(userId);
        return;
    }

    basicContext.api.input = (message?: string) => {
        return new Promise<string | null>(async (resolve) => {
            inputPromises.set(userId, resolve);

            // ask the question and ask for input
            await basicContext.api.print(message);
        });
    };

    const lines = text.replace(/```/g, '').split('\n');
    let result: ValueObject | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = decode(lines[i].trim());

        if (line === '') {
            continue;
        }

        const lexer = new Lexer(line);
        const parser = new Parser(lexer);
        const statement = parser.parseStatement();

        if (parser.errors.length) {
            await react('x', context);
            await context.say(`\`${line}\` - ${parser.errors.join(', ')}`);
            return;
        } else if (statement) {
            result = await basicContext.runImmediateStatement(statement);

            if (result.type() === ObjectType.ERROR_OBJ) {
                await react('x', context);
                await context.say(
                    `Error - \`${(result as ErrorValue).message}\``,
                );
                return;
            }
        }
    }

    if (result.type() !== ObjectType.ERROR_OBJ) {
        await react('ok', context);
    }
});

(async () => {
    await app.start();
    console.log('Slack basic started!');
})();
