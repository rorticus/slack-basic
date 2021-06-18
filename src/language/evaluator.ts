import {
    BoolValue,
    ErrorValue,
    IntValue,
    NullValue,
    ObjectType,
    ReturnValue,
    ValueObject,
} from "./object";
import {
    BlockStatement,
    BooleanExpression,
    ExpressionStatement,
    Identifier,
    IfExpression,
    InfixExpression,
    IntegerLiteral,
    LetStatement,
    Node,
    PrefixExpression,
    Program,
    ReturnStatement,
} from "./ast";
import { Environment } from "./environment";

const TRUE = new BoolValue(true);
const FALSE = new BoolValue(false);
const NULL = new NullValue();

export function newError(message: string) {
    return new ErrorValue(message);
}

export function isError(error: ValueObject): error is ErrorValue {
    return error.type() === ObjectType.ERROR_OBJ;
}

export function languageEval(
    node: Node | null,
    environment: Environment
): ValueObject {
    if (node instanceof Program) {
        return evalProgram(node, environment);
    } else if (node instanceof ExpressionStatement && node.expression) {
        return languageEval(node.expression, environment);
    } else if (node instanceof IntegerLiteral) {
        return new IntValue(node.value);
    } else if (node instanceof BooleanExpression) {
        return node.value ? TRUE : FALSE;
    } else if (node instanceof PrefixExpression) {
        const right = languageEval(node.right, environment);
        if (isError(right)) {
            return right;
        }
        return evalPrefixExpression(node.operator, right);
    } else if (node instanceof InfixExpression) {
        const left = languageEval(node.left, environment);
        if (isError(left)) {
            return left;
        }
        const right = languageEval(node.right, environment);
        if (isError(right)) {
            return right;
        }

        return evalInfixExpression(node.operator, left, right);
    } else if (node instanceof IfExpression) {
        return evalIfExpression(node, environment);
    } else if (node instanceof ReturnStatement) {
        const value = languageEval(node.returnValue, environment);
        if (isError(value)) {
            return value;
        }
        return new ReturnValue(value);
    } else if (node instanceof BlockStatement) {
        return evalBlockStatement(node, environment);
    } else if (node instanceof LetStatement) {
        const val = languageEval(node.value, environment);
        if (isError(val)) {
            return val;
        }

        environment.set(node.name.value, val);
    } else if (node instanceof Identifier) {
        return evalIdentifier(node, environment);
    }

    return NULL;
}

export function evalBlockStatement(
    statement: BlockStatement,
    environment: Environment
) {
    let result: ValueObject = NULL;

    for (let i = 0; i < statement.statements.length; i++) {
        result = languageEval(statement.statements[i], environment);

        if (
            result.type() === ObjectType.RETURN_VALUE_OBJ ||
            result.type() === ObjectType.ERROR_OBJ
        ) {
            return result;
        }
    }

    return result;
}

export function evalProgram(program: Program, environment: Environment) {
    let result: ValueObject = NULL;

    for (let i = 0; i < program.statements.length; i++) {
        result = languageEval(program.statements[i], environment);

        if (result.type() === ObjectType.RETURN_VALUE_OBJ) {
            return (result as ReturnValue).value;
        } else if (result.type() === ObjectType.ERROR_OBJ) {
            return result;
        }
    }

    return result;
}

export function evalPrefixExpression(
    operator: string,
    right: ValueObject
): ValueObject {
    if (!right) {
        return NULL;
    }

    switch (operator) {
        case "!":
            return evalBangOperatorExpression(right);
        case "-":
            return evalMinusPrefixExpression(right);
    }

    return newError(`unknown operator: ${operator}${right.type()}`);
}

export function evalBangOperatorExpression(value: ValueObject) {
    if (isTruthy(value)) {
        return FALSE;
    } else {
        return TRUE;
    }
}

export function evalMinusPrefixExpression(value: ValueObject) {
    if (value.type() !== ObjectType.INTEGER_OBJ) {
        return newError(`unknown operator: -${value.type()}`);
    }

    return new IntValue(-(value as IntValue).value);
}

export function evalInfixExpression(
    operator: string,
    left: ValueObject,
    right: ValueObject
) {
    if (left.type() !== right.type()) {
        return newError(
            `type mismatch: ${left.type()} ${operator} ${right.type()}`
        );
    }

    if (
        left.type() === ObjectType.INTEGER_OBJ &&
        right.type() === ObjectType.INTEGER_OBJ
    ) {
        return evalIntegerInfixExpression(
            operator,
            left as IntValue,
            right as IntValue
        );
    } else if (
        left.type() === ObjectType.BOOLEAN_OBJ &&
        right.type() === ObjectType.BOOLEAN_OBJ
    ) {
        return evalBooleanInfixExpression(
            operator,
            left as BoolValue,
            right as BoolValue
        );
    }

    return newError(
        `unknown operator: ${left.type()} ${operator} ${right.type()}`
    );
}

export function evalIntegerInfixExpression(
    operator: string,
    left: IntValue,
    right: IntValue
) {
    const lvalue = left.value;
    const rvalue = right.value;

    switch (operator) {
        case "+":
            return new IntValue(lvalue + rvalue);
        case "-":
            return new IntValue(lvalue - rvalue);
        case "*":
            return new IntValue(lvalue * rvalue);
        case "/":
            return new IntValue(Math.floor(lvalue / rvalue));
        case "==":
            return lvalue === rvalue ? TRUE : FALSE;
        case "!=":
            return lvalue !== rvalue ? TRUE : FALSE;
        case "<":
            return lvalue < rvalue ? TRUE : FALSE;
        case ">":
            return lvalue > rvalue ? TRUE : FALSE;
        case "<=":
            return lvalue <= rvalue ? TRUE : FALSE;
        case ">=":
            return lvalue >= rvalue ? TRUE : FALSE;
    }

    return newError(
        `unknown operator: ${left.type()} ${operator} ${right.type()}`
    );
}

export function evalBooleanInfixExpression(
    operator: string,
    left: BoolValue,
    right: BoolValue
) {
    const lvalue = left.value;
    const rvalue = right.value;

    switch (operator) {
        case "==":
            return lvalue === rvalue ? TRUE : FALSE;
        case "!=":
            return lvalue !== rvalue ? TRUE : FALSE;
    }

    return newError(
        `unknown operator: ${left.type()} ${operator} ${right.type()}`
    );
}

export function evalIfExpression(node: IfExpression, environment: Environment) {
    const condition = languageEval(node.condition, environment);
    if (isError(condition)) {
        return condition;
    }

    if (isTruthy(condition)) {
        return languageEval(node.consequence, environment);
    } else {
        if (node.alternative) {
            return languageEval(node.alternative, environment);
        }
    }

    return NULL;
}

export function isTruthy(value: ValueObject) {
    switch (value) {
        case NULL:
            return false;
        case FALSE:
            return false;
        default:
            if (value.type() === ObjectType.INTEGER_OBJ) {
                return (value as IntValue).value !== 0;
            }

            return true;
    }
}

export function evalIdentifier(node: Identifier, environment: Environment) {
    const v = environment.get(node.value);

    if (v === undefined) {
        return newError(`identifier not found: ${node.value}`);
    }

    return v;
}
