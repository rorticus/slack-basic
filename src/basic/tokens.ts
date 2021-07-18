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
    CONT = "CONT",
    DATA = "DATA",
    DEF = "DEF",
    DIM = "DIM",
    END = "END",
    FN = "FN",
    FOR = "FOR",
    GO = "GO",
    GOSUB = "GOSUB",
    GOTO = "GOTO",
    IF = "IF",
    INPUT = "INPUT",
    LET = "LET",
    LIST = "LIST",
    LOAD = "LOAD",
    NEXT = "NEXT",
    NOT = "NOT",
    ON = "ON",
    OR = "OR",
    PRINT = "PRINT",
    READ = "READ",
    REM = "REM",
    RESTORE = "RESTORE",
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
    CONT: TokenType.CONT,
    DATA: TokenType.DATA,
    DEF: TokenType.DEF,
    DIM: TokenType.DIM,
    END: TokenType.END,
    FN: TokenType.FN,
    FOR: TokenType.FOR,
    GO: TokenType.GO,
    GOSUB: TokenType.GOSUB,
    GOTO: TokenType.GOTO,
    IF: TokenType.IF,
    INPUT: TokenType.INPUT,
    LET: TokenType.LET,
    LIST: TokenType.LIST,
    LOAD: TokenType.LOAD,
    NEXT: TokenType.NEXT,
    NOT: TokenType.NOT,
    ON: TokenType.ON,
    OR: TokenType.OR,
    PRINT: TokenType.PRINT,
    READ: TokenType.READ,
    REM: TokenType.REM,
    RESTORE: TokenType.RESTORE,
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
