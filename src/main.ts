import { config } from 'dotenv';
import { App } from '@slack/bolt';
import { Context } from './basic/context';
import Lexer from './basic/lexer';
import { Parser } from './basic/parser';
import { ErrorValue, ObjectType, ValueObject } from './basic/object';

config();

const contexts = new Map<string, Context>();

const app = new App({
    token: process.env.BOT_TOKEN,
    socketMode: true,
    appToken: process.env.APP_TOKEN,
});

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
            basicContext.api.print = async (msg: string) => {
                printLines.push(msg);
            };
            result = await basicContext.runImmediateStatement(statement);

            if (result.type() === ObjectType.ERROR_OBJ) {
                await context.say((result as ErrorValue).message);
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
        await context.say('OK');
    }
});

(async () => {
    await app.start();
    console.log('Slack basic started!');
})();
