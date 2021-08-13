import { Stack } from './stack';
import {
    BoxStatement,
    CallExpression,
    CompoundStatement,
    DataStatement,
    DefStatement,
    DimStatement,
    DrawStatement,
    EndStatement,
    Expression,
    FloatLiteral,
    ForStatement,
    GosubStatement,
    GotoStatement,
    GraphicsStatement,
    Identifier,
    IdentifierType,
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
    SaveStatement,
    Statement,
    StatementType,
    StopStatement,
    StringLiteral,
} from './ast';
import {
    ArrayValue,
    BuiltInFunctionValue,
    CalculatedObject,
    ErrorValue,
    FloatValue,
    FunctionValue,
    IntValue,
    isError,
    isNumeric,
    isString,
    NullValue,
    ObjectType,
    StringValue,
    ValueObject,
} from './object';
import builtins from './builtins';
import { TokenType } from './tokens';

export const NULL = new NullValue();

export enum ContextState {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
}

export interface BasicCanvas {
    width: number;
    height: number;

    clear(color: number): void;
    setPixel(x: number, y: number, color: string): void;
    getPixel(x: number, y: number): string;
}

export interface ContextApi {
    print(str: string): Promise<void>;
    input(message?: string): Promise<string>;
    load(filename: string): Promise<Statement[]>;
    save(filename: string, statements: Statement[]): Promise<void>;
    createImage(width: number, height: number): Promise<BasicCanvas>;
}

function newError(
    message: string,
    extra: Statement | Expression | undefined = undefined,
) {
    if (extra) {
        if ((extra as any).statement) {
            return new ErrorValue(
                `${message} - (${(
                    extra as any
                ).statement.toString()} [${extra.toString()}])`,
            );
        } else {
            return new ErrorValue(`${message} - (${extra.toString()})`);
        }
    }

    return new ErrorValue(message);
}

export function isTruthy(value: ValueObject) {
    switch (value) {
        case NULL:
            return false;
        default:
            if (value.type() === ObjectType.INTEGER_OBJ) {
                return (value as IntValue).value === -1;
            } else if (value.type() === ObjectType.FLOAT_OBJ) {
                return (value as FloatValue).value === -1;
            } else if (value.type() === ObjectType.STRING_OBJ) {
                return (value as StringValue).value !== '';
            }

            return false;
    }
}

export function linkNextStatement(
    statement: Statement,
    nextStatement: Statement | null,
) {
    if (statement.type === StatementType.COMPOUND) {
        // compound statements need special linking
        const compound = statement as CompoundStatement;
        if (compound.statements.length > 0) {
            // head
            compound.next = compound.statements[0];

            // middle
            for (let i = 0; i < compound.statements.length - 1; i++) {
                linkNextStatement(
                    compound.statements[i],
                    compound.statements[i + 1],
                );
            }

            // tail
            compound.statements[compound.statements.length - 1].next =
                nextStatement;
        }
    } else {
        statement.next = nextStatement;
    }
}

export interface CancelablePromise {
    promise: Promise<any>;
    cancel: () => void;
}

function wrap(promises: CancelablePromise[], promise) {
    return new Promise((resolve, reject) => {
        promises.push({
            promise,
            cancel: () => {
                reject('cancelled');
            },
        });

        promise
            .then((v) => {
                const index = promises.findIndex((p) => p.promise === promise);
                promises.splice(index, 1);
                resolve(v);
            })
            .catch((e) => {
                const index = promises.findIndex((p) => p.promise === promise);
                promises.splice(index, 1);

                reject(e);
            });
    });
}

export class Context {
    globalStack: Stack;
    lines: Statement[];
    state: ContextState;
    api: ContextApi;
    forStack: ForStatement[];
    dataStack: ValueObject[];
    image: BasicCanvas | null = null;

    onStop?: () => void;

    private openPromises: CancelablePromise[] = [];

    private dataStackIndex = 0;
    private nextStatement: Statement | null;
    private returnStack: (Statement | null)[] = [];
    private continueStatement: Statement | null;

    constructor(api: ContextApi) {
        this.globalStack = new Stack();

        this.lines = [];
        this.nextStatement = null;
        this.state = ContextState.IDLE;
        this.api = api;
        this.forStack = [];
        this.dataStack = [];
        this.continueStatement = null;

        this.initializeGlobals();
    }

    private ownPromise<T>(promise: Promise<T>): Promise<T> {
        return wrap(this.openPromises, promise) as Promise<T>;
    }

    private cancelAllPromises() {
        this.openPromises.forEach((p) => p.cancel());
        this.openPromises = [];
    }

    private initializeGlobals() {
        this.globalStack.set('PI', new FloatValue(Math.PI));

        const getTimestamp = () =>
            new IntValue(Math.round(Date.now() / 0.016666666666667));
        const getTime = () => {
            const d = new Date();
            return new StringValue(
                `${String(d.getHours()).padStart(2, '0')}${String(
                    d.getMinutes(),
                ).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`,
            );
        };

        this.globalStack.set('TIME', new CalculatedObject(getTimestamp));
        this.globalStack.set('TI', new CalculatedObject(getTimestamp));
        this.globalStack.set('TIME$', new CalculatedObject(getTime));
        this.globalStack.set('TI$', new CalculatedObject(getTime));
    }

