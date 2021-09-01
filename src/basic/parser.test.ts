import Lexer from './lexer';
import { Parser } from './parser';
import {
    BoxStatement,
    CallExpression,
    CompoundStatement,
    DataStatement,
    DefStatement,
    DimStatement,
    DrawStatement,
    Expression,
    FloatLiteral,
    ForStatement,
    GosubStatement,
    GotoStatement,
    GraphicsStatement,
    Identifier,
    IfStatement,
    InfixExpression,
    InputStatement,
    IntegerLiteral,
    LetStatement,
    ListStatement,
    LoadStatement,
    NextStatement,
    OnStatement,
    PrefixExpression,
    PrintStatement,
    ReadStatement,
    StatementType,
    StringLiteral,
} from './ast';
import { TokenType } from './tokens';

describe('Parser tests', () => {
    function parse(source: string, checkForErrors = true) {
        const lexer = new Lexer(source);
        const parser = new Parser(lexer);
        const statement = parser.parseStatement();

        if (checkForErrors) {
            expect(parser.errors).toHaveLength(0);
            expect(statement).not.toBeNull();
        }

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
        right: number,
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

    describe('statements', () => {
        describe('let statements', () => {
            it('parses let statements with a single identifier', () => {
                const { statement } = parse('LET A = 3');

                expect(statement.type).toEqual(StatementType.LET);

                const letStatement = statement as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0].name, 'A');
                expect(letStatement.names[0].indices).toHaveLength(0);

                testIntegerLiteral(letStatement.value, 3);
            });

            it('parses let statements with array access', () => {
                const { statement } = parse('LET A(0) = 3');

                expect(statement.type).toEqual(StatementType.LET);

                const letStatement = statement as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0].name, 'A');
                expect(letStatement.names[0].indices).toHaveLength(1);

                testIntegerLiteral(letStatement.value, 3);
            });

            it('parses let statements with multiple identifiers', () => {
                const { statement } = parse('LET A, B = 3');

                expect(statement.type).toEqual(StatementType.LET);

                const letStatement = statement as LetStatement;
                expect(letStatement.names).toHaveLength(2);
                testIdentifier(letStatement.names[0].name, 'A');
                testIdentifier(letStatement.names[1].name, 'B');

                testIntegerLiteral(letStatement.value, 3);
            });

            it('defaults to let statements if no statement type specified', () => {
                const { statement } = parse('A = 3');

                expect(statement.type).toEqual(StatementType.LET);

                const letStatement = statement as LetStatement;
                expect(letStatement.names).toHaveLength(1);
                testIdentifier(letStatement.names[0].name, 'A');

                testIntegerLiteral(letStatement.value, 3);
            });
        });

        describe('labels and line numbers', () => {
            it('parses and assigns line numbers', () => {
                const { statement } = parse('10 LET A = 3');
                expect(statement.lineNumber).toEqual(10);
            });

            it('does not require line numbers', () => {
                const { statement } = parse('LET A = 3');
                expect(statement.lineNumber).toBeUndefined();
            });
        });

        describe('print statements', () => {
            it('parses print statements', () => {
                const { statement } = parse('PRINT "hello"');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;

                expect(printStatement.args).toHaveLength(1);
                testStringLiteral(printStatement.args[0], 'hello');
            });

            it('parses empty print statements', () => {
                const { statement } = parse('PRINT');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;

                expect(printStatement.args).toHaveLength(0);
            });

            it('parses print statements with multiple arguments', () => {
                const { statement } = parse('PRINT "hello" SPACE$ "world"');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;

                expect(printStatement.args).toHaveLength(3);
                testStringLiteral(printStatement.args[0], 'hello');
                testIdentifier(printStatement.args[1], 'SPACE$');
                testStringLiteral(printStatement.args[2], 'world');
            });

            it('parses print statements with multiple arguments separated by commas and semicolons', () => {
                const { statement } = parse('PRINT "hello", SPACE$; "world"');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;

                expect(printStatement.args).toHaveLength(3);
                testStringLiteral(printStatement.args[0], 'hello');
                testIdentifier(printStatement.args[1], 'SPACE$');
                testStringLiteral(printStatement.args[2], 'world');
            });

            it('parses print statements with expressions', () => {
                const { statement } = parse('PRINT "2 + 2 = " 2 + 2');
                expect(statement.type).toEqual(StatementType.PRINT);

                const printStatement = statement as PrintStatement;
                expect(printStatement.args).toHaveLength(2);
                testStringLiteral(printStatement.args[0], '2 + 2 = ');
                testInfix(printStatement.args[1], 2, '+', 2);
            });

            it('stops parsing print statements at colons', () => {
                const { statement } = parse('PRINT "one" : PRINT "two"');
                expect(statement.type).toEqual(StatementType.COMPOUND);

                const compoundStatement = statement as CompoundStatement;
                expect(compoundStatement.statements).toHaveLength(2);

                expect(compoundStatement.statements[0].type).toEqual(
                    StatementType.PRINT,
                );
                expect(compoundStatement.statements[1].type).toEqual(
                    StatementType.PRINT,
                );

                expect(
                    (compoundStatement.statements[0] as PrintStatement).args,
                ).toHaveLength(1);
                expect(
                    (compoundStatement.statements[1] as PrintStatement).args,
                ).toHaveLength(1);

                testStringLiteral(
                    (compoundStatement.statements[0] as PrintStatement).args[0],
                    'one',
                );
                testStringLiteral(
                    (compoundStatement.statements[1] as PrintStatement).args[0],
                    'two',
                );
            });
        });

        describe('input statements', () => {
            it('parses input statements', () => {
                const { statement } = parse('INPUT A$');
                expect(statement.type).toEqual(StatementType.INPUT);
                expect((statement as InputStatement).destination).toHaveLength(
                    1,
                );
                expect(
                    (statement as InputStatement).destination[0].value,
                ).toEqual('A$');
            });

            it('parses input statements with messages', () => {
                const { statement } = parse(`INPUT "test"; A$`);
                expect(statement.type).toEqual(StatementType.INPUT);

                const inputStatement = statement as InputStatement;
                expect(inputStatement.message).not.toBeNull();
                expect(inputStatement.destination).toHaveLength(1);
                expect(inputStatement.destination[0].value).toEqual('A$');
            });

            it('parses input statements with multiple destinations', () => {
                const { statement } = parse(`INPUT A$, B`);
                expect(statement.type).toEqual(StatementType.INPUT);

                const inputStatement = statement as InputStatement;
                expect(inputStatement.destination).toHaveLength(2);
                expect(inputStatement.destination[0].value).toEqual('A$');
                expect(inputStatement.destination[1].value).toEqual('B');
            });

            it('parses input statements with a message and multiple destinations', () => {
                const { statement } = parse(`INPUT "message"; A$, B`);
                expect(statement.type).toEqual(StatementType.INPUT);

                const inputStatement = statement as InputStatement;
                expect(inputStatement.message).not.toBeNull();
                expect(inputStatement.destination).toHaveLength(2);
                expect(inputStatement.destination[0].value).toEqual('A$');
                expect(inputStatement.destination[1].value).toEqual('B');
            });
        });

        describe('goto statements', () => {
            it('parses goto statements', () => {
                const { statement } = parse('GOTO 10');
                expect(statement.type).toEqual(StatementType.GOTO);
                expect((statement as GotoStatement).destination).toEqual(10);
            });

            it('does not allow string destinations', () => {
                const { parser } = parse('GOTO "10"', false);
                expect(parser.errors).toHaveLength(1);
            });

            it('does not allow float destinations', () => {
                const { parser } = parse('GOTO 10.2', false);
                expect(parser.errors).toHaveLength(1);
            });

            it('does not allow variable destinations', () => {
                const { parser } = parse('GOTO C%', false);
                expect(parser.errors).toHaveLength(1);
            });
        });

        describe('if statements', () => {
            it('parses if..goto', () => {
                const { statement } = parse(`IF 1 GOTO 2`);

                const ifStatement = statement as IfStatement;

                expect(statement).not.toBeNull();
                expect(statement.type).toEqual(StatementType.IF);

                testIntegerLiteral(ifStatement.condition, 1);

                expect(ifStatement.goto).toBe(2);
                expect(ifStatement.then).toBeUndefined();
            });

            it('parses if..then number', () => {
                const { statement } = parse(`IF 0 < 1 THEN 2`);

                const ifStatement = statement as IfStatement;

                expect(statement).not.toBeNull();
                expect(statement.type).toEqual(StatementType.IF);

                testInfix(ifStatement.condition, 0, '<', 1);

                expect(ifStatement.goto).toBeUndefined();
                expect(ifStatement.then).toBe(2);
            });

            it('parses if..then condition', () => {
                const { statement } = parse(`IF 1 THEN PRINT "hello"`);

                const ifStatement = statement as IfStatement;

                expect(statement).not.toBeNull();
                expect(statement.type).toEqual(StatementType.IF);

                testIntegerLiteral(ifStatement.condition, 1);

                expect(ifStatement.goto).toBeUndefined();

                expect(ifStatement.then).not.toBeUndefined();
                expect((ifStatement.then as PrintStatement).type).toEqual(
                    StatementType.PRINT,
                );
            });

            it('parses if conditions', () => {
                parse(`IF RND() < .25 THEN PRINT "woo"`);
            });
        });

        describe('for statements', () => {
            it('parses for statements with no steps', () => {
                const { statement } = parse(`FOR I=1 TO 5`);

                expect(statement.type).toEqual(StatementType.FOR);

                const forStatement = statement as ForStatement;

                testIdentifier(forStatement.iterator, 'I');
                testIntegerLiteral(forStatement.from, 1);
                testIntegerLiteral(forStatement.to, 5);

                expect(forStatement.step).toBeNull();
            });

            it('parses for statements with a step', () => {
                const { statement } = parse(`FOR I=1 TO 5 STEP 2`);

                expect(statement.type).toEqual(StatementType.FOR);

                const forStatement = statement as ForStatement;

                testIdentifier(forStatement.iterator, 'I');
                testIntegerLiteral(forStatement.from, 1);
                testIntegerLiteral(forStatement.to, 5);
                testIntegerLiteral(forStatement.step, 2);
            });

            it('parses next statements with no arguments', () => {
                const { statement } = parse(`NEXT`);

                expect(statement.type).toEqual(StatementType.NEXT);

                const nextStatement = statement as NextStatement;

                expect(nextStatement.values).toHaveLength(0);
            });

            it('parses next statements with a single argument', () => {
                const { statement } = parse(`NEXT X`);

                expect(statement.type).toEqual(StatementType.NEXT);

                const nextStatement = statement as NextStatement;

                expect(nextStatement.values).toHaveLength(1);
                testIdentifier(nextStatement.values[0], 'X');
            });

            it('parses next statements with multiple arguments', () => {
                const { statement } = parse(`NEXT X, Y`);

                expect(statement.type).toEqual(StatementType.NEXT);

                const nextStatement = statement as NextStatement;

                expect(nextStatement.values).toHaveLength(2);
                testIdentifier(nextStatement.values[0], 'X');
                testIdentifier(nextStatement.values[1], 'Y');
            });
        });

        describe('rem statements', () => {
            it('parses rem statements', () => {
                const { statement } = parse('REM 1234adsfasdf 987ds"asdff');
                expect(statement.type).toEqual(StatementType.REM);
            });
        });

        describe('gosub statements', () => {
            it('parses return statements', () => {
                const { statement } = parse('RETURN');
                expect(statement.type).toEqual(StatementType.RETURN);
            });

            it('parses gosub statements', () => {
                const { statement } = parse('GOSUB 1000');
                expect(statement.type).toEqual(StatementType.GOSUB);
                expect((statement as GosubStatement).gosubLineNumber).toEqual(
                    1000,
                );
            });
        });

        describe('call statements', () => {
            it('parses call statements', () => {
                const { statement } = parse('A = ABS(1)');
                expect(statement.type).toEqual(StatementType.LET);
                expect(
                    (statement as LetStatement).value instanceof CallExpression,
                ).toBeTruthy();
            });
        });

        describe('data statements', () => {
            it('parses data statements', () => {
                const { statement } = parse('DATA 1, TWO, "THREE", -4');

                expect(statement.type).toEqual(StatementType.DATA);
                const d = statement as DataStatement;
                expect(d.datas).toHaveLength(4);
                testIntegerLiteral(d.datas[0], 1);
                testIdentifier(d.datas[1], 'TWO');
                testStringLiteral(d.datas[2], 'THREE');

                expect(d.datas[3] instanceof PrefixExpression).toBeTruthy();
            });

            it('parses read statements', () => {
                const { statement } = parse('READ A, B$, C(0, 1)');

                expect(statement.type).toEqual(StatementType.READ);
                const d = statement as ReadStatement;
                expect(d.outputs).toHaveLength(3);
                testIdentifier(d.outputs[0].name, 'A');
                testIdentifier(d.outputs[1].name, 'B$');
                testIdentifier(d.outputs[2].name, 'C');
                testIntegerLiteral(d.outputs[2].indices[0], 0);
                testIntegerLiteral(d.outputs[2].indices[1], 1);
            });
        });

        it('parses def statements with arguments', () => {
            const { statement } = parse('DEF FN SQR(X) = 1 * 1');
            expect(statement.type).toEqual(StatementType.DEF);

            const defFn = statement as DefStatement;
            testIdentifier(defFn.name, 'SQR');
            testIdentifier(defFn.argument, 'X');
            testInfix(defFn.body, 1, '*', 1);
        });

        it('parses def statements without arguments', () => {
            const { statement } = parse('DEF FN SQR() = 1 * 1');
            expect(statement.type).toEqual(StatementType.DEF);

            const defFn = statement as DefStatement;
            testIdentifier(defFn.name, 'SQR');
            expect(defFn.argument).toBeNull();
            testInfix(defFn.body, 1, '*', 1);
        });

        it('parses FN calls', () => {
            const { statement } = parse('PRINT FN SQR(1 + 2)');
            expect(statement.type).toEqual(StatementType.PRINT);

            const right = (statement as PrintStatement)
                .args[0] as PrefixExpression;
            expect(right instanceof PrefixExpression).toBeTruthy();

            expect(right.operator).toEqual('FN');
            expect(right.right instanceof CallExpression).toBeTruthy();

            const v = right.right as CallExpression;

            testIdentifier(v.fn, 'SQR');
            expect(v.args).toHaveLength(1);
            testInfix(v.args[0], 1, '+', 2);
        });

        it('parses DIM calls', () => {
            const { statement } = parse('DIM A(1), B(2, 3)');

            expect(statement.type).toEqual(StatementType.DIM);
            const d = statement as DimStatement;

            expect(d.variables).toHaveLength(2);
            testIdentifier(d.variables[0].name, 'A');
            expect(d.variables[0].dimensions).toHaveLength(1);
            testIntegerLiteral(d.variables[0].dimensions[0], 1);

            testIdentifier(d.variables[1].name, 'B');
            expect(d.variables[1].dimensions).toHaveLength(2);
            testIntegerLiteral(d.variables[1].dimensions[0], 2);
            testIntegerLiteral(d.variables[1].dimensions[1], 3);
        });
    });

    describe('list statements', () => {
        it('parses list statements with no parameters', () => {
            const { statement } = parse('LIST');

            expect(statement.type).toEqual(StatementType.LIST);
            const listStatement = statement as ListStatement;

            expect(listStatement.startLine).toBeNull();
            expect(listStatement.endLine).toBeNull();
        });

        it('parses list statements with a range', () => {
            const { statement } = parse('LIST 10-20');

            expect(statement.type).toEqual(StatementType.LIST);
            const listStatement = statement as ListStatement;

            testIntegerLiteral(listStatement.startLine, 10);
            testIntegerLiteral(listStatement.endLine, 20);
        });

        it('parses list statements with a single line', () => {
            const { statement } = parse('LIST 10');

            expect(statement.type).toEqual(StatementType.LIST);
            const listStatement = statement as ListStatement;

            testIntegerLiteral(listStatement.startLine, 10);
            testIntegerLiteral(listStatement.endLine, 10);
        });

        it('parses list statements with a missing end range', () => {
            const { statement } = parse('LIST 10-');

            expect(statement.type).toEqual(StatementType.LIST);
            const listStatement = statement as ListStatement;

            testIntegerLiteral(listStatement.startLine, 10);
            expect(listStatement.endLine).toBeNull();
        });

        it('parses list statements with a missing start range', () => {
            const { statement } = parse('LIST -10');

            expect(statement.type).toEqual(StatementType.LIST);
            const listStatement = statement as ListStatement;

            expect(listStatement.startLine).toBeNull();
            testIntegerLiteral(listStatement.endLine, 10);
        });
    });

    describe('load statements', () => {
        it('parses load statements', () => {
            const { statement } = parse(`LOAD "test"`);

            expect(statement.type).toEqual(StatementType.LOAD);
            const loadStatement = statement as LoadStatement;

            testStringLiteral(loadStatement.filename, 'test');
        });
    });

    describe('on statements', () => {
        it('parses on..goto statements', () => {
            const { statement } = parse('ON 1 GOTO 10');
            expect(statement.type).toEqual(StatementType.ON);
            const onStatement = statement as OnStatement;

            testIntegerLiteral(onStatement.condition, 1);
            expect(onStatement.operation.type).toEqual(TokenType.GOTO);
            expect(onStatement.destinations).toHaveLength(1);
            testIntegerLiteral(onStatement.destinations[0], 10);
        });

        it('parses on..gosub statements', () => {
            const { statement } = parse('ON A GOSUB 10, 20');
            expect(statement.type).toEqual(StatementType.ON);
            const onStatement = statement as OnStatement;

            testIdentifier(onStatement.condition, 'A');
            expect(onStatement.operation.type).toEqual(TokenType.GOSUB);
            expect(onStatement.destinations).toHaveLength(2);
            testIntegerLiteral(onStatement.destinations[0], 10);
            testIntegerLiteral(onStatement.destinations[1], 20);
        });
    });

    describe('graphics statements', () => {
        it('parses graphics statements', () => {
            const { statement } = parse('GRAPHICS 320,200');
            expect(statement.type).toEqual(StatementType.GRAPHICS);
            const gStatement = statement as GraphicsStatement;

            testIntegerLiteral(gStatement.width, 320);
            testIntegerLiteral(gStatement.height, 200);

            expect(statement.toString()).toEqual('GRAPHICS 320, 200');
        });

        it('parses draw statements as single points', () => {
            const { statement } = parse('DRAW 1,2,3');
            expect(statement.type).toEqual(StatementType.DRAW);
            const draw = statement as DrawStatement;

            testIntegerLiteral(draw.color, 1);
            testIntegerLiteral(draw.x1, 2);
            testIntegerLiteral(draw.y1, 3);

            expect(draw.x2).toBeNull();
            expect(draw.y2).toBeNull();

            expect(draw.toString()).toEqual('DRAW 1, 2, 3');
        });

        it('parses draw statements as lines', () => {
            const { statement } = parse('DRAW 1,2,3 TO 4, 5');
            expect(statement.type).toEqual(StatementType.DRAW);
            const draw = statement as DrawStatement;

            testIntegerLiteral(draw.color, 1);
            testIntegerLiteral(draw.x1, 2);
            testIntegerLiteral(draw.y1, 3);
            testIntegerLiteral(draw.x2, 4);
            testIntegerLiteral(draw.y2, 5);

            expect(draw.toString()).toEqual('DRAW 1, 2, 3 TO 4, 5');
        });

        it('parses box statements', () => {
            const { statement } = parse('BOX 0, 1, 2, 3, 4');
            expect(statement.type).toEqual(StatementType.BOX);
            const draw = statement as BoxStatement;

            testIntegerLiteral(draw.color, 0);
            testIntegerLiteral(draw.left, 1);
            testIntegerLiteral(draw.top, 2);
            testIntegerLiteral(draw.width, 3);
            testIntegerLiteral(draw.height, 4);

            expect(draw.toString()).toEqual('BOX 0, 1, 2, 3, 4');
        });
    });

    describe('real tests', () => {
        it('', () => {
            const tests = [
                [
                    'IF R(X,3)=0 THEN R(X,3)=1: RETURN ELSE 500',
                    'IF (R(X, 3) = 0) THEN R(X, 3) = 1 : RETURN ELSE 500',
                ],
                [
                    'IF R(X,3)=0 THEN R(X,3)=1: RETURN ELSE GOSUB 12',
                    'IF (R(X, 3) = 0) THEN R(X, 3) = 1 : RETURN ELSE GOSUB 12',
                ],
                ['IF 0 GOTO 40 ELSE 50', 'IF 0 GOTO 40 ELSE 50'],
                [
                    'IF X=R(P,0) OR X=R(P,1) OR X=R(P,2) THEN IF S THEN 290 ELSE P=X: GOTO 90',
                    'IF (((X = R(P, 0)) OR (X = R(P, 1))) OR (X = R(P, 2))) THEN IF S THEN 290 ELSE P = X : GOTO 90',
                ],
                ['if k <= 2 then 790', 'IF (K <= 2) THEN 790'],
            ] as const;

            for (let i = 0; i < tests.length; i++) {
                const { statement } = parse(tests[i][0]);
                expect(statement.toString()).toEqual(tests[i][1]);
            }
        });
    });
});
