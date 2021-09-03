import { config } from 'dotenv';
import { App, View } from '@slack/bolt';
import { Context, NULL } from './basic/context';
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
const triggerIds = new Map<string, string>();

function getPrinterForUserId(userId: string): BufferedPrinter {
    if (!printers.has(userId)) {
        printers.set(userId, new BufferedPrinter());
    }

    return printers.get(userId);
}

function getContextForUserId(userId: string): Context {
    if (!contexts.has(userId)) {
        const printer = getPrinterForUserId(userId);

        const basicContext = new Context({
            print: printer.print.bind(printer),
            list: () => Promise.resolve(),
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

                return Promise.resolve(basicSource);
            },
            save: async (filename, basicSource) => {
                const userPath = path.resolve(baseDataDirectory, userId);

                if (!fs.existsSync(userPath)) {
                    fs.mkdirSync(userPath);
                }

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
                        image.setPixelColor(Jimp.cssColorToHex(color), x, y),
                });
            },
        });

        basicContext.onStop = () => {
            if (inputPromises.has(userId)) {
                inputPromises.delete(userId);
            }
        };

        basicContext.maxExecutionTime = 10000;

        contexts.set(userId, basicContext);
    }

    return contexts.get(userId);
}

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

        triggerIds.set(context.body.user.id, (context.body as any).trigger_id);

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

