import {BlockStatement, Identifier} from "./ast";
import {Environment} from "./environment";

export type BuiltInFunction = (...args: ValueObject[]) => ValueObject;

export enum ObjectType {
    INTEGER_OBJ = "INTEGER",
    BOOLEAN_OBJ = "BOOLEAN",
    NULL_OBJ = "NULL",
    RETURN_VALUE_OBJ = "RETURN_VALUE",
    ERROR_OBJ = "ERROR",
    FUNCTION_OBJ = "FUNCTION",
    STRING_OBJ = "STRING",
    BUILTIN_OBJ = "BUILTIN"
}

export interface ValueObject {
    type(): ObjectType;
    inspect(): string;
}

export class IntValue implements ValueObject {
    value: number = 0;

    constructor(value: number) {
        this.value = value;
    }

    inspect(): string {
        return `${this.value}`;
    }

    type(): ObjectType {
        return ObjectType.INTEGER_OBJ;
    }
}

export class StringValue implements ValueObject {
    value: string;

    constructor(value: string) {
        this.value = value;
    }

    inspect(): string {
        return `"${this.value}"`;
    }

    type(): ObjectType {
        return ObjectType.STRING_OBJ;
    }
}

export class BoolValue implements ValueObject {
    value: boolean = false;

    constructor(value: boolean) {
        this.value = value;
    }

    inspect(): string {
        return `${this.value}`;
    }

    type(): ObjectType {
        return ObjectType.BOOLEAN_OBJ;
    }
}

export class NullValue implements ValueObject {
    inspect(): string {
        return `NULL`;
    }

    type(): ObjectType {
        return ObjectType.NULL_OBJ;
    }
}

export class ReturnValue implements ValueObject {
    value: ValueObject;

    constructor(value: ValueObject) {
        this.value = value;
    }

    inspect(): string {
        return this.value.inspect();
    }

    type() {
        return ObjectType.RETURN_VALUE_OBJ;
    }
}

export class ErrorValue implements ValueObject {
    message: string;

    constructor(message: string) {
        this.message = message;
    }

    inspect(): string {
        return `ERROR: ${this.message}`;
    }

    type(): ObjectType {
        return ObjectType.ERROR_OBJ;
    }
}

export class FunctionValue implements ValueObject {
    parameters: Identifier[];
    body: BlockStatement;
    env: Environment;

    constructor(parameters: Identifier[], body: BlockStatement, environment: Environment) {
        this.parameters = parameters;
        this.body = body;
        this.env = environment;
    }

    type(): ObjectType {
        return ObjectType.FUNCTION_OBJ;
    }

    inspect(): string {
        return `fn(${this.parameters.map(p => p.value).join(', ')} { ${this.body.toString() }`;
    }
}

export class BuiltInFunctionValue implements ValueObject {
    fn: BuiltInFunction;

    constructor(fn: BuiltInFunction) {
        this.fn = fn;
    }

    type(): ObjectType {
        return ObjectType.BUILTIN_OBJ;
    }

    inspect(): string {
        return "builtin function";
    }
}

export const TRUE = new BoolValue(true);
export const FALSE = new BoolValue(false);
export const NULL = new NullValue();