    clr() {
        this.globalStack.clear();
        this.forStack = [];
        this.returnStack = [];
        this.dataStack = [];
        this.dataStackIndex = 0;
        this.continueStatement = null;
        this.image = null;
    }

    reset() {
        this.state = ContextState.IDLE;
        this.clr();

        if (this.lines.length > 0) {
            for (let i = 0; i < this.lines.length - 1; i++) {
                linkNextStatement(this.lines[i], this.lines[i + 1]);
            }

            linkNextStatement(this.lines[this.lines.length - 1], null);
        }
    }

    async runImmediateStatement(statement: Statement): Promise<ValueObject> {
        if (this.state === ContextState.RUNNING) {
            return newError(`busy`);
        }

        if (statement.lineNumber) {
            // replace this line?
            this.lines = [
                ...this.lines.filter(
                    (l) => (l.lineNumber ?? 0) !== statement.lineNumber,
                ),
                statement,
            ].sort((l1, l2) =>
                (l1.lineNumber ?? 0) < (l2.lineNumber ?? 0) ? -1 : 1,
            );

            this.continueStatement = null;

            return NULL;
        } else {
            linkNextStatement(statement, null);
            return this.runUntilDoneOrStopped(statement);
        }
    }

    async runStatement(statement: Statement): Promise<ValueObject> {
        switch (statement.type) {
            case StatementType.PRINT:
                return this.runPrintStatement(statement as PrintStatement);
            case StatementType.LET:
                return this.runLetStatement(statement as LetStatement);
            case StatementType.RUN:
                return this.runProgram();
            case StatementType.INPUT:
                return this.runInputStatement(statement as InputStatement);
            case StatementType.COMPOUND:
                return NULL;
            case StatementType.GOTO:
                return this.goto(
                    (statement as GotoStatement).destination,
                    statement,
                );
            case StatementType.IF:
                return this.runIfStatement(statement as IfStatement);
            case StatementType.FOR:
                return this.runForStatement(statement as ForStatement);
            case StatementType.NEXT:
                return this.runNextStatement(statement as NextStatement);
            case StatementType.GOSUB:
                return this.runGoSubStatement(statement as GosubStatement);
            case StatementType.RETURN:
                return this.runReturnStatement(statement);
            case StatementType.REM:
                return NULL;
            case StatementType.DATA:
                this.preprocessDataStatement(statement as DataStatement);
                return NULL;
            case StatementType.CLR:
                return this.runClrStatement();
            case StatementType.READ:
                return this.runReadStatement(statement as ReadStatement);
            case StatementType.RESTORE:
                this.dataStackIndex = 0;
                return NULL;
            case StatementType.DEF:
                return this.runDefStatement(statement as DefStatement);
            case StatementType.DIM:
                return this.runDimStatement(statement as DimStatement);
            case StatementType.END:
                return this.runEndStatement(statement as EndStatement);
            case StatementType.CONT:
                return this.runUntilDoneOrStopped(this.continueStatement);
            case StatementType.LIST:
                return this.runListStatement(statement as ListStatement);
            case StatementType.LOAD:
                return this.runLoadStatement(statement as LoadStatement);
            case StatementType.SAVE:
                return this.runSaveStatement(statement as SaveStatement);
            case StatementType.NEW:
                return this.runNewStatement();
            case StatementType.ON:
                return this.runOnStatement(statement as OnStatement);
            case StatementType.STOP:
                return this.runStopStatement(statement as StopStatement);
            case StatementType.GRAPHICS:
                return this.runGraphicsStatement(
                    statement as GraphicsStatement,
                );
            case StatementType.DRAW:
                return this.runDrawStatement(statement as DrawStatement);
            case StatementType.BOX:
                return this.runBoxStatement(statement as BoxStatement);
        }

        return newError(`invalid statement ${statement.type}`, statement);
    }

    private forEachStatement<T extends Statement>(
        type: StatementType,
        callback: (statement: T) => void,
    ) {
        function walk(statement: Statement) {
            if (statement.type === StatementType.COMPOUND) {
                (statement as CompoundStatement).statements.forEach(walk);
            } else {
                if (statement.type === type) {
                    callback(statement as T);
                }
            }
        }

        for (let i = 0; i < this.lines.length; i++) {
            walk(this.lines[i]);
        }
    }

    private prepareRunProgram() {
        if (this.lines.length == 0) {
            return newError(`cannot run program, no program!`);
        }

        this.reset();

        // find all the data statements and preload data
        this.forEachStatement(
            StatementType.DATA,
            (statement: DataStatement) => {
                this.preprocessDataStatement(statement);
            },
        );
    }

