export enum ObjectType {
    INTEGER_OBJ = "INTEGER",
    FLOAT_OBJ = "FLOAT",
    RETURN_VALUE_OBJ = "RETURN_VALUE",
    ERROR_OBJ = "ERROR",
    STRING_OBJ = "STRING",
    NULL_OBJ = "NULL",
}

export interface ValueObject {
    type(): ObjectType;
    inspect(): string;
}

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
