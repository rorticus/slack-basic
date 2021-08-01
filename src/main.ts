import { config } from 'dotenv';
import { App } from '@slack/bolt';
import { Context } from './basic/context';
import Lexer from './basic/lexer';
import { Parser } from './basic/parser';
import { ErrorValue, ObjectType, ValueObject } from './basic/object';

config();

const contexts = new Map<string, Context>();
const inputPromises: Map<string, (i: string) => void> = new Map();
let inputId = 1;

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
    const { text, user_id: userId } = context.body;

    await context.ack();

    if (!contexts.has(userId)) {
        contexts.set(
            userId,
            new Context({
                print: () => Promise.resolve(),
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

    // set up local request callbacks
    basicContext.api.print = async (msg: string) => {
        printLines.push(msg);
    };
    basicContext.api.input = (message?: string) => {
        const id = `input-${inputId++}`;

        const p = new Promise<string | null>((resolve) => {
            inputPromises.set(id, resolve);

            return context.client.views.open({
                response_action: 'notify_on_close',
                trigger_id: context.body.trigger_id,
                view: {
                    notify_on_close: true,
                    type: 'modal',
                    callback_id: 'input_view',
                    title: {
                        type: 'plain_text',
                        text: 'Slack Basic Input',
                    },
                    blocks: [
                        {
                            type: 'input',
                            block_id: 'input_box',
                            label: {
                                type: 'plain_text',
                                text: message ?? 'Enter a value',
                            },
                            element: {
                                type: 'plain_text_input',
                                action_id: id,
                                multiline: true,
                            },
                        },
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Submit',
                    },
                },
            });
        });

        return p;
    };

    const lines = text.replace(/```/g, '').split('\n');
    let result: ValueObject | null = null;

    const printLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === '') {
            continue;
        }

        const lexer = new Lexer(line);
        const parser = new Parser(lexer);
        const statement = parser.parseStatement();

        if (parser.errors.length) {
            await context.say(`\`${line}\` - ${parser.errors.join(', ')}`);
        } else if (statement) {
            result = await basicContext.runImmediateStatement(statement);

            if (result.type() === ObjectType.ERROR_OBJ) {
                await context.say(
                    `Error - \`${(result as ErrorValue).message}\``,
                );
                break;
            }
        }
    }

    if (printLines.length > 0) {
        await context.say(`\`\`\`
${printLines.join('\n')}
\`\`\``);
    }

    if (result.type() !== ObjectType.ERROR_OBJ) {
        await context.say('`OK`');
    }
});

(async () => {
    await app.start();
    console.log('Slack basic started!');
})();