    async runUntilDoneOrStopped(root: Statement | null): Promise<ValueObject> {
        let statement: Statement | null = root;

        this.state = ContextState.RUNNING;
        let lastResult: ValueObject = NULL;

        try {
            while (statement && this.state === ContextState.RUNNING) {
                this.nextStatement = statement.next ?? null;

                lastResult = await this.runStatement(statement);

                if (lastResult.type() === ObjectType.ERROR_OBJ) {
                    return lastResult;
                }

                statement = this.nextStatement;
            }
        } catch (e) {
            console.error(e);
        } finally {
            this.state = ContextState.IDLE;
        }

        return lastResult;
    }

    async runProgram(): Promise<ValueObject> {
        const value = this.prepareRunProgram();
        if (value) {
            return value;
        }

        return this.runUntilDoneOrStopped(this.lines[0]);
    }

    private async runPrintStatement(
        statement: PrintStatement,
    ): Promise<ValueObject> {
        const values = statement.args.map((a) => this.evalExpression(a));

        for (let i = 0; i < values.length; i++) {
            if (isError(values[i])) {
                return values[i];
            }
        }

        await this.api.print(values.map((v) => v.toString()).join(''));

        return NULL;
    }

    private runLetStatement(statement: LetStatement): ValueObject {
        if (!statement.value) {
            return newError(`let value does not exist`, statement);
        }

        const value = this.evalExpression(statement.value);
        if (isError(value)) {
            return value;
        }

        const validConversions: { [identifierType: string]: ObjectType[] } = {
            [IdentifierType.INT]: [
                ObjectType.INTEGER_OBJ,
                ObjectType.FLOAT_OBJ,
            ],
            [IdentifierType.FLOAT]: [
                ObjectType.INTEGER_OBJ,
                ObjectType.FLOAT_OBJ,
            ],
            [IdentifierType.STRING]: [ObjectType.STRING_OBJ],
        };

        for (let i = 0; i < statement.names.length; i++) {
            const identifier = statement.names[i].name;
            const indices = statement.names[i].indices;

            const validObjectTypes = validConversions[identifier.type] ?? [];
            if (validObjectTypes.indexOf(value.type()) < 0) {
                return newError(
                    `type mismatch, ${identifier.toString()} (${
                        identifier.type
                    }) = ${value.inspect()}`,
                    statement,
                );
            }

            const result = this.assignVarOrIndexExpression(
                statement,
                identifier,
                indices,
                value,
            );
            if (isError(result)) {
                return result;
            }
        }

        return value;
    }

    private evalExpression(
        expression: Expression,
        isInCondition = false,
    ): ValueObject {
        if (expression instanceof StringLiteral) {
            return this.evalStringLiteral(expression);
        } else if (expression instanceof IntegerLiteral) {
            return this.evalIntLiteral(expression);
        } else if (expression instanceof FloatLiteral) {
            return this.evalFloatLiteral(expression);
        } else if (expression instanceof InfixExpression) {
            return this.evalInfixExpression(expression, isInCondition);
        } else if (expression instanceof PrefixExpression) {
            return this.evalPrefixExpression(expression, isInCondition);
        } else if (expression instanceof Identifier) {
            return this.evalIdentifier(expression);
        } else if (expression instanceof CallExpression) {
            return this.evalCallExpression(expression, isInCondition);
        }

        return newError(`unknown expression`, expression);
    }

    private evalStringLiteral(expr: StringLiteral) {
        return new StringValue(expr.value);
    }

    private evalIntLiteral(expr: IntegerLiteral) {
        return new IntValue(expr.value);
    }

    private evalFloatLiteral(expr: FloatLiteral) {
        return new FloatValue(expr.value);
    }

    private evalInfixExpression(
        expression: InfixExpression,
        isInCondition = false,
    ) {
        const infixTypes: {
            [left: string]: {
                [right: string]: (
                    left: ValueObject,
                    operator: string,
                    right: ValueObject,
                    isInCondition: boolean,
                ) => ValueObject;
            };
        } = {
            [ObjectType.INTEGER_OBJ]: {
                [ObjectType.INTEGER_OBJ]: this.evalNumberInfix,
                [ObjectType.FLOAT_OBJ]: this.evalNumberInfix,
            },
            [ObjectType.FLOAT_OBJ]: {
                [ObjectType.INTEGER_OBJ]: this.evalNumberInfix,
                [ObjectType.FLOAT_OBJ]: this.evalNumberInfix,
            },
            [ObjectType.STRING_OBJ]: {
                [ObjectType.STRING_OBJ]: this.evalStringInfix,
            },
        };

        if (expression.left && expression.right) {
            const left = this.evalExpression(expression.left, isInCondition);
            if (isError(left)) {
                return left;
            }

            const right = this.evalExpression(expression.right, isInCondition);
            if (isError(right)) {
                return right;
            }

            const handler = infixTypes[left.type()]?.[right.type()];

            if (!handler) {
                return newError(
                    `type mismatch, ${left.type()} ${
                        expression.operator
                    } ${right.type()}`,
                    expression,
                );
            }

            return handler(left, expression.operator, right, isInCondition);
        }

        return newError(
            `operator must have both a left and right side`,
            expression,
        );
    }

