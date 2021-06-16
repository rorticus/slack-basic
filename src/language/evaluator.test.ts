import { IntValue, ObjectType, ValueObject } from "./object";
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

    function testIntegerObject(obj: ValueObject | null, expected: number) {
        expect(obj).not.toBeNull();
        expect(obj!.type()).toEqual(ObjectType.INTEGER_OBJ);
        expect((obj as IntValue).value).toEqual(expected);
    }

    it("evaluates integers", () => {
        const tests = [
            ["5", 5],
            ["10", 10],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testIntegerObject(evaluated, tests[i][1]);
        }
    });
});
