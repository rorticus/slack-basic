import {
    BuiltInFunctionValue,
    ErrorValue,
    FloatValue,
    IntValue,
    ObjectType,
    ValueObject,
} from "./object";
import { isError } from "./object";

function getSingleNumericArgument(
    values: ValueObject[]
): IntValue | FloatValue | ErrorValue {
    if (values.length == 0) {
        return new ErrorValue(`too few arguments`);
    }

    if (values.length > 1) {
        return new ErrorValue(`expected single argument`);
    }

    const v = values[0];

    if (
        v.type() !== ObjectType.INTEGER_OBJ &&
        v.type() !== ObjectType.FLOAT_OBJ
    ) {
        return new ErrorValue(
            `type mismatch, expected ${
                ObjectType.FLOAT_OBJ
            }, received ${v.type()}`
        );
    }

    return v as IntValue | FloatValue;
}

export default {
    ABS: new BuiltInFunctionValue((args: ValueObject[]) => {
        const n = getSingleNumericArgument(args);
        if (isError(n)) {
            return n;
        }

        return new FloatValue(Math.abs(n.value));
    }),
} as Record<string, BuiltInFunctionValue>;
