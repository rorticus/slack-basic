export enum ObjectType {
    INTEGER_OBJ = "INTEGER",
    BOOLEAN_OBJ = "BOOLEAN",
    NULL_OBJ = "NULL"
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

export class BoolValue implements ValueObject {
    value: boolean = false;

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