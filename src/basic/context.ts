import { Stack } from "./stack";
import {
    CallExpression,
    CompoundStatement,
    DataStatement,
    Expression,
    FloatLiteral,
    ForStatement,
    GosubStatement,
    GotoStatement,
    Identifier,
    IdentifierType,
    IfStatement,
    InfixExpression,
    InputStatement,
    IntegerLiteral,
    LetStatement,
    NextStatement,
    PrefixExpression,
    PrintStatement,
    Statement,
    StatementType,
    StringLiteral,
} from "./ast";
import {
    BuiltInFunctionValue,
    ErrorValue,
    FloatValue,
    IntValue,
    isError,
    NullValue,
    ObjectType,
    StringValue,
    ValueObject,
} from "./object";
import builtins from "./builtins";

export const NULL = new NullValue();

export enum ContextState {
    IDLE = "IDLE",
    RUNNING = "RUNNING",
}

export interface ContextApi {
    print(str: string): Promise<void>;
    input(): Promise<string>;
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
                return (value as StringValue).value !== "";
            }

            return false;
    }
}

export function linkNextStatement(
    statement: Statement,
    nextStatement: Statement | null
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
                    compound.statements[i + 1]
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

export class Context {
    globalStack: Stack;
    lines: Statement[];
    state: ContextState;
    api: ContextApi;
    forStack: ForStatement[];
    dataStack: ValueObject[];

    private nextStatement: Statement | null;
    private returnStack: (Statement | null)[] = [];

    constructor(api: ContextApi) {
        this.globalStack = new Stack();
        this.lines = [];
        this.nextStatement = null;
        this.state = ContextState.IDLE;
        this.api = api;
        this.forStack = [];
        this.dataStack = [];
    }

    clr() {
        this.globalStack.clear();
        this.forStack = [];
        this.returnStack = [];
        this.dataStack = [];
    }

    reset() {
        this.state = ContextState.IDLE;
        this.clr();

        if (this.lines.length > 0) {
            for (let i = 0; i < this.lines.length - 1; i++) {
                linkNextStatement(this.lines[i], this.lines[i + 1]);
            }

            this.lines[this.lines.length - 1].next = null;
        }
    }

    async runImmediateStatement(statement: Statement): Promise<ValueObject> {
        if (this.state === ContextState.RUNNING) {
            return new ErrorValue(`busy`);
        }

        if (statement.lineNumber) {
            // replace this line?
            this.lines = [
                ...this.lines.filter(
                    (l) => (l.lineNumber ?? 0) !== statement.lineNumber
                ),
                statement,
            ].sort((l1, l2) =>
                (l1.lineNumber ?? 0) < (l2.lineNumber ?? 0) ? -1 : 1
            );

            return NULL;
        } else {
            linkNextStatement(statement, null);

            let root: Statement | null = statement;
            let result: ValueObject = NULL;
            while (root) {
                this.nextStatement = root.next;
                result = await this.runStatement(root);
                root = this.nextStatement;
            }

            return result;
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
                return this.goto((statement as GotoStatement).destination);
            case StatementType.IF:
                return this.runIfStatement(statement as IfStatement);
            case StatementType.FOR:
                return this.runForStatement(statement as ForStatement);
            case StatementType.NEXT:
                return this.runNextStatement(statement as NextStatement);
            case StatementType.GOSUB:
                return this.runGosubStatement(statement as GosubStatement);
            case StatementType.RETURN:
                return this.runReturnStatement();
            case StatementType.REM:
                return NULL;
            case StatementType.DATA:
                if (this.state === ContextState.IDLE) {
                    this.preprocessDataStatement(statement as DataStatement);
                }
                return NULL;
            case StatementType.CLR:
                return this.runClrStatement();
        }

        return new ErrorValue(`invalid statement ${statement.type}`);
    }

    private forEachStatement<T extends Statement>(
        type: StatementType,
        callback: (statement: T) => void
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

    async runProgram(): Promise<ValueObject> {
        if (this.lines.length == 0) {
            return new ErrorValue(`cannot run program, no program!`);
        }

        this.reset();
        this.state = ContextState.RUNNING;

        // find all the data statements and preload data
        this.forEachStatement(
            StatementType.DATA,
            (statement: DataStatement) => {
                this.preprocessDataStatement(statement);
            }
        );

        try {
            let statement: Statement | null = this.lines[0];

            while (statement) {
                this.nextStatement = statement.next ?? null;

                const result = await this.runStatement(statement);
                if (result.type() === ObjectType.ERROR_OBJ) {
                    return result;
                }

                statement = this.nextStatement;
            }
        } finally {
            this.state = ContextState.IDLE;
        }

        return NULL;
    }

    private async runPrintStatement(
        statement: PrintStatement
    ): Promise<ValueObject> {
        const values = statement.args.map((a) => this.evalExpression(a));

        for (let i = 0; i < values.length; i++) {
            if (isError(values[i])) {
                return values[i];
            }
        }

        await this.api.print(values.map((v) => v.toString()).join(""));

        return NULL;
    }

    private runLetStatement(statement: LetStatement): ValueObject {
        if (!statement.value) {
            return new ErrorValue(`let value does not exist`);
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
            const identifier = statement.names[i];

            const validObjectTypes = validConversions[identifier.type] ?? [];
            if (validObjectTypes.indexOf(value.type()) < 0) {
                return new ErrorValue(
                    `type mismatch, ${identifier.toString()} (${
                        identifier.type
                    }) = ${value.inspect()}`
                );
            }

            this.globalStack.set(identifier.value, value);
        }

        return value;
    }

    private evalExpression(
        expression: Expression,
        isInCondition = false
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

        return new ErrorValue(`unknown expression ${expression.toString()}`);
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
        isInCondition = false
    ) {
        const infixTypes: {
            [left: string]: {
                [right: string]: (
                    left: ValueObject,
                    operator: string,
                    right: ValueObject,
                    isInCondition: boolean
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
                return new ErrorValue(
                    `type mismatch, ${left.type()} ${
                        expression.operator
                    } ${right.type()}`
                );
            }

            return handler(left, expression.operator, right, isInCondition);
        }

        return new ErrorValue(`operator must have both a left and right side`);
    }

    private evalNumberInfix(
        left: ValueObject,
        operator: string,
        right: ValueObject,
        isInCondition: boolean
    ) {
        const leftValue = (left as IntValue | FloatValue).value;
        const rightValue = (right as IntValue | FloatValue).value;

        switch (operator) {
            case "+":
                return new FloatValue(leftValue + rightValue);
            case "-":
                return new FloatValue(leftValue - rightValue);
            case "*":
                return new FloatValue(leftValue * rightValue);
            case "/":
                return new FloatValue(leftValue / rightValue);
            case "^":
                return new FloatValue(Math.pow(leftValue, rightValue));
            case "=":
                return new FloatValue(leftValue === rightValue ? -1 : 0);
            case "<>":
                return new FloatValue(leftValue !== rightValue ? -1 : 0);
            case "<":
                return new FloatValue(leftValue < rightValue ? -1 : 0);
            case ">":
                return new FloatValue(leftValue > rightValue ? -1 : 0);
            case "<=":
                return new FloatValue(leftValue <= rightValue ? -1 : 0);
            case ">=":
                return new FloatValue(leftValue >= rightValue ? -1 : 0);
            case "AND":
                if (isInCondition) {
                    return new FloatValue(
                        leftValue === -1 && rightValue === -1 ? -1 : 0
                    );
                } else {
                    return new FloatValue(leftValue & rightValue);
                }
            case "OR":
                if (isInCondition) {
                    return new FloatValue(
                        leftValue === -1 || rightValue === -1 ? -1 : 0
                    );
                } else {
                    return new FloatValue(leftValue | rightValue);
                }
        }

        return new ErrorValue(`invalid operator ${operator}`);
    }

    private evalStringInfix(
        left: ValueObject,
        operator: string,
        right: ValueObject
    ) {
        const leftValue = (left as StringValue).value;
        const rightValue = (right as StringValue).value;

        switch (operator) {
            case "+":
                return new StringValue(leftValue + rightValue);
            case "=":
                return new FloatValue(leftValue === rightValue ? 1 : 0);
            case "<>":
                return new FloatValue(leftValue !== rightValue ? 1 : 0);
        }

        return new ErrorValue(`invalid operator ${operator}`);
    }

    private evalPrefixExpression(
        expression: PrefixExpression,
        isInCondition: boolean
    ): ValueObject {
        if (!expression.right) {
            return new ErrorValue(
                `prefix expressions require a right hand side`
            );
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
                    isInCondition
                );
        }

        return new ErrorValue(`invalid prefix type ${value.type()}`);
    }

    private evalNumberPrefix(
        operator: string,
        right: IntValue | FloatValue,
        isInCondition: boolean
    ) {
        switch (operator) {
            case "-":
                return new FloatValue(0 - right.value);
            case "NOT":
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
                    return new StringValue("");
                default:
                    return new FloatValue(0);
            }
        }

        return result;
    }

    private async runInputStatement(
        expr: InputStatement
    ): Promise<ValueObject> {
        try {
            const result = await this.api.input();
            let intermediate: number;

            switch (expr.destination.type) {
                case IdentifierType.STRING:
                    this.globalStack.set(
                        expr.destination.value,
                        new StringValue(result)
                    );
                    break;

                case IdentifierType.INT:
                    intermediate = parseInt(result, 10);
                    if (isNaN(intermediate)) {
                        return new ErrorValue(
                            `invalid integer value: ${result}`
                        );
                    }
                    this.globalStack.set(
                        expr.destination.value,
                        new IntValue(intermediate)
                    );
                    break;
                case IdentifierType.FLOAT:
                    intermediate = parseFloat(result);
                    if (isNaN(intermediate)) {
                        return new ErrorValue(`invalid float value: ${result}`);
                    }
                    this.globalStack.set(
                        expr.destination.value,
                        new FloatValue(intermediate)
                    );
                    break;
            }
        } catch (e) {
            return new ErrorValue(`error with input: ${e.message}`);
        }

        return NULL;
    }

    private goto(lineNumber: number): ValueObject {
        if (this.state !== ContextState.RUNNING) {
            return new ErrorValue(
                `cannot execute goto if program is not running`
            );
        }

        const lineIndex = this.lines.findIndex(
            (l) => l.lineNumber === lineNumber
        );

        if (lineIndex < 0) {
            return new ErrorValue(
                `cannot goto line that does not exist, ${lineNumber}`
            );
        }

        this.nextStatement = this.lines[lineIndex];

        return NULL;
    }

    async runIfStatement(statement: IfStatement): Promise<ValueObject> {
        if (!statement.condition) {
            return new ErrorValue(`cannot run an if with no condition`);
        }

        const condition = this.evalExpression(statement.condition);

        if (isTruthy(condition)) {
            if (statement.goto !== undefined) {
                return this.goto(statement.goto);
            } else if (typeof statement.then === "number") {
                return this.goto(statement.then);
            } else if (statement.then) {
                return this.runStatement(statement.then);
            }
        }

        return NULL;
    }

    async runForStatement(statement: ForStatement): Promise<ValueObject> {
        if (!statement.iterator) {
            return new ErrorValue(`cannot run a for loop with no iterator`);
        }

        if (!statement.from) {
            return new ErrorValue(`cannot run a for statement with no from`);
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
            index: number
        ) => {
            const forStatement = this.forStack[index];

            if (!forStatement) {
                return [true, new ErrorValue(`next without for`)];
            }

            const variableName = forStatement.iterator?.value ?? "";

            const v = this.globalStack.get(variableName);
            if (!v) {
                return [
                    true,
                    new ErrorValue(`invalid variable ${variableName}`),
                ];
            }

            if (
                v.type() !== ObjectType.INTEGER_OBJ &&
                v.type() !== ObjectType.FLOAT_OBJ
            ) {
                return [
                    true,
                    new ErrorValue(`cannot loop on non numeric variable`),
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
                        new ErrorValue(`cannot step on non numeric value`),
                    ];
                }

                step = (stepValue as IntValue | FloatValue).value;
            }

            const iteratorValue = this.evalNumberInfix(
                v,
                "+",
                new FloatValue(step),
                false
            );
            if (isError(iteratorValue)) {
                return [true, iteratorValue];
            }
            this.globalStack.set(variableName, iteratorValue);

            if (!forStatement.to) {
                return [false, new ErrorValue(`invalid to`)];
            }
            const toValue = this.evalExpression(forStatement.to);
            if (isError(toValue)) {
                return [false, toValue];
            }

            if (
                isTruthy(
                    this.evalNumberInfix(
                        iteratorValue,
                        step >= 0 ? "<=" : ">=",
                        toValue,
                        false
                    )
                )
            ) {
                return [true, NULL];
            }

            return [false, NULL];
        };

        const indicies =
            statement.values.length === 0
                ? [this.forStack.length - 1]
                : statement.values.map((v) =>
                      this.forStack.findIndex(
                          (f) => f.iterator?.value === v.value
                      )
                  );

        for (let i = 0; i < indicies.length; i++) {
            const index = indicies[i];
            if (index < 0) {
                return new ErrorValue(`cannot iterate on unknown variable`);
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

    private async runGosubStatement(
        statement: GosubStatement
    ): Promise<ValueObject> {
        this.returnStack.push(statement.next);
        return this.goto(statement.gosubLineNumber);
    }

    private async runReturnStatement(): Promise<ValueObject> {
        if (this.returnStack.length === 0) {
            return new ErrorValue(`cannot return on empty stack`);
        }

        const where = this.returnStack.pop();

        this.nextStatement = where || null;

        return NULL;
    }

    private evalExpressions(expr: Expression[], isInCondition: boolean) {
        let results: ValueObject[] = [];

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
        isInCondition: boolean
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
        } else {
            return new ErrorValue(`cannot call non function ${fn.type()}`);
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
}
