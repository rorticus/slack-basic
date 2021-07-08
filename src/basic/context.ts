import { Stack } from "./stack";
import {
    CompoundStatement,
    Expression,
    FloatLiteral,
    GotoStatement,
    Identifier,
    IdentifierType,
    IfStatement,
    InfixExpression,
    InputStatement,
    IntegerLiteral,
    LetStatement,
    PrefixExpression,
    PrintStatement,
    Statement,
    StatementType,
    StringLiteral,
} from "./ast";
import {
    ErrorValue,
    FloatValue,
    IntValue,
    NullValue,
    ObjectType,
    StringValue,
    ValueObject,
} from "./object";
import { FALSE } from "../monkey/object";

function isError(obj: ValueObject): obj is ErrorValue {
    return obj.type() === ObjectType.ERROR_OBJ;
}

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
                return (value as IntValue).value !== 0;
            } else if (value.type() === ObjectType.FLOAT_OBJ) {
                return (value as FloatValue).value !== 0;
            } else if (value.type() === ObjectType.STRING_OBJ) {
                return (value as StringValue).value !== "";
            }

            return true;
    }
}

export class Context {
    globalStack: Stack;
    lines: Statement[];
    programCounter: number;
    state: ContextState;
    api: ContextApi;

    private nextLine: number;

    constructor(api: ContextApi) {
        this.globalStack = new Stack();
        this.lines = [];
        this.programCounter = 0;
        this.nextLine = 0;
        this.state = ContextState.IDLE;
        this.api = api;
    }

    reset() {
        this.state = ContextState.IDLE;
        this.programCounter = 0;
        this.globalStack.clear();
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
            return this.runStatement(statement);
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
                return this.runCompoundStatement(
                    statement as CompoundStatement
                );
            case StatementType.GOTO:
                return this.goto((statement as GotoStatement).destination);
            case StatementType.IF:
                return this.runIfStatement(statement as IfStatement);
        }

        return new ErrorValue(`invalid statement ${statement.type}`);
    }

    async runProgram(): Promise<ValueObject> {
        if (this.lines.length == 0) {
            return new ErrorValue(`cannot run program, no program!`);
        }

        this.reset();
        this.state = ContextState.RUNNING;

        try {
            while (this.lines[this.programCounter]) {
                this.nextLine = this.programCounter + 1;
                const result = await this.runStatement(
                    this.lines[this.programCounter]
                );
                if (result.type() === ObjectType.ERROR_OBJ) {
                    return result;
                }
                this.programCounter = this.nextLine;
            }
        } finally {
            this.state = ContextState.IDLE;
        }

        return NULL;
    }

    private async runCompoundStatement(
        statement: CompoundStatement
    ): Promise<ValueObject> {
        let result: ValueObject = NULL;

        for (let i = 0; i < statement.statements.length; i++) {
            result = await this.runStatement(statement.statements[i]);
        }

        return result;
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

    private evalExpression(expression: Expression): ValueObject {
        if (expression instanceof StringLiteral) {
            return this.evalStringLiteral(expression);
        } else if (expression instanceof IntegerLiteral) {
            return this.evalIntLiteral(expression);
        } else if (expression instanceof FloatLiteral) {
            return this.evalFloatLiteral(expression);
        } else if (expression instanceof InfixExpression) {
            return this.evalInfixExpression(expression);
        } else if (expression instanceof PrefixExpression) {
            return this.evalPrefixExpression(expression);
        } else if (expression instanceof Identifier) {
            return this.evalIdentifier(expression);
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

    private evalInfixExpression(expression: InfixExpression) {
        const infixTypes: {
            [left: string]: {
                [right: string]: (
                    left: ValueObject,
                    operator: string,
                    right: ValueObject
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
            const left = this.evalExpression(expression.left);
            if (isError(left)) {
                return left;
            }

            const right = this.evalExpression(expression.right);
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

            return handler(left, expression.operator, right);
        }

        return new ErrorValue(`operator must have both a left and right side`);
    }

    private evalNumberInfix(
        left: ValueObject,
        operator: string,
        right: ValueObject
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
            case "=":
                return new FloatValue(leftValue === rightValue ? 1 : 0);
            case "<>":
                return new FloatValue(leftValue !== rightValue ? 1 : 0);
            case "<":
                return new FloatValue(leftValue < rightValue ? 1 : 0);
            case ">":
                return new FloatValue(leftValue > rightValue ? 1 : 0);
            case "<=":
                return new FloatValue(leftValue <= rightValue ? 1 : 0);
            case ">=":
                return new FloatValue(leftValue >= rightValue ? 1 : 0);
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

    private evalPrefixExpression(expression: PrefixExpression): ValueObject {
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
                    value as IntValue | FloatValue
                );
        }

        return new ErrorValue(`invalid prefix type ${value.type()}`);
    }

    private evalNumberPrefix(operator: string, right: IntValue | FloatValue) {
        switch (operator) {
            case "-":
                return new FloatValue(0 - right.value);
        }

        return new ErrorValue(`invalid prefix operator ${operator}`);
    }

    private evalIdentifier(expr: Identifier): ValueObject {
        const result = this.globalStack.get(expr.value);

        if (!result) {
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

        this.nextLine = lineIndex;

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
}
