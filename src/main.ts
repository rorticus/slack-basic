import { config } from 'dotenv';
import { App } from '@slack/bolt';
import { Context } from './basic/context';
import Lexer from './basic/lexer';
import { Parser } from './basic/parser';
import { ErrorValue, ObjectType, ValueObject } from './basic/object';
import { BufferedPrinter } from './bufferedprinter';
import { react } from './react';
import { decode } from 'html-entities';
import * as path from 'path';
import * as fs from 'fs';
import { Statement } from './basic/ast';

config();

const contexts = new Map<string, Context>();
const inputPromises: Map<string, (i: string) => void> = new Map();
const printers = new Map<string, BufferedPrinter>();

const baseDataDirectory = path.resolve(__dirname, process.env.DATA_DIR);

if (!fs.existsSync(baseDataDirectory)) {
    fs.mkdirSync(baseDataDirectory);
}

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
                load: async (filename) => {
                    const userPath = path.resolve(baseDataDirectory, userId);

                    if (!filename.match(/^[a-z0-9\-_]+$/gi)) {
                        return Promise.reject(
                            'Error loading file. Filename cannot contain other than alphanumeric characters',
                        );
                    }

                    const filePath = path.resolve(
                        userPath,
                        `${filename.toUpperCase()}.bas`,
                    );

                    if (!fs.existsSync(filePath)) {
                        return Promise.reject('File not found');
                    }

                    const basicSource = fs.readFileSync(filePath, 'utf-8');

                    const statements: Statement[] = [];

                    const lines = basicSource.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();

                        const lexer = new Lexer(line);
                        const parser = new Parser(lexer);

                        const statement = parser.parseStatement();
                        if (parser.errors.length > 0) {
                            return Promise.reject(parser.errors[0]);
                        }

                        if (statement) {
                            statements.push(statement);
                        }
                    }

                    return Promise.resolve(statements);
                },
                save: async (filename, statements) => {
                    const userPath = path.resolve(baseDataDirectory, userId);

                    if (!fs.existsSync(userPath)) {
                        fs.mkdirSync(userPath);
                    }

                    const basicSource = statements
                        .map((statement) => statement.toString())
                        .join('\r\n');

                    if (basicSource === '') {
                        return Promise.reject(
                            'Error saving file. Source listing is empty.',
                        );
                    }

                    if (!filename.match(/^[a-z0-9\-_]+$/gi)) {
                        return Promise.reject(
                            'Error saving file. Filename cannot contain other than alphanumeric characters',
                        );
                    }

                    fs.writeFileSync(
                        path.resolve(userPath, `${filename.toUpperCase()}.bas`),
                        basicSource,
                        'utf-8',
                    );

                    return Promise.resolve();
                },
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
            if (message) {
                await basicContext.api.print(message);
            }
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
