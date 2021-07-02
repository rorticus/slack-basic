import { Stack } from "./stack";
import {
    Expression,
    FloatLiteral,
    InfixExpression,
    IntegerLiteral,
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

function isError(obj: ValueObject): obj is ErrorValue {
    return obj.type() === ObjectType.ERROR_OBJ;
}

export const NULL = new NullValue();

export class Context {
    globalStack: Stack;
    lines: Statement[];
    programCounter: number;

    constructor() {
        this.globalStack = new Stack();
        this.lines = [];
        this.programCounter = 0;
    }

    reset() {
        this.programCounter = 0;
        this.globalStack.clear();
    }

    runImmediateStatement(statement: Statement) {
        if (statement.lineNumber) {
            this.lines = [...this.lines, statement].sort((l1, l2) =>
                (l1.lineNumber ?? 0) < (l2.lineNumber ?? 0) ? -1 : 1
            );

            return NULL;
        } else {
            return this.runStatement(statement);
        }
    }

    runStatement(statement: Statement) {
        switch (statement.type) {
            case StatementType.PRINT:
                return this.runPrintStatement(statement as PrintStatement);
        }

        return new ErrorValue(`invalid statement ${statement.type}`);
    }

    private runPrintStatement(statement: PrintStatement): ValueObject {
        const values = statement.args.map((a) => this.evalExpression(a));

        for (let i = 0; i < values.length; i++) {
            if (isError(values[i])) {
                return values[i];
            }
        }

        console.log(values.map((v) => v.toString()).join(""));

        return NULL;
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
}
