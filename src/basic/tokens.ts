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
    LTE = "<=",
    GTE = ">=",
    NOT_EQ = "<>",

    COLON = ":",
    COMMA = ",",

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
    AND = "AND",
    OR = "OR",
    NOT = "NOT",
    PRINT = "PRINT"
}

export interface Token {
    type: TokenType;
    literal: string;
    line: number;
    column: number;
}

const keywords: { [key: string]: TokenType } = {
    AND: TokenType.AND,
    OR: TokenType.OR,
    NOT: TokenType.NOT,
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
    PRINT: TokenType.PRINT
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
