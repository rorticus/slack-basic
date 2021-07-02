import Lexer from "./lexer";
import { Parser } from "./parser";
import {
    CompoundStatement,
    Expression,
    FloatLiteral,
    Identifier,
    InfixExpression,
    IntegerLiteral,
    LetStatement,
    PrintStatement,
    StatementType,
    StringLiteral,
} from "./ast";

describe("Parser tests", () => {
    function parse(source: string) {
        const lexer = new Lexer(source);
        const parser = new Parser(lexer);
        const statement = parser.parseStatement();

        expect(parser.errors).toHaveLength(0);
        expect(statement).not.toBeNull();

        return {
            parser,
            statement: statement!,
        };
    }

    function testIntegerLiteral(expression: Expression | null, value: number) {
        expect(expression).not.toBeNull();

        const integerLiteral = expression as IntegerLiteral;
        expect(integerLiteral.value).toEqual(value);
        expect(integerLiteral.tokenLiteral()).toEqual(`${value}`);
    }

    function testFloatLiteral(expression: Expression | null, value: number) {
        expect(expression).not.toBeNull();

        const integerLiteral = expression as FloatLiteral;
        expect(integerLiteral.value).toEqual(value);
        expect(integerLiteral.tokenLiteral()).toEqual(`${value}`);
    }

    function testStringLiteral(expression: Expression | null, value: string) {
        expect(expression).not.toBeNull();
        expect(expression instanceof StringLiteral).toBeTruthy();

        const stringLiteral = expression as StringLiteral;
        expect(stringLiteral.value).toEqual(value);
        expect(stringLiteral.tokenLiteral()).toEqual(`${value}`);
    }

    function testIdentifier(expression: Expression | null, name: string) {
        expect(expression).not.toBeNull();
        expect(expression! instanceof Identifier).toBeTruthy();

        expect((expression as Identifier).value).toEqual(name);
    }

    function testInfix(
        expression: Expression | null,
        left: number,
        operator: string,
        right: number
    ) {
        expect(expression).not.toBeNull();
        expect(expression instanceof InfixExpression).toBeTruthy();

        const infix = expression as InfixExpression;

        expect(infix.left instanceof IntegerLiteral).toBeTruthy();
        expect(infix.right instanceof IntegerLiteral).toBeTruthy();

        expect((infix.left as IntegerLiteral).value).toEqual(left);
        expect(infix.operator).toEqual(operator);
        expect((infix.right as IntegerLiteral).value).toEqual(right);
    }

    describe("statements", () => {
        describe("let statements", () => {
            it("parses let statements with a single identifier", () => {
                const { statement } = parse("LET A = 3");

                expect(statement.type).toEqual(StatementType.LET);

                const letStatement = statement as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0], "A");

                testIntegerLiteral(letStatement.value, 3);
            });

            it("parses let statements with multiple identifiers", () => {
                const { statement } = parse("LET A, B = 3");

                expect(statement.type).toEqual(StatementType.LET);

                const letStatement = statement as LetStatement;
                expect(letStatement.names).toHaveLength(2);
                testIdentifier(letStatement.names[0], "A");
                testIdentifier(letStatement.names[1], "B");

                testIntegerLiteral(letStatement.value, 3);
            });

            it("defaults to let statements if no statement type specified", () => {
                const { statement } = parse("A = 3");

                expect(statement.type).toEqual(StatementType.LET);

                const letStatement = statement as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0], "A");

                testIntegerLiteral(letStatement.value, 3);
            });
        });

        describe("labels and line numbers", () => {
            it("parses and assigns line numbers", () => {
                const { statement } = parse("10 LET A = 3");
                expect(statement.lineNumber).toEqual(10);
            });

            it("does not require line numbers", () => {
                const { statement } = parse("LET A = 3");
                expect(statement.lineNumber).toBeUndefined();
            });
        });

        describe("print statements", () => {
            it("parses print statements", () => {
                const { statement } = parse('PRINT "hello"');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;

                expect(printStatement.args).toHaveLength(1);
                testStringLiteral(printStatement.args[0], "hello");
            });

            it("parses print statements with multiple arguments", () => {
                const { statement } = parse('PRINT "hello" SPACE$ "world"');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;

                expect(printStatement.args).toHaveLength(3);
                testStringLiteral(printStatement.args[0], "hello");
                testIdentifier(printStatement.args[1], "SPACE$");
                testStringLiteral(printStatement.args[2], "world");
            });

            it("parses print statements with expressions", () => {
                const { statement } = parse('PRINT "2 + 2 = " 2 + 2');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;
                expect(printStatement.args).toHaveLength(2);
                testStringLiteral(printStatement.args[0], "2 + 2 = ");
                testInfix(printStatement.args[1], 2, "+", 2);
            });

            it("stops parsing print statements at colons", () => {
                const { statement } = parse('PRINT "one" : PRINT "two"');
                expect(statement.type).toEqual(StatementType.COMPOUND);

                const compoundStatement = statement as CompoundStatement;
                expect(compoundStatement.statements).toHaveLength(2);

                expect(compoundStatement.statements[0].type).toEqual(
                    StatementType.PRINT
                );
                expect(compoundStatement.statements[1].type).toEqual(
                    StatementType.PRINT
                );

                expect(
                    (compoundStatement.statements[0] as PrintStatement).args
                ).toHaveLength(1);
                expect(
                    (compoundStatement.statements[1] as PrintStatement).args
                ).toHaveLength(1);

                testStringLiteral(
                    (compoundStatement.statements[0] as PrintStatement).args[0],
                    "one"
                );
                testStringLiteral(
                    (compoundStatement.statements[1] as PrintStatement).args[0],
                    "two"
                );
            });
        });
    });
});
