import {BuiltInFunction, BuiltInFunctionValue, IntValue, NULL, ObjectType, StringValue} from "./object";
import {newError} from "./evaluator";

export const builtins: Record<string, BuiltInFunctionValue> = {
    "len": new BuiltInFunctionValue((str) => {
        if(!str) {
            return newError(`must provide a string argument`);
        }

        if(str.type() !== ObjectType.STRING_OBJ) {
            return newError(`cannot len a ${str.type()}`);
        }

        return new IntValue((str as StringValue).value.length);
    })
};