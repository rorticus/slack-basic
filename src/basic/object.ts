import { Expression, Identifier } from "./ast";

export enum ObjectType {
    INTEGER_OBJ = "INTEGER",
    FLOAT_OBJ = "FLOAT",
    RETURN_VALUE_OBJ = "RETURN_VALUE",
    ERROR_OBJ = "ERROR",
    STRING_OBJ = "STRING",
    NULL_OBJ = "NULL",
    BUILTIN_OBJ = "BUILTIN",
    FUNCTION_OBJ = "FUNCTION",
}

export interface ValueObject {
    type(): ObjectType;
    inspect(): string;
}

export type BuiltInFunction = (args: ValueObject[]) => ValueObject;

export class NullValue implements ValueObject {
    inspect(): string {
        return "NULL";
    }

    type(): ObjectType {
        return ObjectType.NULL_OBJ;
    }

    toString() {
        return "NULL";
    }
}

export class IntValue implements ValueObject {
    value: number = 0;

    constructor(value: number) {
        this.value = Math.floor(value);
    }

    inspect(): string {
        return `${this.value}`;
    }

    type(): ObjectType {
        return ObjectType.INTEGER_OBJ;
    }

    toString() {
        return `${this.value}`;
    }
}

export class FloatValue implements ValueObject {
    value: number = 0;

    constructor(value: number) {
        this.value = value;
    }

    inspect(): string {
        return `${this.value}`;
    }

    type(): ObjectType {
        return ObjectType.FLOAT_OBJ;
    }

    toString() {
        return `${this.value}`;
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

    toString() {
        return this.value;
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

    toString() {
        return `ERROR: ${this.message}`;
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

export class FunctionValue implements ValueObject {
    argument: Identifier | null;
    body: Expression;

    constructor(argument: Identifier | null, body: Expression) {
        this.argument = argument;
        this.body = body;
    }

    inspect(): string {
        return `FN(${
            this.argument ? this.argument.toString() : ""
        }) = ${this.body.toString()}`;
    }

    type(): ObjectType {
        return ObjectType.FUNCTION_OBJ;
    }

    toString() {
        return `FN(${
            this.argument ? this.argument.toString() : ""
        }) = ${this.body.toString()}`;
    }
}

export function isError(obj: ValueObject): obj is ErrorValue {
    return obj.type() === ObjectType.ERROR_OBJ;
}
