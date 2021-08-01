import { Expression, Identifier, IdentifierType } from './ast';

export enum ObjectType {
    INTEGER_OBJ = 'INTEGER',
    FLOAT_OBJ = 'FLOAT',
    RETURN_VALUE_OBJ = 'RETURN_VALUE',
    ERROR_OBJ = 'ERROR',
    STRING_OBJ = 'STRING',
    NULL_OBJ = 'NULL',
    BUILTIN_OBJ = 'BUILTIN',
    FUNCTION_OBJ = 'FUNCTION',
    ARRAY_OBJ = 'ARRAY',
    CALCULATED_OBJ = 'CALCULATED',
}

export interface ValueObject {
    type(): ObjectType;
    inspect(): string;
}

export type BuiltInFunction = (args: ValueObject[]) => ValueObject;

export class NullValue implements ValueObject {
    inspect(): string {
        return 'NULL';
    }

    type(): ObjectType {
        return ObjectType.NULL_OBJ;
    }

    toString() {
        return 'NULL';
    }
}

export class IntValue implements ValueObject {
    value = 0;

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
    value = 0;

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
        return 'builtin function';
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
            this.argument ? this.argument.toString() : ''
        }) = ${this.body.toString()}`;
    }

    type(): ObjectType {
        return ObjectType.FUNCTION_OBJ;
    }

    toString() {
        return `FN(${
            this.argument ? this.argument.toString() : ''
        }) = ${this.body.toString()}`;
    }
}

export class ArrayValue implements ValueObject {
    dimensions: number[];
    data: ValueObject[];
    identifierType: IdentifierType;

    constructor(type: IdentifierType, dimensions: number[]) {
        this.identifierType = type;

        const [firstDim, ...restDims] = dimensions;

        const totalSize = restDims.reduce((total, n) => total * n, firstDim);
        this.data = new Array(totalSize);
        this.dimensions = dimensions;

        let t: ValueObject;
        if (type === IdentifierType.INT) {
            t = new IntValue(0);
        } else if (type === IdentifierType.FLOAT) {
            t = new FloatValue(0);
        } else if (type === IdentifierType.STRING) {
            t = new StringValue('');
        } else {
            t = new IntValue(0);
        }

        for (let i = 0; i < totalSize; i++) {
            this.data[i] = t;
        }
    }

    private calculateIndex(indices: number[]) {
        if (indices.length !== this.dimensions.length) {
            return new ErrorValue(`not enough indices`);
        }

        let dataIndex = 0;
        for (let i = 0; i < indices.length - 1; i++) {
            if (indices[i] < 0 || indices[i] >= this.dimensions[i]) {
                return new ErrorValue(
                    `array index out of bounds, ${indices[i]}`,
                );
            }

            let product = indices[i];
            for (let j = i; j < this.dimensions.length; j++) {
                product *= this.dimensions[j];
            }

            dataIndex += product;
        }

        dataIndex += indices[indices.length - 1];

        return dataIndex;
    }

    get(indices: number[]) {
        const dataIndex = this.calculateIndex(indices);

        if (!(typeof dataIndex === 'number')) {
            return dataIndex;
        }

        return this.data[dataIndex];
    }

    set(indices: number[], value: ValueObject) {
        const dataIndex = this.calculateIndex(indices);

        if (!(typeof dataIndex === 'number')) {
            return dataIndex;
        }

        if (
            ((this.identifierType === IdentifierType.INT ||
                this.identifierType === IdentifierType.FLOAT) &&
                (value.type() === ObjectType.INTEGER_OBJ ||
                    value.type() === ObjectType.FLOAT_OBJ)) ||
            (this.identifierType === IdentifierType.STRING &&
                value.type() === ObjectType.STRING_OBJ)
        ) {
            this.data[dataIndex] = value;
            return value;
        }

        return new ErrorValue(`type mismatch`);
    }

    inspect(): string {
        return `[${this.data.map((d) => d.inspect()).join(', ')}]`;
    }

    type(): ObjectType {
        return ObjectType.ARRAY_OBJ;
    }

    toString() {
        return `ARRAY(${this.dimensions.join(', ')})`;
    }
}

export class CalculatedObject implements ValueObject {
    calculator: () => ValueObject;

    constructor(calculator: () => ValueObject) {
        this.calculator = calculator;
    }

    getValue() {
        return this.calculator();
    }

    inspect(): string {
        return `${this.calculator()}`;
    }

    type(): ObjectType {
        return ObjectType.CALCULATED_OBJ;
    }

    toString() {
        return `[CALCULATED VALUE]`;
    }
}

export function isError(obj: ValueObject): obj is ErrorValue {
    return obj.type() === ObjectType.ERROR_OBJ;
}

export function isNumeric(obj: ValueObject): obj is IntValue | FloatValue {
    return (
        obj.type() === ObjectType.FLOAT_OBJ ||
        obj.type() === ObjectType.INTEGER_OBJ
    );
}

export function isString(obj: ValueObject): obj is StringValue {
    return obj.type() === ObjectType.STRING_OBJ;
}
