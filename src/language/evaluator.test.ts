import { BoolValue, IntValue, ObjectType, ValueObject } from "./object";
import Lexer from "./lexer";
import { Parser } from "./parser";
import { languageEval } from "./evaluator";

describe("evaluator tests", () => {
    function testEval(code: string): ValueObject | null {
        const lexer = new Lexer(code);
        const parser = new Parser(lexer);
        const program = parser.parseProgram();

        return languageEval(program);
    }

    function testIntegerObject(obj: ValueObject | null, expected: number | null) {
        expect(obj).not.toBeNull();

        if(expected === null) {
            expect(obj!.type()).toEqual("NULL");
            return;
        }

        expect(obj!.type()).toEqual(ObjectType.INTEGER_OBJ);
        expect((obj as IntValue).value).toEqual(expected);
    }

    function testBooleanObject(obj: ValueObject | null, expected: boolean) {
        expect(obj).not.toBeNull();
        expect(obj!.type()).toEqual(ObjectType.BOOLEAN_OBJ);
        expect((obj as BoolValue).value).toEqual(expected);
    }

    it("evaluates integers", () => {
        const tests = [
            ["5", 5],
            ["10", 10],
            ["-3", -3],
            ["5 + 5", 10],
            ["5 - 2", 3],
            ["2 * 3", 6],
            ["6 / 2", 3]
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testIntegerObject(evaluated, tests[i][1]);
        }
    });

    it("evaluates booleans", () => {
        const tests = [
            ["true", true],
            ["false", false],
            ["1 < 2", true],
            ["1 > 2", false],
            ["1 < 1", false],
            ["1 > 1", false],
            ["1 == 1", true],
            ["1 != 1", false],
            ["1 == 2", false],
            ["1 != 2", true],
            ["true == true", true],
            ["false == false", true],
            ["true == false", false],
            ["true != false", true],
            ["false != true", true],
            ["(1 < 2) == true", true],
            ["(1 < 2) == false", false],
            ["(1 > 2) == true", false],
            ["(1 > 2) == false", true]
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testBooleanObject(evaluated, tests[i][1]);
        }
    });

    it("evaluates the bang operator", () => {
        const tests = [
            ["!true", false],
            ["!false", true],
            ["!5", false],
            ["!!true", true],
            ["!!false", false],
            ["!!5", true],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testBooleanObject(evaluated, tests[i][1]);
        }
    });

    it("evaluates if/else expressions", () => {
        const tests = [
            [`if(true) { 10; }`, 10],
            ['if(false) { 10; }', null],
            ['if(1) { 10; }', 10],
            ['if(1 < 2) { 10 }', 10],
            ['if(1 > 2) { 10 } else { 20 } ', 20]
        ] as const;

        for(let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testIntegerObject(evaluated, tests[i][1]);
        }
    });
});