    private evalNumberInfix(
        left: ValueObject,
        operator: string,
        right: ValueObject,
        isInCondition: boolean,
    ) {
        const leftValue = (left as IntValue | FloatValue).value;
        const rightValue = (right as IntValue | FloatValue).value;

        switch (operator) {
            case '+':
                return new FloatValue(leftValue + rightValue);
            case '-':
                return new FloatValue(leftValue - rightValue);
            case '*':
                return new FloatValue(leftValue * rightValue);
            case '/':
                if (rightValue === 0) {
                    return newError('divide by zero');
                }
                return new FloatValue(leftValue / rightValue);
            case '^':
                return new FloatValue(Math.pow(leftValue, rightValue));
            case '=':
                return new FloatValue(leftValue === rightValue ? -1 : 0);
            case '<>':
                return new FloatValue(leftValue !== rightValue ? -1 : 0);
            case '<':
                return new FloatValue(leftValue < rightValue ? -1 : 0);
            case '>':
                return new FloatValue(leftValue > rightValue ? -1 : 0);
            case '<=':
                return new FloatValue(leftValue <= rightValue ? -1 : 0);
            case '>=':
                return new FloatValue(leftValue >= rightValue ? -1 : 0);
            case 'AND':
                if (isInCondition) {
                    return new FloatValue(
                        isTruthy(left) && isTruthy(right) ? -1 : 0,
                    );
                } else {
                    return new FloatValue(leftValue & rightValue);
                }
            case 'OR':
                if (isInCondition) {
                    return new FloatValue(
                        isTruthy(left) || isTruthy(right) ? -1 : 0,
                    );
                } else {
                    return new FloatValue(leftValue | rightValue);
                }
        }

        return newError(`invalid operator ${operator}`);
    }

    private evalStringInfix(
        left: ValueObject,
        operator: string,
        right: ValueObject,
    ) {
        const leftValue = (left as StringValue).value;
        const rightValue = (right as StringValue).value;

        switch (operator) {
            case '+':
                return new StringValue(leftValue + rightValue);
            case '=':
                return new FloatValue(leftValue === rightValue ? -1 : 0);
            case '<>':
                return new FloatValue(leftValue !== rightValue ? -1 : 0);
        }

        return new ErrorValue(`invalid operator ${operator}`);
    }

    private evalPrefixExpression(
        expression: PrefixExpression,
        isInCondition: boolean,
    ): ValueObject {
        if (!expression.right) {
            return newError(
                `prefix expressions require a right hand side`,
                expression,
            );
        }

        if (expression.operator === 'FN') {
            // special
            if (!(expression.right instanceof CallExpression)) {
                return newError(
                    `cannot call a function on a non call expression`,
                    expression,
                );
            }

            const target = this.evalExpression(
                expression.right.fn,
            ) as FunctionValue;

            if (target.type() !== ObjectType.FUNCTION_OBJ) {
                return newError(
                    `cannot call a function on a non function type ${
                        target ? target.type() : 'NULL'
                    }`,
                    expression,
                );
            }

            const args = this.evalExpressions(expression.right.args, false);
            if (args.length === 1 && isError(args[0])) {
                return args[0];
            }

            if (args.length > 1) {
                return newError(
                    `cannot call a function with more than one argument`,
                    expression,
                );
            }

            if (
                args.length > 0 &&
                args[0].type() !== ObjectType.FLOAT_OBJ &&
                args[0].type() !== ObjectType.INTEGER_OBJ
            ) {
                return newError(
                    `cannot call a function with a nun numeric argument`,
                    expression,
                );
            }

            const fnStack = new Stack(this.globalStack);
            if (target.argument) {
                if (args.length === 0) {
                    return newError(
                        `expected argument for ${target.argument}`,
                        expression,
                    );
                }

                fnStack.set(target.argument.value, args[0]);
            }

            this.globalStack = fnStack;
            const result = this.evalExpression(target.body, false);
            this.globalStack = fnStack.outer;

            return result;
        }

        const value = this.evalExpression(expression.right);
        if (isError(value)) {
            return value;
        }

        switch (value.type()) {
            case ObjectType.INTEGER_OBJ:
            case ObjectType.FLOAT_OBJ:
                return this.evalNumberPrefix(
                    expression.operator,
                    value as IntValue | FloatValue,
                    isInCondition,
                );
        }

        return newError(`invalid prefix type ${value.type()}`, expression);
    }

    private evalNumberPrefix(
        operator: string,
        right: IntValue | FloatValue,
        isInCondition: boolean,
    ) {
        switch (operator) {
            case '-':
                return new FloatValue(0 - right.value);
            case 'NOT':
                if (isInCondition) {
                    if (isTruthy(right)) {
                        return new FloatValue(0);
                    } else {
                        return new FloatValue(-1);
                    }
                } else {
                    return new FloatValue(~right.value);
                }
        }

        return new ErrorValue(`invalid prefix operator ${operator}`);
    }

