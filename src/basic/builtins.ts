import {
    BuiltInFunctionValue,
    ErrorValue,
    FloatValue,
    IntValue,
    isError,
    isNumeric,
    isString,
    ObjectType,
    StringValue,
    ValueObject,
} from "./object";

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

function getSingleStringArgument(
    values: ValueObject[]
): StringValue | ErrorValue {
    if (values.length == 0) {
        return new ErrorValue(`too few arguments`);
    }

    if (values.length > 1) {
        return new ErrorValue(`expected single argument`);
    }

    const v = values[0];

    if (v.type() !== ObjectType.STRING_OBJ) {
        return new ErrorValue(
            `type mismatch, expected ${
                ObjectType.STRING_OBJ
            }, received ${v.type()}`
        );
    }

    return v as StringValue;
}

function singleNumberFunction(callback: (num: number) => number | ValueObject) {
    return new BuiltInFunctionValue((args: ValueObject[]) => {
        const n = getSingleNumericArgument(args);
        if (isError(n)) {
            return n;
        }

        let result = callback(n.value);
        if (typeof result === "number") {
            return new FloatValue(result);
        }

        return result;
    });
}

export default {
    ABS: singleNumberFunction(Math.abs),
    ASC: new BuiltInFunctionValue((args: ValueObject[]) => {
        const s = getSingleStringArgument(args);
        if (isError(s)) {
            return s;
        }

        return new IntValue(s.value.charCodeAt(0));
    }),
    ATN: singleNumberFunction(Math.atan),
    CHR$: singleNumberFunction((n) => new StringValue(String.fromCharCode(n))),
    COS: singleNumberFunction(Math.cos),
    EXP: singleNumberFunction(Math.exp),
    INT: singleNumberFunction((n) => new IntValue(n)),
    LEFT$: new BuiltInFunctionValue((args: ValueObject[]) => {
        if (args.length !== 2) {
            return new ErrorValue("expected 2 arguments");
        }

        const str = args[0];
        const cnt = args[1];

        if (!isString(str)) {
            return new ErrorValue(
                `type mismatch, expected string got ${str.type()}`
            );
        }

        if (!isNumeric(cnt)) {
            return new ErrorValue(
                `type mismatch, expected number got ${cnt.type()}`
            );
        }

        if (cnt.value < 0) {
            return new ErrorValue(`illegal quantity error, ${cnt.type()}`);
        }

        if (cnt.value === 0) {
            return new StringValue("");
        }

        if (cnt.value >= str.value.length) {
            return str;
        }

        return new StringValue(str.value.substr(0, cnt.value));
    }),
    LEN: new BuiltInFunctionValue((args: ValueObject[]) => {
        const str = getSingleStringArgument(args);
        if (isError(str)) {
            return str;
        }

        return new IntValue(str.value.length);
    }),
    LOG: singleNumberFunction(Math.log),
    MID$: new BuiltInFunctionValue((args: ValueObject[]) => {
        if (args.length < 2 || args.length >= 4) {
            return new ErrorValue("expected 2 or 3 arguments");
        }

        const str = args[0];
        const left = args[1];

        if (!isString(str)) {
            return new ErrorValue(
                `type mismatch, expected string got ${str.type()}`
            );
        }

        let right = str.value.length;

        if (args.length === 3) {
            if (!isNumeric(args[2])) {
                return new ErrorValue(
                    `type mismatch, expected number got ${args[2].type()}`
                );
            }

            right = (args[2] as IntValue).value;
        }

        if (!isNumeric(left)) {
            return new ErrorValue(
                `type mismatch, expected number got ${left.type()}`
            );
        }

        if (left.value < 0) {
            return new ErrorValue(`illegal quantity error, ${left.type()}`);
        }

        if (left.value === 0) {
            return new StringValue("");
        }

        if (left.value >= str.value.length) {
            return str;
        }

        if (right <= 0) {
            return str;
        }

        return new StringValue(str.value.substr(left.value - 1, right));
    }),
    RIGHT$: new BuiltInFunctionValue((args: ValueObject[]) => {
        if (args.length !== 2) {
            return new ErrorValue("expected 2 arguments");
        }

        const str = args[0];
        const cnt = args[1];

        if (!isString(str)) {
            return new ErrorValue(
                `type mismatch, expected string got ${str.type()}`
            );
        }

        if (!isNumeric(cnt)) {
            return new ErrorValue(
                `type mismatch, expected number got ${cnt.type()}`
            );
        }

        if (cnt.value < 0) {
            return new ErrorValue(`illegal quantity error, ${cnt.type()}`);
        }

        if (cnt.value === 0) {
            return new StringValue("");
        }

        if (cnt.value >= str.value.length) {
            return str;
        }

        return new StringValue(str.value.substr(str.value.length - cnt.value));
    }),
    SIN: singleNumberFunction(Math.sin),
    TAN: singleNumberFunction(Math.tan),
} as Record<string, BuiltInFunctionValue>;
