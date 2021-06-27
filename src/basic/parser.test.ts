import Lexer from "./lexer";
import { Parser } from "./parser";
import {
    Expression,
    FloatLiteral,
    Identifier,
    IntegerLiteral,
    LetStatement,
    StatementType,
    StringLiteral,
} from "./ast";

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

    describe("statements", () => {
        describe("let statements", () => {
            it("parses let statements with a single identifier", () => {
                const { program } = parse("LET A = 3");

                expect(program.statements).toHaveLength(1);
                expect(program.statements[0].type).toEqual(StatementType.LET);

                const letStatement = program.statements[0] as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0], "A");

                testIntegerLiteral(letStatement.value, 3);
            });

            it("parses let statements with multiple identifiers", () => {
                const { program } = parse("LET A, B = 3");

                expect(program.statements).toHaveLength(1);
                expect(program.statements[0].type).toEqual(StatementType.LET);

                const letStatement = program.statements[0] as LetStatement;
                expect(letStatement.names).toHaveLength(2);
                testIdentifier(letStatement.names[0], "A");
                testIdentifier(letStatement.names[1], "B");

                testIntegerLiteral(letStatement.value, 3);
            });
        });

        describe("labels and line numbers", () => {
            it("parses and assigns line numbers", () => {
                const { program } = parse("10 LET A = 3");

                expect(program.statements).toHaveLength(1);
                expect(program.statements[0].type).toEqual(StatementType.LET);

                const letStatement = program.statements[0] as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0], "A");

                testIntegerLiteral(letStatement.value, 3);

                expect(letStatement.label).toBeUndefined();
                expect(letStatement.lineNumber).toEqual(10);
            });

            it("parses and assigns labels", () => {
                const { program } = parse("TEST: LET A = 3");

                expect(program.statements).toHaveLength(1);
                expect(program.statements[0].type).toEqual(StatementType.LET);

                const letStatement = program.statements[0] as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0], "A");

                testIntegerLiteral(letStatement.value, 3);

                expect(letStatement.label).toEqual("TEST");
                expect(letStatement.lineNumber).toEqual(1);
            });
        });
    });
});
