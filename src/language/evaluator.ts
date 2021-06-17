import {
    BoolValue,
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
    IfExpression,
    InfixExpression,
    IntegerLiteral,
    Node,
    PrefixExpression,
    Program,
    ReturnStatement,
    Statement,
} from "./ast";

const TRUE = new BoolValue(true);
const FALSE = new BoolValue(false);
const NULL = new NullValue();

export function languageEval(node: Node | null): ValueObject {
    if (node instanceof Program) {
        return evalProgram(node);
    } else if (node instanceof ExpressionStatement && node.expression) {
        return languageEval(node.expression);
    } else if (node instanceof IntegerLiteral) {
        return new IntValue(node.value);
    } else if (node instanceof BooleanExpression) {
        return node.value ? TRUE : FALSE;
    } else if (node instanceof PrefixExpression) {
        const right = languageEval(node.right);
        return languageEvalPrefixExpression(node.operator, right);
    } else if (node instanceof InfixExpression) {
        const left = languageEval(node.left);
        const right = languageEval(node.right);

        return evalInfixExpression(node.operator, left, right);
    } else if (node instanceof IfExpression) {
        return evalIfExpression(node);
    } else if (node instanceof ReturnStatement) {
        const value = languageEval(node.returnValue);
        return new ReturnValue(value);
    } else if (node instanceof BlockStatement) {
        return evalBlockStatement(node);
    }

    return NULL;
}

export function evalBlockStatement(statement: BlockStatement) {
    let result: ValueObject = NULL;

    for (let i = 0; i < statement.statements.length; i++) {
        result = languageEval(statement.statements[i]);

        if (result?.type() === ObjectType.RETURN_VALUE_OBJ) {
            return result;
        }
    }

    return result;
}

export function evalProgram(program: Program) {
    let result: ValueObject = NULL;

    for (let i = 0; i < program.statements.length; i++) {
        result = languageEval(program.statements[i]);

        if (result?.type() === ObjectType.RETURN_VALUE_OBJ) {
            return (result as ReturnValue).value;
        }
    }

    return result;
}

export function languageEvalPrefixExpression(
    operator: string,
    right: ValueObject
) {
    if (!right) {
        return NULL;
    }

    switch (operator) {
        case "!":
            return evalBangOperatorExpression(right);
        case "-":
            return evalMinusPrefixExpression(right);
    }

    return NULL;
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
        return NULL;
    }

    return new IntValue(-(value as IntValue).value);
}

export function evalInfixExpression(
    operator: string,
    left: ValueObject,
    right: ValueObject
) {
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

    return NULL;
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

    return NULL;
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

    return NULL;
}

export function evalIfExpression(node: IfExpression) {
    const condition = languageEval(node.condition);

    if (isTruthy(condition)) {
        return languageEval(node.consequence);
    } else {
        if (node.alternative) {
            return languageEval(node.alternative);
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
