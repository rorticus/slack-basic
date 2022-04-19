export enum TokenType {
    ILLEGAL = 'ILLEGAL',
    EOF = 'EOF',

    IDENT = 'IDENT',
    INT = 'INT',
    FLOAT = 'FLOAT',
    STRING = 'STRING',

    ASSIGN = '=',
    PLUS = '+',
    MINUS = '-',
    ASTERISK = '*',
    SLASH = '/',
    EXP = '^',
    LT = '<',
    GT = '>',
    LTE = '<=',
    GTE = '>=',
    NOT_EQ = '<>',

    COLON = ':',
    COMMA = ',',
    SEMICOLON = ';',

    LPAREN = '(',
    RPAREN = ')',

    AND = 'AND',
    BOX = 'BOX',
    CLR = 'CLR',
    CONT = 'CONT',
    DATA = 'DATA',
    DEF = 'DEF',
    DIM = 'DIM',
    DRAW = 'DRAW',
    ELSE = 'ELSE',
    END = 'END',
    FN = 'FN',
    FOR = 'FOR',
    GO = 'GO',
    GOSUB = 'GOSUB',
    GOTO = 'GOTO',
    GRAPHICS = 'GRAPHICS',
    IF = 'IF',
    INPUT = 'INPUT',
    LET = 'LET',
    LIST = 'LIST',
    LOAD = 'LOAD',
    MOD = 'MOD',
    NEXT = 'NEXT',
    NEW = 'NEW',
    NOT = 'NOT',
    ON = 'ON',
    OR = 'OR',
    PRINT = 'PRINT',
    READ = 'READ',
    REM = 'REM',
    RESTORE = 'RESTORE',
    RETURN = 'RETURN',
    RUN = 'RUN',
    SAVE = 'SAVE',
    STEP = 'STEP',
    STOP = 'STOP',
    THEN = 'THEN',
    TO = 'TO',
}

export enum TokenCategory {
    NUMBER = 'NUMBER',
    STRING = 'STRING',
    OPERATOR = 'OPERATOR',
    IDENT = 'IDENT',
    STATEMENT = 'STATEMENT',
    COMMENT = 'COMMENT',
    OTHER = 'OTHER',
}

export interface Token {
    type: TokenType;
    category: TokenCategory;
    literal: string;
    line: number;
    column: number;
    start: number;
    end: number;
}

const keywords: { [key: string]: TokenType } = {
    AND: TokenType.AND,
    BOX: TokenType.BOX,
    CLR: TokenType.CLR,
    CONT: TokenType.CONT,
    DATA: TokenType.DATA,
    DEF: TokenType.DEF,
    DIM: TokenType.DIM,
    DRAW: TokenType.DRAW,
    ELSE: TokenType.ELSE,
    END: TokenType.END,
    FN: TokenType.FN,
    FOR: TokenType.FOR,
    GO: TokenType.GO,
    GOSUB: TokenType.GOSUB,
    GOTO: TokenType.GOTO,
    GRAPHICS: TokenType.GRAPHICS,
    IF: TokenType.IF,
    INPUT: TokenType.INPUT,
    LET: TokenType.LET,
    LIST: TokenType.LIST,
    LOAD: TokenType.LOAD,
    MOD: TokenType.MOD,
    NEXT: TokenType.NEXT,
    NEW: TokenType.NEW,
    NOT: TokenType.NOT,
    ON: TokenType.ON,
    OR: TokenType.OR,
    PRINT: TokenType.PRINT,
    READ: TokenType.READ,
    REM: TokenType.REM,
    RESTORE: TokenType.RESTORE,
    RETURN: TokenType.RETURN,
    RUN: TokenType.RUN,
    SAVE: TokenType.SAVE,
    STEP: TokenType.STEP,
    STOP: TokenType.STOP,
    THEN: TokenType.THEN,
    TO: TokenType.TO,
};

export function newToken(
    type: TokenType,
    category: TokenCategory,
    literal = '',
    line: number,
    column: number,
    start: number,
    end: number,
): Token {
    return {
        type,
        category,
        literal,
        line,
        column,
        start,
        end,
    };
}

export function lookupIdent(ident: string): TokenType {
    return keywords[ident.toUpperCase()] ?? TokenType.IDENT;
}