    private evalIdentifier(expr: Identifier): ValueObject {
        const result = this.globalStack.get(expr.value);

        if (!result) {
            if (builtins[expr.value]) {
                return builtins[expr.value];
            }

            switch (expr.type) {
                case IdentifierType.INT:
                    return new IntValue(0);
                case IdentifierType.STRING:
                    return new StringValue('');
                default:
                    return new FloatValue(0);
            }
        } else if (result.type() === ObjectType.CALCULATED_OBJ) {
            return (result as CalculatedObject).getValue();
        }

        return result;
    }

    private async runInputStatement(
        expr: InputStatement,
    ): Promise<ValueObject> {
        try {
            let message: string | undefined = undefined;

            if (expr.message) {
                const v = this.evalExpression(expr.message);
                if (isError(v)) {
                    return v;
                }

                message = v.toString();
            }

            for (let i = 0; i < expr.destination.length; i++) {
                const result = await this.ownPromise(this.api.input(message));

                let intermediate: number;

                switch (expr.destination[i].type) {
                    case IdentifierType.STRING:
                        this.globalStack.set(
                            expr.destination[i].value,
                            new StringValue(result),
                        );
                        break;

                    case IdentifierType.INT:
                        intermediate = parseInt(result, 10);
                        if (isNaN(intermediate)) {
                            return newError(
                                `invalid integer value: ${result}`,
                                expr,
                            );
                        }
                        this.globalStack.set(
                            expr.destination[i].value,
                            new IntValue(intermediate),
                        );
                        break;
                    case IdentifierType.FLOAT:
                        intermediate = parseFloat(result);
                        if (isNaN(intermediate)) {
                            return newError(
                                `invalid float value: ${result}`,
                                expr,
                            );
                        }
                        this.globalStack.set(
                            expr.destination[i].value,
                            new FloatValue(intermediate),
                        );
                        break;
                }
            }
        } catch (e) {
            return newError(`error with input: ${e.message}`, expr);
        }

        return NULL;
    }

    private goto(lineNumber: number, statement: Statement): ValueObject {
        const lineIndex = this.lines.findIndex(
            (l) => l.lineNumber === lineNumber,
        );

        if (lineIndex < 0) {
            return newError(
                `cannot goto line that does not exist, ${lineNumber}`,
                statement,
            );
        }

        if (this.continueStatement) {
            // we were running but got stopped, resume!
            this.state = ContextState.RUNNING;
        }

        this.nextStatement = this.lines[lineIndex];

        return NULL;
    }

    async runIfStatement(statement: IfStatement): Promise<ValueObject> {
        if (!statement.condition) {
            return newError(`cannot run an if with no condition`, statement);
        }

        const condition = this.evalExpression(statement.condition, true);

        if (isTruthy(condition)) {
            if (statement.goto !== undefined) {
                return this.goto(statement.goto, statement);
            } else if (typeof statement.then === 'number') {
                return this.goto(statement.then, statement);
            } else if (statement.then) {
                linkNextStatement(statement.then, statement.next);
                this.nextStatement = statement.then;
                return NULL;
            }
        } else {
            if (statement.elseGoto) {
                return this.goto(statement.elseGoto, statement);
            } else if (statement.elseThen) {
                linkNextStatement(statement.elseThen, statement.next);
                this.nextStatement = statement.elseThen;
            }
        }

        return NULL;
    }

    async runForStatement(statement: ForStatement): Promise<ValueObject> {
        if (!statement.iterator) {
            return newError(
                `cannot run a for loop with no iterator`,
                statement,
            );
        }

        if (!statement.from) {
            return newError(
                `cannot run a for statement with no from`,
                statement,
            );
        }

        const start = this.evalExpression(statement.from);
        if (isError(start)) {
            return start;
        }

        this.globalStack.set(statement.iterator.value, start);

        this.forStack.push(statement);

        return NULL;
    }

