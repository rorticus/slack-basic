import { Context } from "./context";
import Lexer from "./lexer";
import { Parser } from "./parser";
import { LetStatement, StatementType } from "./ast";

describe("context tests", () => {
    beforeEach(() => {
        jest.spyOn(console, "log").mockReturnValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function run(code: string) {
        const context = new Context();

        code.split("\n").forEach((line) => {
            const lexer = new Lexer(line);
            const parser = new Parser(lexer);

            const statement = parser.parseStatement();
            if (statement) {
                context.runImmediateStatement(statement!);
            }
        });

        return context;
    }

    describe("immediate tasks", () => {
        it("runs statements without line numbers immediately", () => {
            run('PRINT "hello"');
            expect(console.log).toHaveBeenCalledWith("hello");
        });

        it("add statements with line numbers to the program", () => {
            const context = run("100 LET A = 1");
            expect(context.lines).toHaveLength(1);
        });

        it("puts line numbers in order", () => {
            const context = run(`
            100 LET A = 1
            50 LET B = 1
            `);
            expect(context.lines).toHaveLength(2);
            expect(context.lines[0].lineNumber).toBe(50);
            expect(context.lines[1].lineNumber).toBe(100);
        });

        it("replaces line numbers", () => {
            const context = run(`
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
        it("evaluates expressions", () => {
            run(`PRINT 1 + 2`);
            expect(console.log).toHaveBeenCalledWith("3");
        });

        it("evaluates identifieres", () => {
            run(`
            LET A$ = "hello"
            PRINT A$ + " world"
            `);
            expect(console.log).toHaveBeenCalledWith("hello world");
        });
    });
});
