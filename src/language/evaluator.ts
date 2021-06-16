import { IntValue, ValueObject } from "./object";
import {
    ExpressionStatement,
    IntegerLiteral,
    Node,
    Program,
    Statement,
} from "./ast";

export function languageEval(node: Node | null): ValueObject | null {
    if (node instanceof Program) {
        return languageEvalStatements(node.statements);
    } else if (node instanceof ExpressionStatement && node.expression) {
        return languageEval(node.expression);
    } else if (node instanceof IntegerLiteral) {
        return new IntValue(node.value);
    }

    return null;
}

export function languageEvalStatements(statements: Statement[]) {
    let result: ValueObject | null = null;

    statements.forEach((statement) => {
        result = languageEval(statement);
    });

    return result;
}
