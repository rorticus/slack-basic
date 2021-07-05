import {
    ArrayValue,
    BoolValue,
    BuiltInFunctionValue,
    ErrorValue,
    FALSE,
    FunctionValue,
    HashKey,
    HashPair,
    HashValue,
    IntValue,
    isHashable,
    NULL,
    ObjectType,
    ReturnValue,
    StringValue,
    TRUE,
    ValueObject,
} from "./object";
import {
    ArrayLiteral,
    BlockStatement,
    BooleanExpression,
    CallExpression,
    Expression,
    ExpressionStatement,
    FunctionExpression,
    HashLiteral,
    Identifier,
    IfExpression,
    IndexExpression,
    InfixExpression,
    IntegerLiteral,
    LetStatement,
    Node,
    PrefixExpression,
    Program,
    ReturnStatement,
    StringLiteral,
} from "./ast";
import { Environment } from "./environment";
import { builtins } from "./builtins";

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
    } else if (node instanceof FunctionExpression) {
        return new FunctionValue(node.parameters, node.body!, environment);
    } else if (node instanceof CallExpression) {
        const fn = languageEval(node.fn, environment);
        if (isError(fn)) {
            return fn;
        }

        const args = evalExpressions(node.args, environment);
        if (args.length === 1 && isError(args[0])) {
            return args[0];
        }

        return applyFunction(fn, args);
    } else if (node instanceof StringLiteral) {
        return new StringValue(node.value);
    } else if (node instanceof ArrayLiteral) {
        const elements = evalExpressions(node.elements, environment);
        if (
            elements.length === 1 &&
            elements[0].type() === ObjectType.ERROR_OBJ
        ) {
            return elements[0];
        }
        return new ArrayValue(elements);
    } else if (node instanceof IndexExpression) {
        const left = languageEval(node.left, environment);
        if (isError(left)) {
            return left;
        }

        const index = languageEval(node.index, environment);
        if (isError(index)) {
            return index;
        }

        return evalIndexExpression(left, index);
    } else if (node instanceof HashLiteral) {
        return evalHashLiteral(node, environment);
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
    } else if (
        left.type() === ObjectType.STRING_OBJ &&
        right.type() === ObjectType.STRING_OBJ
    ) {
        return evalStringInfixExpression(
            operator,
            left as StringValue,
            right as StringValue
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

export function evalStringInfixExpression(
    operator: string,
    left: StringValue,
    right: StringValue
) {
    if (operator !== "+") {
        return newError(
            `unknown operator: ${left.type()} ${operator} ${right.type()}`
        );
    }

    return new StringValue(left.value + right.value);
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
        if (builtins[node.value]) {
            return builtins[node.value];
        }

        return newError(`identifier not found: ${node.value}`);
    }

    return v;
}

export function evalExpressions(args: Expression[], environment: Environment) {
    const result: ValueObject[] = [];

    for (let i = 0; i < args.length; i++) {
        const evaled = languageEval(args[i], environment);
        if (isError(evaled)) {
            return [evaled];
        }

        result.push(evaled);
    }

    return result;
}

export function applyFunction(fn: ValueObject, args: ValueObject[]) {
    if (fn.type() === ObjectType.FUNCTION_OBJ) {
        const asFn = fn as FunctionValue;

        const extendedEnv = extendFunctionEnv(asFn, args);
        const result = languageEval(asFn.body, extendedEnv);

        return unwrappedReturnValue(result);
    } else if (fn.type() === ObjectType.BUILTIN_OBJ) {
        const asBuiltin = fn as BuiltInFunctionValue;
        return asBuiltin.fn(...args);
    }

    return newError(`not a function: ${fn.type()}`);
}

export function extendFunctionEnv(fn: FunctionValue, args: ValueObject[]) {
    const env = new Environment(fn.env);

    for (let i = 0; i < fn.parameters.length; i++) {
        if (i < args.length) {
            env.set(fn.parameters[i].value, args[i]);
        } else {
            env.set(fn.parameters[i].value, NULL);
        }
    }

    return env;
}

export function unwrappedReturnValue(obj: ValueObject) {
    if (obj.type() === ObjectType.RETURN_VALUE_OBJ) {
        return (obj as ReturnValue).value;
    }

    return obj;
}

export function evalIndexExpression(left: ValueObject, index: ValueObject) {
    if (
        left.type() == ObjectType.ARRAY_OBJ &&
        index.type() === ObjectType.INTEGER_OBJ
    ) {
        return evalArrayIndexExpression(left as ArrayValue, index as IntValue);
    } else if (left.type() === ObjectType.HASH_OBJ) {
        return evalHashIndexExpression(left as HashValue, index);
    } else {
        return newError(`index operator not supported: ${left.type()}`);
    }
}

export function evalArrayIndexExpression(left: ArrayValue, index: IntValue) {
    const i = index.value;

    if (i < 0 || i >= left.elements.length) {
        return NULL;
    }

    return left.elements[i];
}

export function evalHashLiteral(
    node: HashLiteral,
    environment: Environment
): ValueObject {
    const pairs = new Map<HashKey, HashPair>();

    const keys = Array.from(node.pairs.keys());
    for (let i = 0; i < keys.length; i++) {
        const key = languageEval(keys[i], environment);
        if (isError(key)) {
            return key;
        }

        if (!isHashable(key)) {
            return newError(`unable to use ${key.inspect()} as a hash key`);
        }

        const hashKey = key.hashKey();

        const value = languageEval(node.pairs.get(keys[i])!, environment);
        if (isError(value)) {
            return value;
        }

        pairs.set(hashKey, {
            key,
            value,
        });
    }

    return new HashValue(pairs);
}

export function evalHashIndexExpression(left: HashValue, index: ValueObject) {
    if (!isHashable(index)) {
        return newError(`unusable as a key: ${index.type()}`);
    }

    const pair = left.pairs.get(index.hashKey());

    if (!pair) {
        return NULL;
    }

    return pair.value;
}