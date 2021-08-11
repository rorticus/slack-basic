import { config } from 'dotenv';
import { App, View } from '@slack/bolt';
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
import * as Jimp from 'jimp';

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
                createImage: (width, height) => {
                    const image = new Jimp(width, height);

                    return Promise.resolve({
                        image,
                        width,
                        height,
                        clear: (color) => image.background(color),
                        getPixel: (x, y) => '', // image.getPixelColor(x, y),
                        setPixel: (x, y, color) =>
                            image.setPixelColor(
                                Jimp.cssColorToHex(color),
                                x,
                                y,
                            ),
                    });
                },
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

        if (basicContext.image) {
            // display the image?
            const buffer = await (
                basicContext.image as any
            ).image.getBufferAsync(Jimp.MIME_PNG);

            await context.client.files.upload({
                token: process.env.BOT_TOKEN,
                filetype: 'png',
                filename: 'slackbasic.png',
                file: buffer,
                channels: context.message.channel,
            });
        }
    }
});

function buildHomepage(userId: string): View {
    const fileBlocks = [];

    const userPath = path.resolve(baseDataDirectory, userId);
    const allFiles = fs.existsSync(userPath) ? fs.readdirSync(userPath) : [];
    if (allFiles.length === 0) {
        fileBlocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: "It looks like you don't have any saved programs yet. Use the `SAVE` statement to save your first BASIC program!",
            },
        });
    } else {
        fileBlocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: "You've saved the following BASIC programs.",
            },
            accessory: {
                type: 'radio_buttons',
                options: allFiles.map((file) => ({
                    text: {
                        type: 'mrkdwn',
                        text: `\`${file.toUpperCase()}\``,
                    },
                    value: file,
                })),
                action_id: 'action-file',
            },
        });

        fileBlocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Delete',
                        emoji: true,
                    },
                    value: 'action-delete',
                    action_id: 'action-delete',
                },
            ],
        });
    }

    const blocks = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'Slack Basic',
                emoji: true,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Welcome to the home of *Slack Basic*!',
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Manage your BASIC programs and the status of your BASIC interpretter here.',
            },
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Stop Running Program',
                        emoji: true,
                    },
                    value: 'value-stop',
                    action_id: 'action-stop',
                },
            ],
        },
        {
            type: 'divider',
        },
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'Saved Programs',
                emoji: true,
            },
        },
        ...fileBlocks,
    ];

    return {
        type: 'home',
        title: {
            type: 'plain_text',
            text: 'Slack Basic',
        },
        blocks,
    };
}

app.event('app_home_opened', async (context) => {
    await context.client.views.publish({
        token: process.env.BOT_TOKEN,
        user_id: context.event.user,
        view: buildHomepage(context.event.user),
    });
});

(async () => {
    await app.start();
    console.log('Slack basic started!');
})();