async function loadProgram(
    basicProgram: string,
    context: Context,
): Promise<ValueObject> {
    const lines = basicProgram.replace(/```/g, '').split('\n');
    let result: ValueObject | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = decode(lines[i].trim());

        if (line === '') {
            continue;
        }

        result = await context.runImmediateStatement(line);

        if (result.type() === ObjectType.ERROR_OBJ) {
            return result;
        }
    }

    return NULL;
}

app.command('/basic', async (context) => {
    await context.ack();

    if (!context.command.text.toUpperCase().match(/^[a-z0-9\-_]+$/gi)) {
        return context.respond(
            'Invalid filename. Alpha numeric characeters only, and no extension please!',
        );
    }

    const sharePath = path.resolve(baseDataDirectory, context.body.team_id);
    const fileName = path.resolve(
        sharePath,
        `${context.command.text.toUpperCase()}.bas`,
    );

    if (!fs.existsSync(fileName)) {
        await context.respond({
            text: 'Uh oh! No shared basic programs with that name exist.',
        });
        return;
    }

    const userId = fs.readFileSync(fileName, 'utf-8');
    const programPath = path.resolve(
        baseDataDirectory,
        userId,
        `${context.command.text.toUpperCase()}.bas`,
    );

    const programSource = fs.readFileSync(programPath, 'utf-8');

    const basicContext = getContextForUserId(userId);
    const printer = getPrinterForUserId(userId);
    printer.say = async (message: string) => {
        await context.say(message);
    };

    triggerIds.set(context.body.user_id, context.body.trigger_id);
    basicContext.api.input = (message?: string) => {
        return new Promise<string | null>(async (resolve) => {
            inputPromises.set(userId, resolve);

            await context.client.views.open({
                trigger_id: triggerIds.get(context.body.user_id),
                view: {
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
                                text: message ?? 'Enter input',
                            },
                            element: {
                                type: 'plain_text_input',
                                action_id: userId,
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
    };

    basicContext.stop();
    basicContext.runNewStatement();

    const loadResult = await loadProgram(programSource, basicContext);
    if (loadResult.type() === ObjectType.ERROR_OBJ) {
        await context.respond({
            text: loadResult.toString(),
        });
    }

    const runResult = await basicContext.runProgram();
    if (runResult.type() === ObjectType.ERROR_OBJ) {
        await context.respond({
            text: runResult.toString(),
        });
    } else if (runResult.type() !== ObjectType.ERROR_OBJ) {
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
                channels: context.command.channel_name,
            });
        }
    }
});

app.message(/(.*)/, async (context) => {
    const { text, user: userId } = context.message as {
        text: string;
        user: string;
    };

    const printer = getPrinterForUserId(userId);

    printer.say = async (message: string) => {
        await context.say(message);
    };

    const basicContext = getContextForUserId(userId);

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

    basicContext.api.list = async (code: string) => {
        await context.say('\n```' + code + '\n```');
    };

    const result = await loadProgram(text, basicContext);
    if (result.type() === ObjectType.ERROR_OBJ) {
        await react('x', context);
        await context.say(result.toString());
    } else {
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

function buildHomepage(
    userId: string,
    teamId: string,
    {
        showFileError = false,
        showShareExistsError = false,
        showShareFileError = false,
    }: {
        showFileError?: boolean;
        showShareExistsError?: boolean;
        showShareFileError?: boolean;
    } = {},
): View {
    const fileBlocks = [];
    const sharedBlocks = [];

    const userPath = path.resolve(baseDataDirectory, userId);
    const sharePath = path.resolve(baseDataDirectory, teamId);
    const allFiles = fs.existsSync(userPath) ? fs.readdirSync(userPath) : [];
    const sharedFiles = (
        fs.existsSync(sharePath) ? fs.readdirSync(sharePath) : []
    )
        .filter((s) => allFiles.indexOf(s) >= 0)
        .filter(
            (s) =>
                fs.readFileSync(path.resolve(sharePath, s), 'utf-8') === userId,
        );

    if (allFiles.length === 0) {
        fileBlocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: "_It looks like you don't have any saved programs yet. Use the `SAVE` statement to save your first BASIC program!_",
            },
        });
    } else {
        fileBlocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: "You've saved the following BASIC programs.",
            },
            block_id: 'file_picker',
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

        if (showFileError) {
            fileBlocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: ':warning: *Please select a file first*',
                },
            });
        }

        if (showShareExistsError) {
            fileBlocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: ':warning: *A file with this name is already shared. You will have to rename this file if you want to share it.*',
                },
            });
        }

        if (sharedFiles.length === 0) {
            sharedBlocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: "_It looks like you don't have any shared programs yet. After saving a program, share it by selecting it and using the Share button._",
                },
            });
        } else {
            sharedBlocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: "You've shared the following BASIC programs.",
                },
                block_id: 'share_file_picker',
                accessory: {
                    type: 'radio_buttons',
                    options: sharedFiles.map((file) => ({
                        text: {
                            type: 'mrkdwn',
                            text: `\`${file.toUpperCase()}\``,
                        },
                        value: file,
                    })),
                    action_id: 'action-shared-file',
                },
            });

            if (showShareFileError) {
                sharedBlocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: ':warning: *Please select a file first*',
                    },
                });
            }

            sharedBlocks.push({
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Unshare',
                            emoji: true,
                        },
                        value: 'action-unshare',
                        action_id: 'action-unshare',
                    },
                ],
            });
        }

        fileBlocks.push({
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: ':put_litter_in_its_place:  Delete',
                        emoji: true,
                    },
                    value: 'action-delete',
                    action_id: 'action-delete',
                },
                {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: ':heart:  Share',
                        emoji: true,
                    },
                    value: 'action-share',
                    action_id: 'action-share',
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
                text: 'Welcome to the home of *Slack Basic*! What is Slack Basic? Read more about it, and read the help and examples, at http://slackbasic.com.',
            },
        },
        {
            type: 'divider',
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Stuck in a loop? Manage your Basic Interpreter here.',
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
        {
            type: 'divider',
        },
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'Shared Programs',
                emoji: true,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Sharing a program makes it accessible to all users in Slack. They\'ll be able to run your program with the `/basic "[name]"` command. Note that shared program names are unique, so you and another member cannot both use the same program name.',
            },
        },
        ...sharedBlocks,
    ];

    return {
        type: 'home',
        callback_id: 'home',
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
        view: buildHomepage(context.event.user, context.body.team_id),
    });
});

app.action('action-stop', async (context) => {
    await context.ack();

    const basicContext = contexts.get(context.body.user.id);

    if (basicContext) {
        basicContext.stop();
    }
});

