import { Context, ContextApi } from "./context";
import Lexer from "./lexer";
import { Parser } from "./parser";
import { LetStatement, StatementType } from "./ast";
import { ErrorValue, ObjectType, ValueObject } from "./object";

describe("context tests", () => {
    async function run(code: string, overrides: Partial<ContextApi> = {}) {
        const context = new Context({
            print: jest.fn().mockResolvedValue(undefined),
            input: jest.fn().mockResolvedValue(""),
            ...overrides,
        });

        const lines = code.split("\n");
        let result: ValueObject | undefined;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const lexer = new Lexer(line);
            const parser = new Parser(lexer);

            const statement = parser.parseStatement();
            if (statement) {
                result = await context.runImmediateStatement(statement!);
            }
        }
        return { context, result };
    }

    function testForError(result: ValueObject | undefined, expected: string) {
        expect(result).not.toBeUndefined();
        expect(result!.type()).toEqual(ObjectType.ERROR_OBJ);
        expect((result as ErrorValue).message).toEqual(expected);
    }

    describe("immediate tasks", () => {
        it("runs statements without line numbers immediately", async () => {
            const { context } = await run('PRINT "hello"');
            expect(context.api.print).toHaveBeenCalledWith("hello");
        });

        it("add statements with line numbers to the program", async () => {
            const { context } = await run("100 LET A = 1");
            expect(context.lines).toHaveLength(1);
        });

        it("puts line numbers in order", async () => {
            const { context } = await run(`
            100 LET A = 1
            50 LET B = 1
            `);
            expect(context.lines).toHaveLength(2);
            expect(context.lines[0].lineNumber).toBe(50);
            expect(context.lines[1].lineNumber).toBe(100);
        });

        it("replaces line numbers", async () => {
            const { context } = await run(`
            100 LET A = 1
            100 LET B = 1
            `);
            expect(context.lines).toHaveLength(1);
            expect(context.lines[0].lineNumber).toBe(100);
            expect(context.lines[0].type).toEqual(StatementType.LET);
            expect((context.lines[0] as LetStatement).names).toHaveLength(1);
            expect((context.lines[0] as LetStatement).names[0].value).toBe("B");
        });
    });

    describe("evaluation", () => {
        it("evaluates expressions", async () => {
            const { context } = await run(`PRINT 1 + 2`);
            expect(context.api.print).toHaveBeenCalledWith("3");
        });

        it("evaluates identifieres", async () => {
            const { context } = await run(`
            LET A$ = "hello"
            PRINT A$ + " world"
            `);
            expect(context.api.print).toHaveBeenCalledWith("hello world");
        });
    });

    describe("stored programs", () => {
        it("runs stored programs", async () => {
            const { context } = await run(`
        10 LET A, B = 2
        20 LET C = A + B
        30 PRINT "the answer is " C
        `);

            expect(context.api.print).not.toHaveBeenCalled();

            await context.runProgram();

            expect(context.api.print).toHaveBeenCalledWith("the answer is 4");
        });
    });

    describe("input", () => {
        it("pauses until input is accepted", async () => {
            const print = jest.fn();
            let resolver: any;
            const input = jest.fn().mockImplementation(
                () =>
                    new Promise((resolve) => {
                        resolver = resolve;
                    })
            );

            run(
                `
            INPUT A$
            PRINT A$
            `,
                {
                    input,
                    print,
                }
            );

            expect(input).toHaveBeenCalled();

            resolver("test");

            await new Promise(setImmediate);

            expect(print).toHaveBeenCalledWith("test");
        });
    });

    describe("compound statements", () => {
        it("runs compound statements", async () => {
            const { context } = await run(`PRINT "a" : PRINT "b"`);

            expect(context.api.print).toHaveBeenCalledWith("a");
            expect(context.api.print).toHaveBeenCalledWith("b");
        });
    });

    describe("goto statements", () => {
        it("runs goto statements", async () => {
            const { context } = await run(`
            10 PRINT "a"
            20 GOTO 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("a");
            expect(context.api.print).not.toHaveBeenCalledWith("b");
            expect(context.api.print).toHaveBeenCalledWith("c");
        });

        it("errors if line does not exist", async () => {
            const { context, result } = await run(`
            10 PRINT "a"
            20 GOTO 50
            RUN
            `);

            testForError(result, "cannot goto line that does not exist, 50");
        });
    });
});
