import { Token } from "./tokens";

export interface Node {
    tokenLiteral(): string;
    toString(): string;
}

export interface Statement extends Node {
    statementNode(): Statement;
}

export interface Expression extends Node {
    expressionNode(): Expression;
}

export class Program implements Node {
    statements: Statement[] = [];

    tokenLiteral(): string {
        if (this.statements.length > 0) {
            return this.statements[0].tokenLiteral();
        }

        return "";
    }

    toString() {
        let str = "";

        this.statements.forEach((statement) => (str += `${statement}\n`));

        return str;
    }
}

export class Identifier implements Expression {
    token: Token;
    value: string;

    constructor(token: Token) {
        this.token = token;
        this.value = token.literal;
    }

    expressionNode(): Expression {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return this.value;
    }
}

export class IntegerLiteral implements Expression {
    token: Token;
    value: number;

    constructor(token: Token, value: number) {
        this.token = token;
        this.value = value;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return this.token.literal;
    }

    expressionNode(): Expression {
        return this;
    }
}

export class PrefixExpression implements Expression {
    token: Token;
    operator: string;
    right: Expression | null;

    constructor(token: Token, operator: string, right: Expression | null) {
        this.token = token;
        this.operator = operator;
        this.right = right;
    }

    expressionNode(): Expression {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `(${this.operator}${this.right ? this.right.toString() : ""})`;
    }
}

export class InfixExpression implements Expression {
    token: Token;
    left: Expression;
    operator: string;
    right: Expression | null;

    constructor(
        token: Token,
        left: Expression,
        operator: string,
        right: Expression | null
    ) {
        this.token = token;
        this.left = left;
        this.operator = operator;
        this.right = right;
    }

    expressionNode(): Expression {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `(${this.left.toString()} ${this.operator} ${
            this.right ? this.right.toString() : ""
        })`;
    }
}

export class BooleanExpression implements Expression {
    token: Token;
    value: boolean;

    constructor(token: Token, value: boolean) {
        this.token = token;
        this.value = value;
    }

    toString(): string {
        return `${this.value}`;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    expressionNode(): Expression {
        return this;
    }
}

export class IfExpression implements Expression {
    token: Token;
    condition: Expression | null;
    consequence: BlockStatement;
    alternative: BlockStatement | null;

    constructor(
        token: Token,
        condition: Expression | null,
        consequence: BlockStatement,
        alternative: BlockStatement | null
    ) {
        this.token = token;
        this.condition = condition;
        this.consequence = consequence;
        this.alternative = alternative;
    }

    expressionNode(): Expression {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        if (this.alternative) {
            return `if ${
                this.condition?.toString() ?? ""
            } ${this.consequence.toString()} else ${this.alternative.toString()}`;
        }

        return `if ${
            this.condition?.toString() ?? ""
        } ${this.consequence.toString()}`;
    }
}

export class FunctionExpression implements Expression {
    token: Token;
    parameters: Identifier[];
    body: BlockStatement | null;

    constructor(
        token: Token,
        parameters: Identifier[],
        body: BlockStatement | null
    ) {
        this.token = token;
        this.parameters = parameters;
        this.body = body;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    expressionNode(): Expression {
        return this;
    }

    toString(): string {
        return `${this.tokenLiteral()}(${this.parameters
            .map((p) => p.toString())
            .join(", ")}) ${this.body?.toString() ?? ""}`;
    }
}

export class LetStatement implements Statement {
    token: Token;
    name: Identifier;
    value: Expression | null;

    constructor(token: Token, name: Identifier, value: Expression | null) {
        this.token = token;
        this.name = name;
        this.value = value;
    }

    statementNode(): Statement {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `${this.tokenLiteral()} ${this.name.toString()} = ${
            this.value ? this.value.toString() : ""
        };`;
    }
}

export class ReturnStatement implements Statement {
    token: Token;
    returnValue: Expression | null;

    constructor(token: Token, returnValue: Expression | null) {
        this.token = token;
        this.returnValue = returnValue;
    }

    statementNode(): Statement {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `${this.tokenLiteral()} ${
            this.returnValue ? this.returnValue : ""
        };`;
    }
}

export class ExpressionStatement implements Statement {
    token: Token;
    expression: Expression | null;

    constructor(token: Token, expression: Expression | null) {
        this.token = token;
        this.expression = expression;
    }

    statementNode(): Statement {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        if (this.expression) {
            return this.expression.toString();
        }

        return "";
    }
}

export class BlockStatement implements Statement {
    token: Token;
    statements: Statement[];

    constructor(token: Token, statements: Statement[]) {
        this.token = token;
        this.statements = statements;
    }

    statementNode(): Statement {
        return this;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return (
            "{ " +
            this.statements
                .map((statement) => statement.toString())
                .join("\n") +
            " }"
        );
    }
}

export function isLetStatement(st: Node): st is LetStatement {
    return st.tokenLiteral() === "let";
}

export function isReturnStatement(st: Node): st is ReturnStatement {
    return st.tokenLiteral() === "return";
}

export function isExpressionStatement(st: Node): st is ExpressionStatement {
    return st instanceof ExpressionStatement;
}

export function isIdentifier(n: Node): n is Identifier {
    return n instanceof Identifier;
}

export function isIntegerLiteral(n: Node): n is IntegerLiteral {
    return n instanceof IntegerLiteral;
}

export function isPrefixExpression(n: Node): n is PrefixExpression {
    return n instanceof PrefixExpression;
}

export function isInfixExpression(n: Node): n is InfixExpression {
    return n instanceof InfixExpression;
}

export function isBooleanExpression(n: Node): n is BooleanExpression {
    return n instanceof BooleanExpression;
}

export function isIfExpression(n: Node): n is IfExpression {
    return n instanceof IfExpression;
}

export function isBlockStatement(n: Node): n is BlockStatement {
    return n instanceof BlockStatement;
}

export function isFunctionExpression(n: Node): n is FunctionExpression {
    return n instanceof FunctionExpression;
}