import {
    ArrayValue,
    BoolValue,
    ErrorValue,
    FALSE,
    HashValue,
    IntValue,
    NULL,
    ObjectType,
    StringValue,
    TRUE,
    ValueObject,
} from "./object";
import Lexer from "./lexer";
import { Parser } from "./parser";
import { languageEval } from "./evaluator";
import { Environment } from "./environment";

describe("evaluator tests", () => {
    function testEval(code: string): ValueObject | null {
        const lexer = new Lexer(code);
        const parser = new Parser(lexer);
        const program = parser.parseProgram();
        const env = new Environment();

        return languageEval(program, env);
    }

    function testIntegerObject(
        obj: ValueObject | null,
        expected: number | null
    ) {
        expect(obj).not.toBeNull();

        if (expected === null) {
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
            ["6 / 2", 3],
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
            ["(1 > 2) == false", true],
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
            ["if(false) { 10; }", null],
            ["if(1) { 10; }", 10],
            ["if(1 < 2) { 10 }", 10],
            ["if(1 > 2) { 10 } else { 20 } ", 20],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testIntegerObject(evaluated, tests[i][1]);
        }
    });

    it("evaluates return statements", () => {
        const tests = [
            ["return 10;", 10],
            ["return 10; 9;", 10],
            ["9; return 10;", 10],
            ["if(10 > 1) { if(10 > 1) { return 10; } return 1;}", 10],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testIntegerObject(evaluated, tests[i][1]);
        }
    });

    it("handles errors", () => {
        const tests = [
            ["5 + true", "type mismatch: INTEGER + BOOLEAN"],
            ["5 + true; 5;", "type mismatch: INTEGER + BOOLEAN"],
            ["-true", "unknown operator: -BOOLEAN"],
            ["true + false", "unknown operator: BOOLEAN + BOOLEAN"],
            [
                "if(10 > 1) { true + false; }",
                "unknown operator: BOOLEAN + BOOLEAN",
            ],
            ["foobar", "identifier not found: foobar"],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);

            expect(evaluated).not.toBeNull();
            expect(evaluated!.type()).toEqual(ObjectType.ERROR_OBJ);
            expect((evaluated as ErrorValue).message).toEqual(tests[i][1]);
        }
    });

    it("evaluates let statements", () => {
        const tests = [
            ["let a = 5; a;", 5],
            ["let a = 5 * 5; a;", 25],
            ["let a = 5; let b = a; b;", 5],
            ["let a = 5; let b = a; let c = a + b + 5; c;", 15],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testIntegerObject(evaluated, tests[i][1]);
        }
    });

    it("evaluates functions", () => {
        const tests = [
            ["let identity = fn(x) { x; }; identity(5);", 5],
            ["let identity = fn(x) { return x; }; identity(5);", 5],
            ["let double = fn(x) { x * 2; }; double(5);", 10],
            ["let add = fn(x, y) { x + y; }; add(5, 5);", 10],
            ["let add = fn(x, y) { x + y; }; add(5 + 5, add(5, 5));", 20],
            ["fn(x) { x; }(5)", 5],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);
            testIntegerObject(evaluated, tests[i][1]);
        }
    });

    it("evaluates strings", () => {
        const evaluated = testEval('"hello world"')!;
        expect(evaluated.type()).toEqual(ObjectType.STRING_OBJ);
        expect(evaluated.inspect()).toEqual(`"hello world"`);
    });

    it("evaluates string concatenation", () => {
        const evaluated = testEval('"hello" + " " + "world"')!;
        expect(evaluated.type()).toEqual(ObjectType.STRING_OBJ);
        expect(evaluated.inspect()).toEqual(`"hello world"`);
    });

    it("evaluates the built in function len", () => {
        const evaluated = testEval('len("hello world")')!;
        testIntegerObject(evaluated, 11);
    });

    it("evaluates array literals", () => {
        const evaluated = testEval("[1, 2, 3]") as ArrayValue;

        expect(evaluated instanceof ArrayValue).toBeTruthy();
        expect(evaluated.inspect()).toEqual("[1, 2, 3]");
    });

    it("evaluates index operators", () => {
        const tests = [
            ["[1, 2 , 3][0]", 1],
            ["[1, 2 , 3][1]", 2],
            ["let i = 0; [1][i]", 1],
            ["[1, 2, 3][3]", null],
            ["[1, 2, 3][-1]", null],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0])!;

            if (tests[i][1] === null) {
                expect(evaluated.type()).toEqual("NULL");
            } else {
                testIntegerObject(evaluated, tests[i][1]);
            }
        }
    });

    it("evaluates hash literals", () => {
        const evaluated = testEval(
            `let two = "two"; { "one": 10 - 9, two: 1 + 1, "thr" + "ee": 6 / 2, 4: 4, true: 5, false: 6 }`
        );

        expect(evaluated!.type()).toEqual(ObjectType.HASH_OBJ);

        const hash = evaluated as HashValue;

        const expected = [
            [new StringValue("one").hashKey(), 1],
            [new StringValue("two").hashKey(), 2],
            [new StringValue("three").hashKey(), 3],
            [new IntValue(4).hashKey(), 4],
            [TRUE.hashKey(), 5],
            [FALSE.hashKey(), 6],
        ] as const;

        expect(hash.pairs.size).toEqual(expected.length);

        for (let i = 0; i < expected.length; i++) {
            testIntegerObject(
                hash.pairs.get(expected[i][0])!.value,
                expected[i][1]
            );
        }
    });

    it("evaluates hash index expressions", () => {
        const tests = [
            [`{"foo": 5}["foo"]`, 5],
            [`{"foo": 5}["bar"]`, null],
        ] as const;

        for (let i = 0; i < tests.length; i++) {
            const evaluated = testEval(tests[i][0]);

            if (tests[i][1] === null) {
                expect(evaluated).toEqual(NULL);
            } else {
                testIntegerObject(evaluated, tests[i][1]);
            }
        }
    });
});