    async runNextStatement(statement: NextStatement): Promise<ValueObject> {
        const runStackIndex: (index: number) => [boolean, ValueObject] = (
            index: number,
        ) => {
            const forStatement = this.forStack[index];

            if (!forStatement) {
                return [true, newError(`next without for`, statement)];
            }

            const variableName = forStatement.iterator?.value ?? '';

            const v = this.globalStack.get(variableName);
            if (!v) {
                return [
                    true,
                    newError(`invalid variable ${variableName}`, statement),
                ];
            }

            if (
                v.type() !== ObjectType.INTEGER_OBJ &&
                v.type() !== ObjectType.FLOAT_OBJ
            ) {
                return [
                    true,
                    newError(`cannot loop on non numeric variable`, statement),
                ];
            }

            let step = 1;

            if (forStatement.step) {
                const stepValue = this.evalExpression(forStatement.step);

                if (isError(stepValue)) {
                    return [true, stepValue];
                }

                if (
                    stepValue.type() !== ObjectType.INTEGER_OBJ &&
                    stepValue.type() !== ObjectType.FLOAT_OBJ
                ) {
                    return [
                        true,
                        newError(`cannot step on non numeric value`, statement),
                    ];
                }

                step = (stepValue as IntValue | FloatValue).value;
            }

            const iteratorValue = this.evalNumberInfix(
                v,
                '+',
                new FloatValue(step),
                false,
            );
            if (isError(iteratorValue)) {
                return [true, iteratorValue];
            }
            this.globalStack.set(variableName, iteratorValue);

            if (!forStatement.to) {
                return [false, newError(`invalid to`, statement)];
            }
            const toValue = this.evalExpression(forStatement.to);
            if (isError(toValue)) {
                return [false, toValue];
            }

            if (
                isTruthy(
                    this.evalNumberInfix(
                        iteratorValue,
                        step >= 0 ? '<=' : '>=',
                        toValue,
                        false,
                    ),
                )
            ) {
                return [true, NULL];
            }

            return [false, NULL];
        };

        const indices =
            statement.values.length === 0
                ? [this.forStack.length - 1]
                : statement.values.map((v) =>
                      this.forStack.findIndex(
                          (f) => f.iterator?.value === v.value,
                      ),
                  );

        for (let i = 0; i < indices.length; i++) {
            const index = indices[i];
            if (index < 0) {
                return newError(
                    `cannot iterate on unknown variable`,
                    statement,
                );
            }

            const result = runStackIndex(index);
            if (isError(result[1])) {
                return result[1];
            }

            if (result[0]) {
                this.nextStatement = this.forStack[index].next;
                return result[1];
            } else {
                const forStatement = this.forStack[index];

                this.forStack = this.forStack.filter((f) => f !== forStatement);
            }
        }

        return NULL;
    }

    private goSub(statement: Statement, lineNumber: number) {
        this.returnStack.push(statement.next);
        return this.goto(lineNumber, statement);
    }

    private async runGoSubStatement(
        statement: GosubStatement,
    ): Promise<ValueObject> {
        return this.goSub(statement, statement.gosubLineNumber);
    }

    private async runReturnStatement(
        statement: Statement,
    ): Promise<ValueObject> {
        if (this.returnStack.length === 0) {
            return newError(`cannot return on empty stack`, statement);
        }

        const where = this.returnStack.pop();

        this.nextStatement = where || null;

        return NULL;
    }

    private evalExpressions(expr: Expression[], isInCondition: boolean) {
        const results: ValueObject[] = [];

        for (let i = 0; i < expr.length; i++) {
            const result = this.evalExpression(expr[i], isInCondition);
            if (isError(result)) {
                return [result];
            }
            results.push(result);
        }

        return results;
    }

    private evalCallExpression(
        expression: CallExpression,
        isInCondition: boolean,
    ) {
        const fn = this.evalExpression(expression.fn);
        if (isError(fn)) {
            return fn;
        }

        const args = this.evalExpressions(expression.args, isInCondition);
        if (args.length === 1 && isError(args[0])) {
            return args[0];
        }

        if (fn.type() === ObjectType.BUILTIN_OBJ) {
            // call it
            return (fn as BuiltInFunctionValue).fn(args);
        } else if (fn.type() === ObjectType.ARRAY_OBJ) {
            for (let i = 0; i < args.length; i++) {
                if (
                    args[i].type() !== ObjectType.INTEGER_OBJ &&
                    args[i].type() !== ObjectType.FLOAT_OBJ
                ) {
                    return newError(
                        `cannot use type ${args[
                            i
                        ].type()} as array access type`,
                        expression,
                    );
                }
            }

            return (fn as ArrayValue).get(
                args.map((a) => (a as IntValue | FloatValue).value),
            );
        } else {
            return newError(
                `cannot call non function ${fn.type()}`,
                expression,
            );
        }
    }

    private async runClrStatement() {
        this.clr();
        return NULL;
    }

    private preprocessDataStatement(statement: DataStatement) {
        for (let i = 0; i < statement.datas.length; i++) {
            const d = this.evalExpression(statement.datas[i], false);

            if (!isError(d)) {
                this.dataStack.push(d);
            }
        }
    }

    private runReadStatement(statement: ReadStatement) {
        for (let i = 0; i < statement.outputs.length; i++) {
            if (this.dataStackIndex >= this.dataStack.length) {
                return newError('no more data to read', statement);
            }

            const output = statement.outputs[i];
            const v = this.dataStack[this.dataStackIndex++];

            if (
                (output.name.type === IdentifierType.INT ||
                    output.name.type === IdentifierType.FLOAT) &&
                (v.type() === ObjectType.FLOAT_OBJ ||
                    v.type() === ObjectType.INTEGER_OBJ)
            ) {
                if (output.name.type === IdentifierType.FLOAT) {
                    this.assignVarOrIndexExpression(
                        statement,
                        output.name,
                        output.indices,
                        new FloatValue((v as FloatValue | IntValue).value),
                    );
                } else if (output.name.type === IdentifierType.INT) {
                    this.assignVarOrIndexExpression(
                        statement,
                        output.name,
                        output.indices,
                        new IntValue((v as FloatValue | IntValue).value),
                    );
                }
            } else if (
                output.name.type === IdentifierType.STRING &&
                v.type() === ObjectType.STRING_OBJ
            ) {
                this.assignVarOrIndexExpression(
                    statement,
                    output.name,
                    output.indices,
                    v,
                );
            } else {
                return newError(
                    `type mismatch. cannot set ${v.type()} to identifier of type ${
                        output.name.type
                    }`,
                    statement,
                );
            }
        }

        return NULL;
    }

