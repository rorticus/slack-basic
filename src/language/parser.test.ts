import Lexer from "./lexer";
import { Parser } from "./parser";
import {
    BooleanExpression,
    Expression,
    ExpressionStatement,
    Identifier, InfixExpression,
    IntegerLiteral, isBooleanExpression,
    isExpressionStatement,
    isIdentifier, isInfixExpression,
    isIntegerLiteral,
    isLetStatement,
    isPrefixExpression,
    isReturnStatement,
    LetStatement,
    PrefixExpression,
    Program,
    Statement,
} from "./ast";
import { newToken, TokenType } from "./tokens";

describe("Parser tests", () => {
    function parse(source: string) {
        const lexer = new Lexer(source);
        const parser = new Parser(lexer);
        const program = parser.parseProgram();

        expect(parser.errors).toHaveLength(0);

        return {
            parser,
            program,
        };
    }

    function testLet(statement: Statement, name: string) {
        expect(statement.tokenLiteral()).toEqual("let");
        expect(isLetStatement(statement)).toBeTruthy();

        if (isLetStatement(statement)) {
            expect(statement.name.value).toEqual(name);
            expect(statement.name.tokenLiteral()).toEqual(name);
        }
    }

    function testIntegerLiteral(expression: Expression | null, value: number) {
        expect(expression).not.toBeNull();
        expect(isIntegerLiteral(expression!)).toBeTruthy();

        const integerLiteral = expression as IntegerLiteral;
        expect(integerLiteral.value).toEqual(value);
        expect(integerLiteral.tokenLiteral()).toEqual(`${value}`);
    }

    describe("let statements", () => {
        it("parses let statements", () => {
            const { program } = parse(`
        let x = 5;
        let y = 10;
        let foobar = 838383;`);

            expect(program).not.toBeNull();
            expect(program.statements).toHaveLength(3);

            const identifiers = ["x", "y", "foobar"];
            for (let i = 0; i < identifiers.length; i++) {
                testLet(program.statements[i], identifiers[i]);
            }
        });

        it("generates errors", () => {
            const input = `let x 5;`;

            const l = new Lexer(input);
            const p = new Parser(l);

            const program = p.parseProgram();

            expect(p.errors).toHaveLength(1);
        });
    });

    describe("return statements", () => {
        it("parses return statements", () => {
            const { program } = parse(`
            return 5;
            return 10;
            return 993234;
            `);

            expect(program.statements).toHaveLength(3);

            for (let i = 0; i < program.statements.length; i++) {
                const statement = program.statements[i];
                expect(isReturnStatement(statement));
                if (isReturnStatement(statement)) {
                    expect(statement.tokenLiteral()).toEqual("return");
                }
            }
        });
    });

    describe("to string", () => {
        it("constructs source code from an AST", () => {
            let program = new Program();
            program.statements.push(
                new LetStatement(
                    newToken(TokenType.LET, "let"),
                    new Identifier(newToken(TokenType.IDENT, "myVar")),
                    new Identifier(newToken(TokenType.IDENT, "anotherVar"))
                )
            );

            expect(program.toString()).toEqual("let myVar = anotherVar;\n");
        });
    });

    describe("expressions", () => {
        it("parses identifiers", () => {
            const { program } = parse("foobar;");

            expect(program.statements).toHaveLength(1);

            const statement = program.statements[0];
            expect(isExpressionStatement(statement)).toBeTruthy();
            if (isExpressionStatement(statement)) {
                const ident = statement.expression;
                expect(ident).not.toBeNull();
                expect(isIdentifier(ident!)).toBeTruthy();
                if (isIdentifier(ident!)) {
                    expect(ident.value).toEqual("foobar");
                    expect(ident?.tokenLiteral()).toEqual("foobar");
                }
            }
        });

        it("parses integer expressions", () => {
            const { program } = parse("5;");

            expect(program.statements).toHaveLength(1);

            const statement = program.statements[0] as ExpressionStatement;

            expect(isExpressionStatement(statement)).toBeTruthy();

            const ident = statement.expression as Identifier;
            expect(ident).not.toBeNull();
            expect(isIntegerLiteral(ident!)).toBeTruthy();
            expect(ident.value).toEqual(5);
            expect(ident?.tokenLiteral()).toEqual("5");
        });

        it("parses prefix operators", () => {
            const tests = [
                ["!5", "!", 5],
                ["-15", "-", 15],
            ] as const;

            for (let i = 0; i < tests.length; i++) {
                const { program } = parse(tests[i][0]);
                expect(program.statements).toHaveLength(1);

                const statement = program.statements[0] as ExpressionStatement;
                expect(isExpressionStatement(statement)).toBeTruthy();

                const expr = statement.expression as PrefixExpression;
                expect(isPrefixExpression(expr));

                expect(expr.operator).toEqual(tests[i][1]);

                testIntegerLiteral(expr.right, tests[i][2]);
            }
        });

        it("parses infix operators", () => {
            const tests = [
                ["5 + 5;", 5, "+", 5],
                ["5 - 5;", 5, "-", 5],
                ["5 * 5;", 5, "*", 5],
                ["5 / 5;", 5, "/", 5],
                ["5 > 5;", 5, ">", 5],
                ["5 < 5;", 5, "<", 5],
                ["5 == 5;", 5, "==", 5],
                ["5 != 5;", 5, "!=", 5],
            ] as const;

            for (let i = 0; i < tests.length; i++) {
                const { program } = parse(tests[i][0]);

                expect(program.statements).toHaveLength(1);

                const statement = program.statements[0] as ExpressionStatement;
                expect(isExpressionStatement(statement)).toBeTruthy();

                const expr = statement.expression as InfixExpression;
                expect(isInfixExpression(expr)).toBeTruthy();

                testIntegerLiteral(expr.left, tests[i][1]);
                expect(expr.operator).toEqual(tests[i][2]);
                testIntegerLiteral(expr.right, tests[i][3]);
            }
        });

        it("parses booleand", () => {
            const { program } = parse("true;\nfalse;\n");

            expect(program.statements).toHaveLength(2);

            const statement1 = program.statements[0] as ExpressionStatement;
            expect(isExpressionStatement(statement1)).toBeTruthy();

            const bool1 = statement1.expression as BooleanExpression;

            expect(isBooleanExpression(bool1)).toBeTruthy();
            expect(bool1.value).toEqual(true);
            expect(bool1.tokenLiteral()).toEqual("true");

            const statement2 = program.statements[1] as ExpressionStatement;
            expect(isExpressionStatement(statement2)).toBeTruthy();

            const bool2 = statement2.expression as BooleanExpression;

            expect(isBooleanExpression(bool2)).toBeTruthy();
            expect(bool2.value).toEqual(false);
            expect(bool2.tokenLiteral()).toEqual("false");
        });
    });
});
