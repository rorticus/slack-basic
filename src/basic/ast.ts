import { Token } from "./tokens";

export interface Node {
    tokenLiteral(): string;
    toString(): string;
}

export enum StatementType {
    CLR = "CLR",
    COMPOUND = "COMPOUND",
    CONT = "CONT",
    DATA = "DATA",
    DEF = "DEF",
    DIM = "DIM",
    END = "END",
    FOR = "FOR",
    GOSUB = "GOSUB",
    GOTO = "GOTO",
    IF = "IF",
    INPUT = "INPUT",
    LET = "LET",
    LIST = "LIST",
    LOAD = "LOAD",
    NEW = "NEW",
    NEXT = "NEXT",
    PRINT = "PRINT",
    READ = "READ",
    RESTORE = "RESTORE",
    REM = "REM",
    RETURN = "RETURN",
    RUN = "RUN",
}

export enum IdentifierType {
    FLOAT = "FLOAT",
    INT = "INT",
    STRING = "STRING",
}

export interface Statement extends Node {
    lineNumber: number | undefined;
    type: StatementType;
    next: Statement | null;
}

export interface Expression extends Node {}

function combineParts(
    ...parts: (
        | number
        | string
        | null
        | undefined
        | (string | number | null | undefined)[]
    )[]
) {
    const printable: string[] = [];

    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];

        if (!p) {
            continue;
        }

        if (typeof p === "number" || typeof p === "string") {
            printable.push(p.toString());
        } else if (p instanceof Array) {
            for (let j = 0; j < p.length; j++) {
                if (p[j]) {
                    printable.push(p[j]!.toString());
                }
            }
        }
    }

    return printable.join(" ");
}

export class Identifier implements Expression {
    token: Token;
    value: string;
    type: IdentifierType;

    constructor(token: Token) {
        this.token = token;
        this.value = token.literal;

        switch (this.value[this.value.length - 1]) {
            case "%":
                this.type = IdentifierType.INT;
                break;
            case "$":
                this.type = IdentifierType.STRING;
                break;
            default:
                this.type = IdentifierType.FLOAT;
        }
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
}

export class FloatLiteral implements Expression {
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
}

export class StringLiteral implements Expression {
    token: Token;
    value: string;

    constructor(token: Token, value: string) {
        this.token = token;
        this.value = value;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `"${this.token.literal}"`;
    }
}

export class RunStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.RUN;
    next: Statement | null = null;

    constructor(token: Token) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return this.token.literal;
    }
}

export class GotoStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.GOTO;
    destination: number;
    next: Statement | null = null;

    constructor(token: Token, destination: number) {
        this.token = token;
        this.destination = destination;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `${this.token.literal} ${this.destination}`;
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

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `(${
            this.operator === "FN" ? `${this.operator} ` : this.operator
        }${this.right ? this.right.toString() : ""})`;
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

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `(${this.left.toString()} ${this.operator} ${
            this.right ? this.right.toString() : ""
        })`;
    }
}

export class IfStatement implements Statement {
    token: Token;
    lineNumber = 0;
    type = StatementType.IF;
    next: Statement | null = null;

    condition: Expression | null;
    then: number | Statement | undefined;
    goto: number | undefined;

    constructor(token: Token, condition: Expression | null) {
        this.token = token;
        this.condition = condition;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        const condition = this.condition?.toString() ?? "";

        if (this.goto !== undefined) {
            return `IF ${condition} GOTO ${this.goto}`;
        } else if (this.then !== undefined) {
            return `IF ${condition} THEN ${this.then}`;
        }
        return `IF ${this.condition?.toString() ?? ""}`;
    }
}

export interface LetAssignment {
    name: Identifier;
    indices: Expression[];
}

export class LetStatement implements Statement {
    token: Token;
    names: LetAssignment[];
    value: Expression | null;
    lineNumber = 0;
    next: Statement | null = null;

    type = StatementType.LET;

    constructor(
        token: Token,
        names: LetAssignment[],
        value: Expression | null
    ) {
        this.token = token;
        this.names = names;
        this.value = value;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral() === "LET" ? "LET" : "",
            this.names
                .map((n) => {
                    if (n.indices.length > 0) {
                        return `${n.name}(${n.indices
                            .map((i) => i.toString())
                            .join(", ")})`;
                    } else {
                        return n.name.toString();
                    }
                })
                .join(", "),
            "=",
            this.value ? this.value.toString() : ""
        );
    }
}

export class CompoundStatement implements Statement {
    token: Token;
    statements: Statement[];
    lineNumber = 0;
    type = StatementType.COMPOUND;
    next: Statement | null = null;

    constructor(token: Token, statements: Statement[]) {
        this.token = token;
        this.statements = statements;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.statements.map((s) => s.toString()).join(" : ")
        );
    }
}

export class PrintStatement implements Statement {
    token: Token;
    args: Expression[];
    type = StatementType.PRINT;
    lineNumber: number | undefined;
    next: Statement | null = null;

    constructor(token: Token, args: Expression[]) {
        this.token = token;
        this.args = args;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.args.map((a) => a.toString())
        );
    }
}

