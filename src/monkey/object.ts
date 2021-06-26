import { BlockStatement, Identifier } from "./ast";
import { Environment } from "./environment";

export type BuiltInFunction = (...args: ValueObject[]) => ValueObject;

export enum ObjectType {
    INTEGER_OBJ = "INTEGER",
    BOOLEAN_OBJ = "BOOLEAN",
    NULL_OBJ = "NULL",
    RETURN_VALUE_OBJ = "RETURN_VALUE",
    ERROR_OBJ = "ERROR",
    FUNCTION_OBJ = "FUNCTION",
    STRING_OBJ = "STRING",
    BUILTIN_OBJ = "BUILTIN",
    ARRAY_OBJ = "ARRAY",
    HASH_OBJ = "HASH",
}

export interface ValueObject {
    type(): ObjectType;
    inspect(): string;
}

export type HashKey = string;

export interface Hashable {
    hashKey(): HashKey;
}

export class IntValue implements ValueObject, Hashable {
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

    hashKey(): HashKey {
        return `${this.type()}:${this.value}`;
    }
}

export class StringValue implements ValueObject, Hashable {
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

    hashKey(): HashKey {
        return `${this.type()}:${this.value}`;
    }
}

export class BoolValue implements ValueObject, Hashable {
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

    hashKey(): HashKey {
        return `${this.type()}:${this.value}`;
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

    constructor(
        parameters: Identifier[],
        body: BlockStatement,
        environment: Environment
    ) {
        this.parameters = parameters;
        this.body = body;
        this.env = environment;
    }

    type(): ObjectType {
        return ObjectType.FUNCTION_OBJ;
    }

    inspect(): string {
        return `fn(${this.parameters
            .map((p) => p.value)
            .join(", ")} { ${this.body.toString()}`;
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

export class ArrayValue implements ValueObject {
    elements: ValueObject[];

    constructor(elements: ValueObject[] = []) {
        this.elements = elements;
    }

    type(): ObjectType {
        return ObjectType.ARRAY_OBJ;
    }

    inspect(): string {
        return `[${this.elements.map((e) => e.inspect()).join(", ")}]`;
    }
}

export interface HashPair {
    key: ValueObject;
    value: ValueObject;
}

export class HashValue implements ValueObject {
    pairs: Map<HashKey, HashPair>;

    constructor(pairs: Map<string, HashPair>) {
        this.pairs = pairs;
    }

    type(): ObjectType {
        return ObjectType.HASH_OBJ;
    }

    inspect(): string {
        return `{ ${Array.from(this.pairs.keys())
            .map(
                (k) =>
                    `${this.pairs.get(k)!.key.inspect()}: ${this.pairs
                        .get(k)!
                        .value.inspect()}`
            )
            .join(", ")} }`;
    }
}

export const TRUE = new BoolValue(true);
export const FALSE = new BoolValue(false);
export const NULL = new NullValue();

export function isHashable(value: any): value is Hashable {
    return typeof value.hashKey === "function";
}
