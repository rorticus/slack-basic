import { BasicCanvas, Context, ContextApi } from './context';
import Lexer from './lexer';
import { Parser } from './parser';
import { IdentifierType, LetStatement, StatementType } from './ast';
import {
    ArrayValue,
    ErrorValue,
    FloatValue,
    IntValue,
    isError,
    ObjectType,
    StringValue,
    ValueObject,
} from './object';

describe('context tests', () => {
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
                list: jest.fn().mockResolvedValue(undefined),
                createImage(
                    width: number,
                    height: number,
                ): Promise<BasicCanvas> {
                    const data = Array(width * height);
                    for (let i = 0; i < width * height; i++) {
                        data[i] = 0;
                    }

                    return Promise.resolve({
                        width,
                        height,
                        setPixel: (x, y, color) =>
                            (data[Math.floor(y) * width + Math.floor(x)] =
                                color),
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

            result = await context.runImmediateStatement(line);
            if (isError(result)) {
                errors.push(result.message);
            }
        }

        return { context, result, errors };
    }

    describe('immediate tasks', () => {
        it('runs statements without line numbers immediately', async () => {
            const { context } = await run('PRINT "hello"');
            expect(context.api.print).toHaveBeenCalledWith('hello');
        });

        it('add statements with line numbers to the program', async () => {
            const { context } = await run('100 LET A = 1');
            expect(context.lines).toHaveLength(1);
        });

        it('puts line numbers in order', async () => {
            const { context } = await run(`
            100 LET A = 1
            50 LET B = 1
            `);
            expect(context.lines).toHaveLength(2);
            expect(context.lines[0].lineNumber).toBe(50);
            expect(context.lines[1].lineNumber).toBe(100);
        });

        it('replaces line numbers', async () => {
            const { context } = await run(`
            100 LET A = 1
            100 LET B = 1
            `);
            expect(context.lines).toHaveLength(1);
            expect(context.lines[0].lineNumber).toBe(100);
            expect(context.lines[0].type).toEqual(StatementType.LET);
            expect((context.lines[0] as LetStatement).names).toHaveLength(1);
            expect((context.lines[0] as LetStatement).names[0].name.value).toBe(
                'B',
            );
        });
    });

    describe('evaluation', () => {
        it('evaluates expressions', async () => {
            const { context } = await run(`PRINT 1 + 2`);
            expect(context.api.print).toHaveBeenCalledWith(' 3 ');
        });

        it('evaluates identifiers', async () => {
            const { context } = await run(`
            LET A$ = "hello"
            PRINT A$ + " world"
            `);
            expect(context.api.print).toHaveBeenCalledWith('hello world');
        });

        it('evaluates the exponent operator', async () => {
            const { context } = await run(`PRINT 2^3`);
            expect(context.api.print).toHaveBeenCalledWith(' 8 ');
        });
    });

    describe('stored programs', () => {
        it('runs stored programs', async () => {
            const { context } = await run(`
        10 LET A, B = 2
        20 LET C = A + B
        30 PRINT "the answer is " C
        `);

            expect(context.api.print).not.toHaveBeenCalled();

            await context.runProgram();

            expect(context.api.print).toHaveBeenCalledWith('the answer is  4 ');
        });

        it('ends execution on an error', async () => {
            const { context } = await run(`
        10 LET A = "23"
        30 PRINT "should not get here"
        `);

            expect(context.api.print).not.toHaveBeenCalled();
        });
    });

    describe('input', () => {
        it('accepts multiple inputs', async () => {
            const print = jest.fn();

            const input = jest
                .fn()
                .mockResolvedValueOnce('1')
                .mockResolvedValueOnce('2');

            await run(`INPUT A$, B$ : PRINT "results are " A$ " " B$`, {
                input,
                print,
            });

            expect(print).toHaveBeenCalledWith('results are 1 2');
        });

        it('inputs integers', async () => {
            const print = jest.fn();

            const input = jest.fn().mockResolvedValueOnce('1');

            await run(`INPUT A% : PRINT "the result is "; A%`, {
                input,
                print,
            });

            expect(print).toHaveBeenCalledWith('the result is  1 ');
        });
    });

    describe('compound statements', () => {
        it('runs compound statements', async () => {
            const { context } = await run(`PRINT "a" : PRINT "b"`);

            expect(context.api.print).toHaveBeenCalledWith('a');
            expect(context.api.print).toHaveBeenCalledWith('b');
        });
    });

    describe('goto statements', () => {
        it('runs goto statements', async () => {
            const { context } = await run(`
            10 PRINT "a"
            20 GOTO 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith('a');
            expect(context.api.print).not.toHaveBeenCalledWith('b');
            expect(context.api.print).toHaveBeenCalledWith('c');
        });

        it('errors if line does not exist', async () => {
            const { errors } = await run(`
            10 PRINT "a"
            20 GOTO 50
            RUN
            `);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual(
                'cannot goto line that does not exist, 50 - (20 GOTO 50)',
            );
        });
    });

    describe('runs if statements', () => {
        it('runs if..goto statements', async () => {
            const { context, result } = await run(`
            10 PRINT "a"
            20 IF -1 GOTO 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith('a');
            expect(context.api.print).not.toHaveBeenCalledWith('b');
            expect(context.api.print).toHaveBeenCalledWith('c');
        });

        it('runs if..then goto statements', async () => {
            const { context, result } = await run(`
            10 PRINT "a"
            20 IF -1 THEN 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith('a');
            expect(context.api.print).not.toHaveBeenCalledWith('b');
            expect(context.api.print).toHaveBeenCalledWith('c');
        });

        it('runs if..then statements', async () => {
            const { context, result } = await run(`
            10 PRINT "a"
            20 IF -1 THEN PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith('a');
            expect(context.api.print).toHaveBeenCalledWith('b');
            expect(context.api.print).toHaveBeenCalledWith('c');
        });

        it('does not run if..then statements if condition is false', async () => {
            const { context } = await run(`
            10 PRINT "a"
            20 IF 0 GOTO 40
            30 PRINT "b"
            40 PRINT "c"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith('a');
            expect(context.api.print).toHaveBeenCalledWith('b');
            expect(context.api.print).toHaveBeenCalledWith('c');
        });

        it('runs else conditions on falsey conditions', async () => {
            const { context } = await run(`
            10 PRINT "a"
            20 IF 0 GOTO 40 ELSE 50
            30 PRINT "b"
            40 PRINT "c"
            50 PRINT "d"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledTimes(2);
            expect(context.api.print).toHaveBeenCalledWith('a');
            expect(context.api.print).toHaveBeenCalledWith('d');
        });

        it('runs else conditions on falsey then conditions', async () => {
            const { context } = await run(`
            10 A$ = "test"
            20 IF A = "test2" THEN PRINT "one" ELSE PRINT "two"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith('two');
        });

        it('runs the conditions', async () => {
            const { context } = await run(`
            10 A = 0
            20 IF A = 1 THEN PRINT "a is 1"
            30 IF A <> 1 THEN PRINT "a is not 1"
            RUN
            `);

            expect(context.api.print).not.toHaveBeenCalledWith('a is 1');
            expect(context.api.print).toHaveBeenCalledWith('a is not 1');
        });
    });

    describe('for/next statements', () => {
        it('runs for loops on multiple lines', async () => {
            const { context } = await run(`
            10 FOR I = 0 TO 5
            20 PRINT I
            30 NEXT
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith(' 0 ');
            expect(context.api.print).toHaveBeenCalledWith(' 1 ');
            expect(context.api.print).toHaveBeenCalledWith(' 2 ');
            expect(context.api.print).toHaveBeenCalledWith(' 3 ');
            expect(context.api.print).toHaveBeenCalledWith(' 4 ');

            expect(context.forStack).toHaveLength(0);
        });

        it('runs for in a compound statement', async () => {
            const { context } = await run(`FOR I = 0 TO 5 : PRINT I : NEXT`);

            expect(context.api.print).toHaveBeenCalledWith(' 0 ');
            expect(context.api.print).toHaveBeenCalledWith(' 1 ');
            expect(context.api.print).toHaveBeenCalledWith(' 2 ');
            expect(context.api.print).toHaveBeenCalledWith(' 3 ');
            expect(context.api.print).toHaveBeenCalledWith(' 4 ');
            expect(context.api.print).toHaveBeenCalledWith(' 5 ');

            expect(context.forStack).toHaveLength(0);
        });

        it('runs for loops backwards', async () => {
            const { context } = await run(
                `FOR I = 5 TO 0 STEP -1 : PRINT I : NEXT`,
            );

            expect(context.api.print).toHaveBeenCalledWith(' 5 ');
            expect(context.api.print).toHaveBeenCalledWith(' 4 ');
            expect(context.api.print).toHaveBeenCalledWith(' 3 ');
            expect(context.api.print).toHaveBeenCalledWith(' 2 ');
            expect(context.api.print).toHaveBeenCalledWith(' 1 ');
            expect(context.api.print).toHaveBeenCalledWith(' 0 ');

            expect(context.forStack).toHaveLength(0);
        });

        it('runs nested for loops', async () => {
            const { context } = await run(`
            10 FOR X = 0 TO 2
            20    FOR Y = 0 TO 2
            30        PRINT X "," Y
            40    NEXT
            50 NEXT
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith(' 0 , 0 ');
            expect(context.api.print).toHaveBeenCalledWith(' 0 , 1 ');
            expect(context.api.print).toHaveBeenCalledWith(' 1 , 0 ');
            expect(context.api.print).toHaveBeenCalledWith(' 1 , 1 ');

            expect(context.forStack).toHaveLength(0);
        });

        it('runs for loops by name', async () => {
            const { context } = await run(`
            10 FOR X = 0 TO 2
            20    FOR Y = 0 TO 2
            30        PRINT X "," Y
            40 NEXT Y, X
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith(' 0 , 0 ');
            expect(context.api.print).toHaveBeenCalledWith(' 0 , 1 ');
            expect(context.api.print).toHaveBeenCalledWith(' 1 , 0 ');
            expect(context.api.print).toHaveBeenCalledWith(' 1 , 1 ');

            expect(context.forStack).toHaveLength(0);
        });
    });

    describe('boolean conditions', () => {
        it('treats boolean AND operators in conditions as conditions', async () => {
            const { context } = await run(
                `IF 1 = 1 AND 2 = 2 THEN PRINT "true"`,
            );
            expect(context.api.print).toHaveBeenCalledWith('true');
        });

        it('treats boolean OR operators in conditions as conditions', async () => {
            const { context } = await run(
                `IF 1 = 1 OR 2 = 3 THEN PRINT "true"`,
            );
            expect(context.api.print).toHaveBeenCalledWith('true');
        });

        it('treats AND operators in expressions as bitwise', async () => {
            const { context } = await run(
                `IF 1 = 1 AND 2 = 2 THEN PRINT 3 AND 1`,
            );
            expect(context.api.print).toHaveBeenCalledWith(' 1 ');
        });

        it('treats NOT operators in expressions as bitwise', async () => {
            const { context } = await run(`PRINT NOT 1`);
            expect(context.api.print).toHaveBeenCalledWith(`${~1} `);
        });

        it('treats NOT operators in condtionals as boolean operators', async () => {
            const { context } = await run(`IF NOT 1 = 3 THEN PRINT "true"`);
            expect(context.api.print).toHaveBeenCalledWith(`true`);
        });
    });

    describe('gosub statements', () => {
        it('runs gosub statements', async () => {
            const { context } = await run(`
            5 PRINT "starting"
            10 GOSUB 30
            20 PRINT "done"
            30 REM hello func
            40 PRINT "hello"
            50 RETURN
            
            RUN
            `);

            expect(context.api.print).toHaveBeenNthCalledWith(1, 'starting');
            expect(context.api.print).toHaveBeenNthCalledWith(2, 'hello');
            expect(context.api.print).toHaveBeenNthCalledWith(3, 'done');
        });

        it('it errors if you return with no gosub', async () => {
            const { errors } = await run(`
            50 RETURN            
            RUN
            `);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual(
                'cannot return on empty stack - (50 RETURN)',
            );
        });
    });

    describe('clr statements', () => {
        it('clears all variables on clr', async () => {
            const { context } = await run(`
            10 LET A = 1
            20 LET B$ = "hello"
            30 CLR
            40 PRINT A, " and ", B$
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith(' 0  and ');
        });

        it('clears for loops', async () => {
            const { errors } = await run(`FOR I = 0 TO 5 : CLR : NEXT`);
            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual(
                'cannot iterate on unknown variable - (NEXT)',
            );
        });

        it('clears gosubs', async () => {
            const { errors } = await run(`
            10 GOSUB 20
            20 CLR
            30 RETURN
            RUN
            `);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual(
                'cannot return on empty stack - (30 RETURN)',
            );
        });
    });

    describe('built-ins', () => {
        describe('abs', () => {
            it('calls abs', async () => {
                const { result } = await run(`A = ABS(-1)`);
                expect(result?.inspect()).toEqual('1');
            });
        });

        it('calls asc', async () => {
            const { result } = await run(`A = ASC("ABC")`);
            expect(result?.inspect()).toEqual('65');
        });

        it('calls atn', async () => {
            const { result } = await run(`A = ATN(1)`);
            expect(result?.inspect()).toEqual(Math.atan(1).toString());
        });

        it('calls chr$', async () => {
            const { result } = await run(`A$ = CHR$(${'A'.charCodeAt(0)})`);
            expect(result?.inspect()).toEqual('"A"');
        });

        it('trims strings with left$', async () => {
            const { result } = await run(`A$ = LEFT$("hello world", 5)`);
            expect(result?.inspect()).toEqual('"hello"');
        });

        it('cuts strings with mid$', async () => {
            const { context } = await run(`
            10 A$="SATURDAY MORNING"
            20 B$=MID$(A$,6,3): PRINT B$
            30 B$=MID$(A$,1,8): PRINT B$
            40 B$=MID$(A$,10): PRINT B$
            RUN
            `);

            expect(context.api.print).toHaveBeenNthCalledWith(1, 'DAY');
            expect(context.api.print).toHaveBeenNthCalledWith(2, 'SATURDAY');
            expect(context.api.print).toHaveBeenNthCalledWith(3, 'MORNING');
        });

        it('cuts strings with right$', async () => {
            const { context } = await run(`
            10 A$="SATURDAY MORNING"
            20 B$=RIGHT$(A$,7): PRINT B$
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith('MORNING');
        });
    });

    describe('data/read/restore', () => {
        it('runs data statements with negative numbers', async () => {
            const { context } = await run(`
            DATA 1, -2, 2
            READ A, B
            PRINT B
            `);

            expect(context.api.print).toHaveBeenCalledWith('-2 ');
        });

        it('reads from data statements', async () => {
            const { context } = await run(`
            DIM E(5)
            DATA 1, 2.5, 3.14 "three", 5
            READ A%, B, PI%, C$, E(0)
            PRINT A% "-" B "-" C$ "-" PI% "-" E(0)
            `);

            expect(context.api.print).toHaveBeenCalledWith(
                ' 1 - 2.5 -three- 3 - 5 ',
            );
        });

        it('errors if there is no data on the data stack', async () => {
            const { errors } = await run(`
            DATA 1
            READ A%, B
            `);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual('no more data to read - (READ A%, B)');
        });

        it('errors if there is a type mismatch assigning a string to an int', async () => {
            const { errors } = await run(`
            DATA "test"
            READ A%
            `);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual(
                'type mismatch. cannot set STRING to identifier of type INT - (READ A%)',
            );
        });

        it('errors if there is a type mismatch assigning a string to a float', async () => {
            const { errors } = await run(`
            DATA "test"
            READ A
            `);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual(
                'type mismatch. cannot set STRING to identifier of type FLOAT - (READ A)',
            );
        });

        it('errors if there is a type mismatch assigning a int to a string', async () => {
            const { errors } = await run(`
            DATA 1
            READ A$
            `);

            expect(errors).toHaveLength(1);
            expect(errors[0]).toEqual(
                'type mismatch. cannot set INTEGER to identifier of type STRING - (READ A$)',
            );
        });

        it('runs RESTORE statements', async () => {
            const { context } = await run(`
            DATA "1"
            READ A$
            RESTORE
            READ B$
            PRINT A$ " - " B$
            `);

            expect(context.api.print).toHaveBeenCalledWith('1 - 1');
        });
    });

    describe('def/fn statements', () => {
        it('defines functions', async () => {
            const { context } = await run(`
            10 DEF FN FTEST1(X) = X*3
            20 A = 5
            30 PRINT FN FTEST1(A)
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith(' 15 ');
        });

        it('uses a local stack to run functions', async () => {
            const { context } = await run(`
            5  X = 3
            10 DEF FN FTEST1(X) = X*3
            20 A = 5
            30 PRINT FN FTEST1(A) ", " X
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledWith(' 15 ,  3 ');
        });
    });

    describe('dim statements', () => {
        it('initializes float arrays', async () => {
            const { context } = await run(`DIM B(10)`);

            const v = context.globalStack.get('B') as ArrayValue;

            expect(v.type()).toEqual(ObjectType.ARRAY_OBJ);
            expect(v.dimensions).toHaveLength(1);
            expect(v.dimensions[0]).toEqual(11);
            expect(v.data).toHaveLength(11);
            expect(v.identifierType).toEqual(IdentifierType.FLOAT);

            for (let i = 0; i < v.data.length; i++) {
                expect(v.data[i].type()).toEqual(ObjectType.FLOAT_OBJ);
                expect((v.data[i] as FloatValue).value).toEqual(0);
            }
        });

        it('initializes integer arrays', async () => {
            const { context } = await run(`DIM B%(10)`);

            const v = context.globalStack.get('B%') as ArrayValue;

            expect(v.type()).toEqual(ObjectType.ARRAY_OBJ);
            expect(v.dimensions).toHaveLength(1);
            expect(v.dimensions[0]).toEqual(11);
            expect(v.data).toHaveLength(11);
            expect(v.identifierType).toEqual(IdentifierType.INT);

            for (let i = 0; i < v.data.length; i++) {
                expect(v.data[i].type()).toEqual(ObjectType.INTEGER_OBJ);
                expect((v.data[i] as IntValue).value).toEqual(0);
            }
        });

        it('initializes string arrays', async () => {
            const { context } = await run(`DIM B$(10)`);

            const v = context.globalStack.get('B$') as ArrayValue;

            expect(v.type()).toEqual(ObjectType.ARRAY_OBJ);
            expect(v.dimensions).toHaveLength(1);
            expect(v.dimensions[0]).toEqual(11);
            expect(v.data).toHaveLength(11);
            expect(v.identifierType).toEqual(IdentifierType.STRING);

            for (let i = 0; i < v.data.length; i++) {
                expect(v.data[i].type()).toEqual(ObjectType.STRING_OBJ);
                expect((v.data[i] as StringValue).value).toEqual('');
            }
        });

        it('initializes multidimensional arrays', async () => {
            const { context } = await run(`DIM B(5, 5)`);

            const v = context.globalStack.get('B') as ArrayValue;

            expect(v.type()).toEqual(ObjectType.ARRAY_OBJ);
            expect(v.dimensions).toHaveLength(2);
            expect(v.dimensions[0]).toEqual(6);
            expect(v.dimensions[1]).toEqual(6);
            expect(v.data).toHaveLength(36);
        });

        it('accesses array values', async () => {
            const { context } = await run(`
            DIM B(2)
            B(0) = 1 : B(1) = 2 : B(2) = 3 
            PRINT B(0) ", " B(1) ", " B(2)
            `);

            expect(context.api.print).toHaveBeenCalledWith(' 1 ,  2 ,  3 ');
        });
    });

    describe('end statements', () => {
        it('stops multiline program execution', async () => {
            const { context } = await run(`
            10 PRINT 1
            20 END
            30 PRINT 2
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledTimes(1);
            expect(context.api.print).toHaveBeenCalledWith(' 1 ');
        });

        it('stops compound program execution', async () => {
            const { context } = await run(`
            PRINT 1 : END : PRINT 2
            `);

            expect(context.api.print).toHaveBeenCalledTimes(1);
            expect(context.api.print).toHaveBeenCalledWith(' 1 ');
        });

        it('continues execution on CONT', async () => {
            const { context } = await run(`
            10 PRINT "PART 1"
            20 END : PRINT "AFTER 'END'"
            30 PRINT "PART 2"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledTimes(1);
            expect(context.api.print).toHaveBeenCalledWith('PART 1');

            await run('CONT', {}, context);

            expect(context.api.print).toHaveBeenCalledTimes(3);
            expect(context.api.print).toHaveBeenNthCalledWith(2, "AFTER 'END'");
            expect(context.api.print).toHaveBeenNthCalledWith(3, 'PART 2');
        });
    });

    describe('list statements', () => {
        it('runs a list statement', async () => {
            const { context } = await run(`
            10 SPACE = CHR$(32)
            20 PRINT "hello", SPACE, "world"
            30 DEF FN TEST(Y) = Y * Y
            40 LET B = FN TEST(3) + 2
            50 C = B : PRINT C
            60 INPUT "test"; D, E
            70 FOR I = 0 TO 5 STEP 1
            80 NEXT
            90 REM blah blah
            100 DIM AR(16, 16) : AR(12, 2) = 4
            LIST
            `);

            expect(context.api.list).toHaveBeenCalledTimes(1);
            expect(context.api.list).toHaveBeenCalledWith(
                `10 SPACE = CHR$(32)
20 PRINT "hello", SPACE, "world"
30 DEF FN TEST(Y) = Y * Y
40 LET B = FN TEST(3) + 2
50 C = B : PRINT C
60 INPUT "test"; D, E
70 FOR I = 0 TO 5 STEP 1
80 NEXT
90 REM blah blah
100 DIM AR(16, 16) : AR(12, 2) = 4`,
            );
        });

        it('runs a list statement with a range', async () => {
            const { context } = await run(`
            10 SPACE = CHR$(32)
            20 PRINT "hello", SPACE, "world"
            30 DEF FN TEST(Y) = Y * Y
            40 LET B = FN TEST(3) + 2
            50 C = B : PRINT C
            60 INPUT "test"; D, E
            LIST 10-20
            `);

            expect(context.api.list).toHaveBeenCalledWith(
                `10 SPACE = CHR$(32)
20 PRINT "hello", SPACE, "world"`,
            );
        });
    });

    describe('load statements', () => {
        it('calls the load api', async () => {
            const load = jest.fn().mockResolvedValue('10 PRINT "loaded"');

            const { context } = await run(
                `
            10 PRINT "hello"
            LOAD "test"
            LIST
            `,
                { load },
            );

            expect(load).toHaveBeenCalledWith('test');
            expect(context.api.list).toHaveBeenCalledWith(`10 PRINT "loaded"`);
        });
    });

    describe('on statements', () => {
        it('runs on..goto statements', async () => {
            const { context } = await run(`
            10   A = 1
            20   ON A GOTO 1000,2000,3000
            999  END
            1000 PRINT "1. jump"
            1001 A=A+1: GOTO 20
            2000 PRINT "2. jump"
            2001 A=A+1: GOTO 20
            3000 PRINT "3. jump"
            3001 A=A+1: GOTO 20
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledTimes(3);
            expect(context.api.print).toHaveBeenCalledWith('1. jump');
            expect(context.api.print).toHaveBeenCalledWith('2. jump');
            expect(context.api.print).toHaveBeenCalledWith('3. jump');
        });

        it('runs on..gosub statements', async () => {
            const { context } = await run(`
            10   A = 1
            20   ON A GOSUB 1000,2000,3000
            999  END
            1000 PRINT "1. Subroutine"
            1001 A=A+1: RETURN
            2000 PRINT "2. Subroutine"
            2001 A=A+1: RETURN
            3000 PRINT "3. Subroutine"
            3001 A=A+1: RETURN
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledTimes(1);
            expect(context.api.print).toHaveBeenCalledWith('1. Subroutine');
        });
    });

    describe('stop statements', () => {
        it('stops and continues on CONT', async () => {
            const { context } = await run(`
            10 PRINT "1"
            20 STOP
            30 PRINT "2"
            40 PRINT "3"
            RUN
            `);

            expect(context.api.print).toHaveBeenCalledTimes(1);
            expect(context.api.print).toHaveBeenCalledWith('1');

            await run('GOTO 30', undefined, context);

            expect(context.api.print).toHaveBeenCalledTimes(3);
            expect(context.api.print).toHaveBeenCalledWith('2');
            expect(context.api.print).toHaveBeenCalledWith('3');
        });
    });

    describe('time', () => {
        it('reads the system time', async () => {
            const { context } = await run('PRINT TIME');

            expect(context.api.print).toHaveBeenCalled();
            expect(
                (context.api.print as jest.Mock).mock.calls[0][0],
            ).not.toEqual('0');
        });
    });

    describe('graphics', () => {
        it('initializes the graphics canvas', async () => {
            const { context } = await run('GRAPHICS 320, 200');

            expect(context.image).not.toBeNull();
            expect(context.image!.width).toEqual(320);
            expect(context.image!.height).toEqual(200);
        });

        it('draws single pixels', async () => {
            const { context } = await run(`
            GRAPHICS 3, 3
            DRAW RGB(255, 0, 0), 0, 0
            `);

            expect(context.image?.getPixel(0, 0)).toEqual('ff0000FF');
        });

        it('draws lines', async () => {
            const { context } = await run(`
            GRAPHICS 3, 3
            DRAW RGB(255, 0, 0), 0, 0 TO 2, 2
            `);

            expect(context.image?.getPixel(0, 0)).toEqual('ff0000FF');
            expect(context.image?.getPixel(1, 1)).toEqual('ff0000FF');
            expect(context.image?.getPixel(2, 2)).toEqual('ff0000FF');
        });

        it('draws weird lines', async () => {
            const { context } = await run(`
            GRAPHICS 10, 10
            DRAW RGB(0, 0, 1), 0, 0 TO 5, 2
            `);

            expect(context.image?.getPixel(0, 0)).toEqual('000001FF');
            expect(context.image?.getPixel(1, 0)).toEqual('000001FF');
            expect(context.image?.getPixel(2, 0)).toEqual('000001FF');
            expect(context.image?.getPixel(3, 1)).toEqual('000001FF');
            expect(context.image?.getPixel(4, 1)).toEqual('000001FF');
            expect(context.image?.getPixel(5, 2)).toEqual('000001FF');
        });

        it('draws boxes', async () => {
            const { context, errors } = await run(`
            GRAPHICS 10, 10 
            BOX RGB(0, 0, 1), 0, 0, 9,9
            `);

            for (let y = 0; y < 10; y++) {
                for (let x = 0; x < 10; x++) {
                    expect(context.image?.getPixel(x, y)).toEqual('000001FF');
                }
            }
        });
    });
});