export class InputStatement implements Statement {
    token: Token;
    destination: Identifier[];
    type = StatementType.INPUT;
    lineNumber: number | undefined;
    next: Statement | null = null;
    message: Expression | null;

    constructor(
        token: Token,
        message: Expression | null,
        destination: Identifier[]
    ) {
        this.token = token;
        this.destination = destination;
        this.message = message;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.message ? this.message.toString() + ";" : null,
            this.destination.join(", ")
        );
    }
}

export class ForStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.FOR;
    next: Statement | null = null;

    iterator: Identifier | null;
    from: Expression | null;
    to: Expression | null;
    step: Expression | null;

    constructor(
        token: Token,
        iterator: Identifier | null,
        from: Expression | null,
        to: Expression | null,
        step: Expression | null
    ) {
        this.token = token;
        this.iterator = iterator;
        this.from = from;
        this.to = to;
        this.step = step;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.iterator?.toString(),
            "=",
            this.from?.toString(),
            "TO",
            this.to?.toString(),
            this.step && "STEP",
            this.step && this.step.toString()
        );
    }

    tokenLiteral(): string {
        return this.token.literal;
    }
}

export class NextStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.NEXT;
    next: Statement | null = null;

    values: Identifier[];

    constructor(token: Token, values: Identifier[]) {
        this.token = token;
        this.values = values;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.values.map((v) => v.toString()).join(", ")
        );
    }

    tokenLiteral(): string {
        return this.token.literal;
    }
}

export class GosubStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.GOSUB;
    next: Statement | null = null;

    gosubLineNumber: number;

    constructor(token: Token, lineNumber: number) {
        this.token = token;
        this.gosubLineNumber = lineNumber;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.gosubLineNumber
        );
    }
}

export class ReturnStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.RETURN;
    next: Statement | null = null;

    constructor(token: Token) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}

export class RemStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.REM;
    next: Statement | null = null;

    constructor(token: Token) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}

export class CallExpression implements Expression {
    token: Token;
    fn: Expression;
    args: Expression[];

    constructor(token: Token, fn: Expression, args: Expression[]) {
        this.token = token;
        this.fn = fn;
        this.args = args;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return `${this.fn.toString()}(${this.args
            .map((arg) => arg.toString())
            .join(", ")})`;
    }
}

export class ClrStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.CLR;
    next: Statement | null = null;

    constructor(token: Token) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}

export class DataStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.DATA;
    next: Statement | null = null;
    datas: Expression[];

    constructor(token: Token, datas: Expression[]) {
        this.token = token;
        this.datas = datas;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.datas.map((d) => d.toString()).join(", ")
        );
    }
}

export class ReadStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.READ;
    next: Statement | null = null;
    outputs: Identifier[];

    constructor(token: Token, outputs: Identifier[]) {
        this.token = token;
        this.outputs = outputs;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.outputs.map((o) => o.value).join(", ")
        );
    }
}

export class RestoreStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.RESTORE;
    next: Statement | null = null;

    constructor(token: Token) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}

export class DefStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.DEF;
    next: Statement | null = null;
    name: Identifier;
    argument: Identifier | null;
    body: Expression;

    constructor(
        token: Token,
        name: Identifier,
        argument: Identifier | null,
        body: Expression
    ) {
        this.token = token;
        this.name = name;
        this.argument = argument;
        this.body = body;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            "FN",
            `${this.name.toString()}(${
                this.argument ? this.argument.toString() : ""
            })`,
            "=",
            this.body.toString()
        );
    }
}

export interface DimVariable {
    name: Identifier;
    dimensions: Expression[];
}

export class DimStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.DIM;
    next: Statement | null = null;
    variables: DimVariable[];

    constructor(token: Token, variables: DimVariable[]) {
        this.token = token;
        this.variables = variables;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.variables
                .map(
                    (v) =>
                        `${v.name}(${v.dimensions
                            .map((e) => e.toString())
                            .join(", ")})`
                )
                .join(", ")
        );
    }
}

export class EndStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.END;
    next: Statement | null = null;

    constructor(token: Token) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}

export class ContStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.CONT;
    next: Statement | null = null;

    constructor(token: Token) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}

export class ListStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.LIST;
    next: Statement | null = null;
    startLine: Expression | null;
    endLine: Expression | null;

    constructor(
        token: Token,
        startLine: Expression | null,
        endLine: Expression | null
    ) {
        this.token = token;
        this.startLine = startLine;
        this.endLine = endLine;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}

export class LoadStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.LOAD;
    next: Statement | null = null;
    filename: Expression;

    constructor(token: Token, filename: Expression) {
        this.token = token;
        this.filename = filename;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(
            this.lineNumber,
            this.tokenLiteral(),
            this.filename.toString()
        );
    }
}

export class NewStatement implements Statement {
    token: Token;
    lineNumber: number | undefined;
    type = StatementType.NEW;
    next: Statement | null = null;

    constructor(
        token: Token
    ) {
        this.token = token;
    }

    tokenLiteral(): string {
        return this.token.literal;
    }

    toString(): string {
        return combineParts(this.lineNumber, this.tokenLiteral());
    }
}
