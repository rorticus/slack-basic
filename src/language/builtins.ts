import {
    ArrayValue,
    BuiltInFunction,
    BuiltInFunctionValue,
    IntValue,
    NULL,
    ObjectType,
    StringValue,
    ValueObject,
} from "./object";
import { newError } from "./evaluator";

export const builtins: Record<string, BuiltInFunctionValue> = {
    len: new BuiltInFunctionValue((str) => {
        if (!str) {
            return newError(`must provide a argument`);
        }

        if (str.type() === ObjectType.STRING_OBJ) {
            return new IntValue((str as StringValue).value.length);
        } else if (str.type() === ObjectType.ARRAY_OBJ) {
            return new IntValue((str as ArrayValue).elements.length);
        }

        return newError(`cannot len a ${str.type()}`);
    }),

    first: new BuiltInFunctionValue((value) => {
        if (!value) {
            return newError("must provide an argument");
        }

        if (value.type() === ObjectType.ARRAY_OBJ) {
            const arrValue = value as ArrayValue;

            if (arrValue.elements.length > 0) {
                return arrValue.elements[0];
            }

            return NULL;
        }

        return newError(`cannot first a ${value.type()}`);
    }),

    last: new BuiltInFunctionValue((value) => {
        if (!value) {
            return newError("must provide an argument");
        }

        if (value.type() === ObjectType.ARRAY_OBJ) {
            const arrValue = value as ArrayValue;

            if (arrValue.elements.length > 0) {
                return arrValue.elements[arrValue.elements.length - 1];
            }

            return NULL;
        }

        return newError(`cannot last a ${value.type()}`);
    }),

    rest: new BuiltInFunctionValue((value) => {
        if (!value) {
            return newError("must provide an argument");
        }

        if (value.type() === ObjectType.ARRAY_OBJ) {
            const arrValue = value as ArrayValue;

            if (arrValue.elements.length === 0) {
                return NULL;
            }

            return new ArrayValue(arrValue.elements.slice(1));
        }

        return newError(`cannot rest a ${value.type()}`);
    }),

    push: new BuiltInFunctionValue((arr, value: ValueObject) => {
        if (!arr || !value) {
            return newError("must provide an arguments");
        }

        if (arr.type() === ObjectType.ARRAY_OBJ) {
            const arrValue = arr as ArrayValue;

            return new ArrayValue([...arrValue.elements, value]);
        }

        return newError(`cannot push a ${arr.type()}`);
    }),
};