app.action('action-file', async (context) => {
    await context.ack();
});

app.action('action-shared-file', async (context) => {
    await context.ack();
});

app.action('action-delete', async (context) => {
    const viewState = (context.body as any).view.state;
    const selectedFile =
        viewState?.values[Object.keys(viewState.values)[0]]?.['action-file']?.[
            'selected_option'
        ]?.value;

    if (selectedFile) {
        const userPath = path.resolve(baseDataDirectory, context.body.user.id);
        const filePath = path.resolve(userPath, selectedFile);

        fs.rmSync(filePath);

        await context.ack();
        await context.client.views.publish({
            token: process.env.BOT_TOKEN,
            user_id: context.body.user.id,
            view: buildHomepage(
                context.body.user.id,
                context.body.user.team_id,
            ),
        });
    } else {
        //todo: show error
        await context.ack();
        await context.client.views.publish({
            token: process.env.BOT_TOKEN,
            user_id: context.body.user.id,
            view: buildHomepage(
                context.body.user.id,
                context.body.user.team_id,
                { showFileError: true },
            ),
        });
    }
});

app.action('action-share', async (context) => {
    const viewState = (context.body as any).view.state;
    const selectedFile =
        viewState?.values['file_picker']?.['action-file']?.['selected_option']
            ?.value;

    if (selectedFile) {
        const userPath = path.resolve(baseDataDirectory, context.body.user.id);
        const filePath = path.resolve(userPath, selectedFile);

        if (fs.existsSync(filePath)) {
            const shareBasePath = path.resolve(
                baseDataDirectory,
                context.body.user.team_id,
            );
            const sharePath = path.resolve(shareBasePath, selectedFile);

            if (!fs.existsSync(shareBasePath)) {
                fs.mkdirSync(shareBasePath);
            }

            if (fs.existsSync(sharePath)) {
                // a file with this name already is shared
                await context.ack();
                await context.client.views.publish({
                    token: process.env.BOT_TOKEN,
                    user_id: context.body.user.id,
                    view: buildHomepage(
                        context.body.user.id,
                        context.body.user.team_id,
                        {
                            showShareExistsError: true,
                        },
                    ),
                });
                return;
            } else {
                fs.writeFileSync(sharePath, context.body.user.id);
            }
        }

        await context.ack();
        await context.client.views.publish({
            token: process.env.BOT_TOKEN,
            user_id: context.body.user.id,
            view: buildHomepage(
                context.body.user.id,
                context.body.user.team_id,
            ),
        });
    } else {
        //todo: show error
        await context.ack();
        await context.client.views.publish({
            token: process.env.BOT_TOKEN,
            user_id: context.body.user.id,
            view: buildHomepage(
                context.body.user.id,
                context.body.user.team_id,
                {
                    showFileError: true,
                },
            ),
        });
    }
});

app.action('action-unshare', async (context) => {
    const viewState = (context.body as any).view.state;
    const selectedFile =
        viewState?.values['share_file_picker']?.['action-shared-file']?.[
            'selected_option'
        ]?.value;

    if (selectedFile) {
        const sharePath = path.resolve(
            baseDataDirectory,
            context.body.user.team_id,
        );
        const filePath = path.resolve(sharePath, selectedFile);

        if (fs.existsSync(filePath)) {
            fs.rmSync(filePath);
        }

        await context.ack();
        await context.client.views.publish({
            token: process.env.BOT_TOKEN,
            user_id: context.body.user.id,
            view: buildHomepage(
                context.body.user.id,
                context.body.user.team_id,
            ),
        });
        return;
    } else {
        await context.ack();
        await context.client.views.publish({
            token: process.env.BOT_TOKEN,
            user_id: context.body.user.id,
            view: buildHomepage(
                context.body.user.id,
                context.body.user.team_id,
                {
                    showShareFileError: true,
                },
            ),
        });
    }
});

(async () => {
    await app.start();
    console.log('Slack basic started!');
})();
