import * as fs from 'fs';
import * as path from 'path';
import { BasicCanvas, Context, ContextApi } from '../basic/context';
import { isError, ValueObject } from '../basic/object';
import Lexer from '../basic/lexer';
import { Parser } from '../basic/parser';

const wumpus = fs.readFileSync(
    path.resolve(__dirname, '../../examples/hunt-the-wumpus.bas'),
    'utf-8',
);

async function run(
    code: string,
    overrides: Partial<ContextApi> = {},
    existingContext: Context | null = null,
) {
    const context =
        existingContext ||
        new Context({
            print: jest.fn().mockResolvedValue(undefined),
            input: jest.fn().mockResolvedValue(''),
            load: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue(undefined),
            createImage(width: number, height: number): Promise<BasicCanvas> {
                const data = Array(width * height);
                for (let i = 0; i < width * height; i++) {
                    data[i] = 0;
                }

                return Promise.resolve({
                    width,
                    height,
                    setPixel: (x, y, color) =>
                        (data[Math.floor(y) * width + Math.floor(x)] = color),
                    getPixel: (x, y) =>
                        data[Math.floor(y) * width + Math.floor(x)],
                    clear: (color) =>
                        data.forEach((_, index) => (data[index] = color)),
                });
            },
            ...overrides,
        });

    const lines = code.split('\n');
    let result: ValueObject | undefined;
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const lexer = new Lexer(line);
        const parser = new Parser(lexer);

        const statement = parser.parseStatement();
        if (statement) {
            result = await context.runImmediateStatement(statement!);
            if (isError(result)) {
                errors.push(result.message);
            }
        }
    }
    return { context, result, errors };
}

describe('hunt the wumpus', () => {
    it('plays', async () => {
        const input = jest.fn();

        input.mockResolvedValueOnce('1'); // enter a number

        const { errors } = await run(
            `
        ${wumpus}
        RUN
        `,
            {
                input,
            },
        );

        console.log(errors);
    });
});