    private runDefStatement(statement: DefStatement) {
        this.globalStack.set(
            statement.name.value,
            new FunctionValue(statement.argument, statement.body),
        );

        return NULL;
    }

    private runDimStatement(statement: DimStatement) {
        for (let i = 0; i < statement.variables.length; i++) {
            const v = statement.variables[i];
            const dimensions: number[] = [];

            for (let j = 0; j < v.dimensions.length; j++) {
                const result = this.evalExpression(v.dimensions[j], false);
                if (isError(result)) {
                    return result;
                }

                if (result.type() === ObjectType.INTEGER_OBJ) {
                    dimensions.push((result as IntValue).value + 1);
                } else if (result.type() === ObjectType.FLOAT_OBJ) {
                    dimensions.push(
                        Math.floor((result as FloatValue).value) + 1,
                    );
                } else {
                    return newError(
                        `invalid dimension type, ${result.type()}`,
                        statement,
                    );
                }
            }

            this.globalStack.set(
                v.name.value,
                new ArrayValue(v.name.type, dimensions),
            );
        }

        return NULL;
    }

    runEndStatement(statement: EndStatement) {
        this.continueStatement = statement.next;

        this.state = ContextState.IDLE;
        return NULL;
    }

    async runListStatement(statement: ListStatement) {
        let lineStart = 0;
        let lineEnd = this.lines[this.lines.length - 1]?.lineNumber ?? 0;

        if (statement.startLine !== null) {
            const start = this.evalExpression(statement.startLine);
            if (isError(start)) {
                return start;
            }

            if (start.type() !== ObjectType.INTEGER_OBJ) {
                return newError(
                    `type mismatch, expected int, got ${start.type()}`,
                    statement,
                );
            }

            lineStart = (start as IntValue).value;
        }

        if (statement.endLine !== null) {
            const end = this.evalExpression(statement.endLine);
            if (isError(end)) {
                return end;
            }

            if (end.type() !== ObjectType.INTEGER_OBJ) {
                return newError(
                    `type mismatch, expected int, got ${end.type()}`,
                    statement,
                );
            }

            lineEnd = (end as IntValue).value;
        }

        for (let i = 0; i < this.lines.length; i++) {
            if (
                (this.lines[i].lineNumber ?? 0) >= lineStart &&
                (this.lines[i].lineNumber ?? 0) <= lineEnd
            ) {
                await this.api.print(this.lines[i].toString());
            }
        }

        return NULL;
    }

    async runLoadStatement(statement: LoadStatement) {
        const filename = this.evalExpression(statement.filename);

        if (!isString(filename)) {
            return newError(
                `type mismatch. expecting string, received ${filename.type()}`,
                statement,
            );
        }

        const newStatements = await this.api.load(filename.value);

        this.state = ContextState.IDLE;
        this.clr();

        for (let i = 0; i < newStatements.length; i++) {
            const result = await this.runImmediateStatement(newStatements[i]);
            if (isError(result)) {
                return result;
            }
        }

        return NULL;
    }

    async runSaveStatement(statement: SaveStatement) {
        const filename = this.evalExpression(statement.filename);

        if (!isString(filename)) {
            return newError(
                `type mismatch. expecting string, received ${filename.type()}`,
                statement,
            );
        }

        try {
            await this.api.save(filename.value, this.lines);
            return NULL;
        } catch (e) {
            console.log(e);
            return newError(typeof e === 'string' ? e : e.message, statement);
        }
    }

    runNewStatement() {
        this.lines = [];
        this.clr();

        return NULL;
    }

    runOnStatement(statement: OnStatement) {
        const condition = this.evalExpression(statement.condition);

        if (!isNumeric(condition)) {
            return newError('expected a number type', statement);
        }

        const idx = Math.floor(condition.value) - 1;

        if (idx < 0 || idx >= statement.destinations.length) {
            return newError('undefined statement', statement);
        }

        const lineNumber = this.evalExpression(statement.destinations[idx]);

        if (!isNumeric(lineNumber)) {
            return newError('expected a line number', statement);
        }

        if (statement.operation.type === TokenType.GOTO) {
            return this.goto(lineNumber.value, statement);
        } else if (statement.operation.type === TokenType.GOSUB) {
            return this.goSub(statement, lineNumber.value);
        }

        return NULL;
    }

    runStopStatement(statement: EndStatement) {
        this.continueStatement = statement.next;

        this.stop();

        return NULL;
    }

