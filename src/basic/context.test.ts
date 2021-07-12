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

        it("evaluates identifiers", async () => {
            const { context } = await run(`
            LET A$ = "hello"
            PRINT A$ + " world"
            `);
            expect(context.api.print).toHaveBeenCalledWith("hello world");
        });

        it("evaluates the exponent operator", async () => {
            const { context } = await run(`PRINT 2^3`);
            expect(context.api.print).toHaveBeenCalledWith("8");
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

    describe("runs if statements", () => {
        it("runs if..goto statements", async () => {
            const { context, result } = await run(`
            10 PRINT "a"
            20 IF -1 GOTO 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("a");
            expect(context.api.print).not.toHaveBeenCalledWith("b");
            expect(context.api.print).toHaveBeenCalledWith("c");
        });

        it("runs if..then goto statements", async () => {
            const { context, result } = await run(`
            10 PRINT "a"
            20 IF -1 THEN 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("a");
            expect(context.api.print).not.toHaveBeenCalledWith("b");
            expect(context.api.print).toHaveBeenCalledWith("c");
        });

        it("runs if..then statements", async () => {
            const { context, result } = await run(`
            10 PRINT "a"
            20 IF -1 THEN PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("a");
            expect(context.api.print).toHaveBeenCalledWith("b");
            expect(context.api.print).toHaveBeenCalledWith("c");
        });

        it("does not run if..then statements if condition is false", async () => {
            const { context } = await run(`
            10 PRINT "a"
            20 IF 0 GOTO 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("a");
            expect(context.api.print).toHaveBeenCalledWith("b");
            expect(context.api.print).toHaveBeenCalledWith("c");
        });

        it("runs the conditions", async () => {
            const { context, result } = await run(`
            10 A = 0
            20 IF A = 1 THEN PRINT "a is 1"
            30 IF A <> 1 THEN PRINT "a is not 1"
            RUN
            `);

            expect(context.api.print).not.toHaveBeenCalledWith("a is 1");
            expect(context.api.print).toHaveBeenCalledWith("a is not 1");
        });
    });

    describe("for/next statements", () => {
        it("runs for loops on multiple lines", async () => {
            const { context } = await run(`
            10 FOR I = 0 TO 5
            20 PRINT I
            30 NEXT
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("0");
            expect(context.api.print).toHaveBeenCalledWith("1");
            expect(context.api.print).toHaveBeenCalledWith("2");
            expect(context.api.print).toHaveBeenCalledWith("3");
            expect(context.api.print).toHaveBeenCalledWith("4");

            expect(context.forStack).toHaveLength(0);
        });

        it("runs for in a compound statement", async () => {
            const { context } = await run(`FOR I = 0 TO 5 : PRINT I : NEXT`);

            expect(context.api.print).toHaveBeenCalledWith("0");
            expect(context.api.print).toHaveBeenCalledWith("1");
            expect(context.api.print).toHaveBeenCalledWith("2");
            expect(context.api.print).toHaveBeenCalledWith("3");
            expect(context.api.print).toHaveBeenCalledWith("4");
            expect(context.api.print).toHaveBeenCalledWith("5");

            expect(context.forStack).toHaveLength(0);
        });

        it("runs for loops backwards", async () => {
            const { context } = await run(`FOR I = 5 TO 0 STEP -1 : PRINT I : NEXT`);

            expect(context.api.print).toHaveBeenCalledWith("5");
            expect(context.api.print).toHaveBeenCalledWith("4");
            expect(context.api.print).toHaveBeenCalledWith("3");
            expect(context.api.print).toHaveBeenCalledWith("2");
            expect(context.api.print).toHaveBeenCalledWith("1");
            expect(context.api.print).toHaveBeenCalledWith("0");

            expect(context.forStack).toHaveLength(0);
        });

        it("runs nested for loops", async () => {
            const { context } = await run(`
            10 FOR X = 0 TO 2
            20    FOR Y = 0 TO 2
            30        PRINT X "," Y
            40    NEXT
            50 NEXT
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("0,0");
            expect(context.api.print).toHaveBeenCalledWith("0,1");
            expect(context.api.print).toHaveBeenCalledWith("1,0");
            expect(context.api.print).toHaveBeenCalledWith("1,1");

            expect(context.forStack).toHaveLength(0);
        });

        it("runs for loops by name", async () => {
            const { context } = await run(`
            10 FOR X = 0 TO 2
            20    FOR Y = 0 TO 2
            30        PRINT X "," Y
            40 NEXT Y, X
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith("0,0");
            expect(context.api.print).toHaveBeenCalledWith("0,1");
            expect(context.api.print).toHaveBeenCalledWith("1,0");
            expect(context.api.print).toHaveBeenCalledWith("1,1");

            expect(context.forStack).toHaveLength(0);
        });
    });

    describe("boolean conditions", () => {
        it("treats boolean AND operators in conditions as conditions", async () => {
            const { context } = await run(
                `IF 1 = 1 AND 2 = 2 THEN PRINT "true"`
            );
            expect(context.api.print).toHaveBeenCalledWith("true");
        });

        it("treats boolean OR operators in conditions as conditions", async () => {
            const { context } = await run(
                `IF 1 = 1 OR 2 = 3 THEN PRINT "true"`
            );
            expect(context.api.print).toHaveBeenCalledWith("true");
        });

        it("treats AND operators in expressions as bitwise", async () => {
            const { context } = await run(
                `IF 1 = 1 AND 2 = 2 THEN PRINT 3 AND 1`
            );
            expect(context.api.print).toHaveBeenCalledWith("1");
        });

        it("treats NOT operators in expressions as bitwise", async () => {
            const { context } = await run(`PRINT NOT 1`);
            expect(context.api.print).toHaveBeenCalledWith(`${~1}`);
        });

        it("treats NOT operators in condtionals as boolean operators", async () => {
            const { context } = await run(`IF NOT 1 = 3 THEN PRINT "true"`);
            expect(context.api.print).toHaveBeenCalledWith(`true`);
        });
    });

    describe("gosub statements", () => {
        it("runs gosub statements", async () => {
            const { context } = await run(`
            5 PRINT "starting"
            10 GOSUB 30
            20 PRINT "done"
            30 REM hello func
            40 PRINT "hello"
            50 RETURN
            
            RUN
            `);

            expect(context.api.print).toHaveBeenNthCalledWith(1, "starting");
            expect(context.api.print).toHaveBeenNthCalledWith(2, "hello");
            expect(context.api.print).toHaveBeenNthCalledWith(3, "done");
        });

        it("it errors if you return with no gosub", async () => {
            const { context, result } = await run(`
            50 RETURN            
            RUN
            `);

            testForError(result, "cannot return on empty stack");
        });
    });
});
