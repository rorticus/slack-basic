export enum TokenType {
    ILLEGAL = "ILLEGAL",
    EOF = "EOF",

    IDENT = "IDENT",
    INT = "INT",

    ASSIGN = "=",
    PLUS = "+",
    MINUS = '-',
    BANG = '!',
    ASTERISK = '*',
    SLASH = '/',
    LT = '<',
    GT = '>',
    EQ = "==",
    NOT_EQ = "!=",

    COMMA = ",",
    SEMICOLON = ";",

    LPAREN = "(",
    RPAREN = ")",
    LBRACE = "{",
    RBRACE = "}",

    FUNCTION = "FUNCTION",
    LET = "LET",
    TRUE = "TRUE",
    FALSE = "FALSE",
    IF = "IF",
    ELSE = "ELSE",
    RETURN = "RETURN"
}

export interface Token {
    type: TokenType;
    literal: string;
}

const keywords: { [key: string]: TokenType } = {
    "fn": TokenType.FUNCTION,
    "let": TokenType.LET,
    "true": TokenType.TRUE,
    "false": TokenType.FALSE,
    "if": TokenType.IF,
    "else": TokenType.ELSE,
    "return": TokenType.RETURN
};

export function newToken(type: TokenType, literal: string = ""): Token {
    return {
        type,
        literal
    };
}

export function lookupIdent(ident: string): TokenType {
    return keywords[ident] ?? TokenType.IDENT;
}