    stop() {
        this.onStop?.();
        this.cancelAllPromises();
        this.state = ContextState.IDLE;
    }

    async runGraphicsStatement(statement: GraphicsStatement) {
        const width = this.evalExpression(statement.width, false);
        if (isError(width)) {
            return width;
        }

        if (!isNumeric(width)) {
            return newError(`expecting number, got ${width.type()}`, statement);
        }

        const height = this.evalExpression(statement.height, false);
        if (isError(height)) {
            return height;
        }

        if (!isNumeric(height)) {
            return newError(
                `expecting number, got ${height.type()}`,
                statement,
            );
        }

        this.image = await this.api.createImage(
            Math.floor(width.value),
            Math.floor(height.value),
        );

        return NULL;
    }

    runDrawStatement(statement: DrawStatement) {
        if (!this.image) {
            return newError('graphics canvas not initialized', statement);
        }

        const color = this.evalExpression(statement.color);
        const x1 = this.evalExpression(statement.x1);
        const y1 = this.evalExpression(statement.y1);

        if (isError(color)) {
            return color;
        }

        if (isError(x1)) {
            return x1;
        }

        if (isError(y1)) {
            return y1;
        }

        if (!isString(color)) {
            return newError('expecting stringly color', statement);
        }

        if (!isNumeric(x1) || !isNumeric(y1)) {
            return newError('expecting numeric x and y coordinates', statement);
        }

        if (statement.x2 && statement.y2) {
            const x2 = this.evalExpression(statement.x2);
            const y2 = this.evalExpression(statement.y2);

            if (isError(x2)) {
                return x2;
            }

            if (isError(y2)) {
                return y2;
            }

            if (!isNumeric(x2) || !isNumeric(y2)) {
                return newError(
                    'expecting numeric x and y coordinates',
                    statement,
                );
            }

            // draw a line
            const step = x1.value < x2.value ? 1 : -1;
            const dx = x2.value - x1.value;
            const dy = y2.value - y1.value;

            for (
                let x = Math.floor(x1.value);
                x != Math.floor(x2.value);
                x += step
            ) {
                const y = y1.value + (dy * (x - x1.value)) / dx;
                this.image?.setPixel(x, y, color.value);
            }

            this.image?.setPixel(x2.value, y2.value, color.value);
        } else {
            // draw a pixel
            this.image?.setPixel(x1.value, y1.value, color.value);
        }

        return NULL;
    }

    runBoxStatement(statement: BoxStatement) {
        const color = this.evalExpression(statement.color);
        const left = this.evalExpression(statement.left);
        const top = this.evalExpression(statement.top);
        const width = this.evalExpression(statement.width);
        const height = this.evalExpression(statement.height);

        if (isError(color)) {
            return color;
        }

        if (!isString(color)) {
            return newError('expecting stringly color value', statement);
        }

        if (isError(left)) {
            return left;
        }

        if (!isNumeric(left)) {
            return newError('expecting numeric left value', statement);
        }

        if (isError(top)) {
            return top;
        }

        if (!isNumeric(top)) {
            return newError('expecting numeric top value', statement);
        }

        if (isError(width)) {
            return width;
        }

        if (!isNumeric(width)) {
            return newError('expecting numeric width value', statement);
        }

        if (isError(height)) {
            return height;
        }

        if (!isNumeric(height)) {
            return newError('expecting numeric height value', statement);
        }

        if (!this.image) {
            return newError('graphics canvas not initialized', statement);
        }

        for (let x = left.value; x <= left.value + width.value; x++) {
            for (let y = top.value; y <= top.value + height.value; y++) {
                this.image?.setPixel(Math.floor(x), Math.floor(y), color.value);
            }
        }

        return NULL;
    }

    private assignVarOrIndexExpression(
        statement: Statement,
        identifier: Identifier,
        indices: Expression[],
        value: ValueObject,
    ) {
        if (indices.length > 0) {
            const arr = this.globalStack.get(identifier.value);
            if (!arr) {
                // create it!
                return NULL;
            }

            if (arr.type() !== ObjectType.ARRAY_OBJ) {
                return newError(
                    `cannot use array access on a ${arr.type()} (${identifier.toString()})`,
                    statement,
                );
            }

            const indexArgs = this.evalExpressions(indices, false);
            if (indexArgs.length === 1 && isError(indexArgs[0])) {
                return indexArgs[0];
            }

            for (let j = 0; j < indexArgs.length; j++) {
                if (
                    indexArgs[j].type() !== ObjectType.FLOAT_OBJ &&
                    indexArgs[j].type() !== ObjectType.INTEGER_OBJ
                ) {
                    return newError(
                        `cannot use type ${indexArgs[j].type()} as array index`,
                        statement,
                    );
                }
            }

            return (arr as ArrayValue).set(
                indexArgs.map((idx) => (idx as IntValue | FloatValue).value),
                value,
            );
        }

        this.globalStack.set(identifier.value, value);

        return value;
    }
}
