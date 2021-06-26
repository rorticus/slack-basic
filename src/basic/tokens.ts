export enum TokenType {
    ILLEGAL = "ILLEGAL",
    EOF = "EOF",

    IDENT = "IDENT",
    INT = "INT",
    FLOAT = "FLOAT",
    STRING = "STRING",

    ASSIGN = "=",
    PLUS = "+",
    MINUS = "-",
    BANG = "!",
    ASTERISK = "*",
    SLASH = "/",
    LT = "<",
    GT = ">",
    NOT_EQ = "<>",

    COLON = ":",

    LPAREN = "(",
    RPAREN = ")",

    LET = "LET",
    IF = "IF",
    ELSE = "ELSE",
    DIM = "DIM",
    END = "END",
    FOR = "FOR",
    TO = "TO",
    GOSUB = "GOSUB",
    GOTO = "GOTO",
    GO = "GO",
    THEN = "THEN",
    NEXT = "NEXT",
    ON = "ON",
    REM = "REM",
    RETURN = "RETURN",
    STOP = "STOP",
}

export interface Token {
    type: TokenType;
    literal: string;
    line: number;
    column: number;
}

const keywords: { [key: string]: TokenType } = {
    LET: TokenType.LET,
    IF: TokenType.IF,
    ELSE: TokenType.ELSE,
    DIM: TokenType.DIM,
    END: TokenType.END,
    FOR: TokenType.FOR,
    TO: TokenType.TO,
    GOSUB: TokenType.GOSUB,
    GOTO: TokenType.GOTO,
    GO: TokenType.GO,
    THEN: TokenType.THEN,
    NEXT: TokenType.NEXT,
    ON: TokenType.ON,
    REM: TokenType.REM,
    RETURN: TokenType.RETURN,
    STOP: TokenType.STOP,
};

export function newToken(
    type: TokenType,
    literal: string = "",
    line: number,
    column: number
): Token {
    return {
        type,
        literal,
        line,
        column,
    };
}

export function lookupIdent(ident: string): TokenType {
    return keywords[ident.toUpperCase()] ?? TokenType.IDENT;
}
