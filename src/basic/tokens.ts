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
    ASTERISK = "*",
    SLASH = "/",
    EXP = "^",
    LT = "<",
    GT = ">",
    LTE = "<=",
    GTE = ">=",
    NOT_EQ = "<>",

    COLON = ":",
    COMMA = ",",
    SEMICOLON = ";",

    LPAREN = "(",
    RPAREN = ")",

    AND = "AND",
    CLR = "CLR",
    DATA = "DATA",
    DIM = "DIM",
    END = "END",
    FOR = "FOR",
    GO = "GO",
    GOSUB = "GOSUB",
    GOTO = "GOTO",
    IF = "IF",
    INPUT = "INPUT",
    LET = "LET",
    NEXT = "NEXT",
    NOT = "NOT",
    ON = "ON",
    OR = "OR",
    PRINT = "PRINT",
    REM = "REM",
    RETURN = "RETURN",
    RUN = "RUN",
    STEP = "STEP",
    STOP = "STOP",
    THEN = "THEN",
    TO = "TO",
}

export interface Token {
    type: TokenType;
    literal: string;
    line: number;
    column: number;
}

const keywords: { [key: string]: TokenType } = {
    AND: TokenType.AND,
    CLR: TokenType.CLR,
    DATA: TokenType.DATA,
    DIM: TokenType.DIM,
    END: TokenType.END,
    FOR: TokenType.FOR,
    GO: TokenType.GO,
    GOSUB: TokenType.GOSUB,
    GOTO: TokenType.GOTO,
    IF: TokenType.IF,
    INPUT: TokenType.INPUT,
    LET: TokenType.LET,
    NEXT: TokenType.NEXT,
    NOT: TokenType.NOT,
    ON: TokenType.ON,
    OR: TokenType.OR,
    PRINT: TokenType.PRINT,
    REM: TokenType.REM,
    RETURN: TokenType.RETURN,
    RUN: TokenType.RUN,
    STEP: TokenType.STEP,
    STOP: TokenType.STOP,
    THEN: TokenType.THEN,
    TO: TokenType.TO,
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
