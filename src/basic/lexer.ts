import {
    lookupIdent,
    newToken,
    Token,
    TokenCategory,
    TokenType,
} from './tokens';

export function isLetter(c: string) {
    const letters = 'abcdefghijklmnopqrstuvwxyz_';

    if (c === '') {
        return false;
    }

    return letters.indexOf(c.toLowerCase()) >= 0;
}

export function isDigit(c: string) {
    const digits = '0123456789';

    if (c === '') {
        return false;
    }

    return digits.indexOf(c.toLowerCase()) >= 0;
}

export class Lexer {
    private input: string;
    private position: number;
    private readPosition: number;
    private ch: string;
    private line: number;
    private column: number;

    constructor(input: string) {
        this.input = input;
        this.position = 0;
        this.readPosition = 0;
        this.ch = '';
        this.line = 1;
        this.column = 0;

        this.readChar();
    }

    peekChar() {
        if (this.readPosition >= this.input.length) {
            return '';
        } else {
            return this.input[this.readPosition];
        }
    }

    readChar() {
        if (this.readPosition >= this.input.length) {
            this.ch = '';
        } else {
            if (this.ch === '\n') {
                this.line++;
                this.column = 1;
            } else {
                this.column++;
            }

            this.ch = this.input[this.readPosition];
        }

        this.position = this.readPosition;
        this.readPosition++;
    }

    readIdentifier() {
        const position = this.position;

        while (isLetter(this.ch)) {
            this.readChar();
        }

        while (isLetter(this.ch) || isDigit(this.ch)) {
            this.readChar();
        }

        if (this.ch === '$' || this.ch === '%') {
            this.readChar();
        }

        return this.input.slice(position, this.position).toUpperCase();
    }

    readNumber() {
        const position = this.position;

        while (isDigit(this.ch) || this.ch === '.') {
            this.readChar();
        }

        return this.input.slice(position, this.position);
    }

    skipWhitespace() {
        while (
            this.ch === ' ' ||
            this.ch === '\t' ||
            this.ch === '\r' ||
            this.ch === '\n'
        ) {
            this.readChar();
        }
    }

    readString() {
        const position = this.position + 1;
        while (1) {
            this.readChar();

            if (this.ch === '"' || this.ch === '') {
                break;
            }
        }

        return this.input.substr(position, this.position - position);
    }

    nextToken(): Token {
        let tok: Token;

        this.skipWhitespace();

        switch (this.ch) {
            case '=':
                tok = newToken(
                    TokenType.ASSIGN,
                    TokenCategory.OPERATOR,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case ':':
                tok = newToken(
                    TokenType.COLON,
                    TokenCategory.OPERATOR,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case ',':
                tok = newToken(
                    TokenType.COMMA,
                    TokenCategory.OTHER,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '(':
                tok = newToken(
                    TokenType.LPAREN,
                    TokenCategory.OTHER,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case ')':
                tok = newToken(
                    TokenType.RPAREN,
                    TokenCategory.OTHER,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '+':
                tok = newToken(
                    TokenType.PLUS,
                    TokenCategory.OPERATOR,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '-':
                tok = newToken(
                    TokenType.MINUS,
                    TokenCategory.OPERATOR,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '*':
                tok = newToken(
                    TokenType.ASTERISK,
                    TokenCategory.OPERATOR,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '/':
                tok = newToken(
                    TokenType.SLASH,
                    TokenCategory.OPERATOR,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '<':
                if (this.peekChar() === '=') {
                    tok = newToken(
                        TokenType.LTE,
                        TokenCategory.OPERATOR,
                        '<=',
                        this.line,
                        this.column,
                        this.position - 1,
                        this.position,
                    );
                    this.readChar();
                } else if (this.peekChar() === '>') {
                    tok = newToken(
                        TokenType.NOT_EQ,
                        TokenCategory.OPERATOR,
                        '<>',
                        this.line,
                        this.column,
                        this.position - 1,
                        this.position,
                    );
                    this.readChar();
                } else {
                    tok = newToken(
                        TokenType.LT,
                        TokenCategory.OPERATOR,
                        this.ch,
                        this.line,
                        this.column,
                        this.position,
                        this.position,
                    );
                }
                break;
            case '>':
                if (this.peekChar() === '=') {
                    tok = newToken(
                        TokenType.GTE,
                        TokenCategory.OPERATOR,
                        this.ch,
                        this.line,
                        this.column,
                        this.position - 1,
                        this.position,
                    );
                    this.readChar();
                } else {
                    tok = newToken(
                        TokenType.GT,
                        TokenCategory.OPERATOR,
                        this.ch,
                        this.line,
                        this.column,
                        this.position,
                        this.position,
                    );
                }
                break;
            case '':
                tok = newToken(
                    TokenType.EOF,
                    TokenCategory.OTHER,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '"':
                {
                    const line = this.line;
                    const column = this.column;
                    const startPosition = this.position;

                    tok = newToken(
                        TokenType.STRING,
                        TokenCategory.STRING,
                        this.readString(),
                        line,
                        column,
                        startPosition,
                        this.position,
                    );
                }
                break;
            case '^':
                tok = newToken(
                    TokenType.EXP,
                    TokenCategory.OPERATOR,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case '?':
                tok = newToken(
                    TokenType.PRINT,
                    TokenCategory.STATEMENT,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            case ';':
                tok = newToken(
                    TokenType.SEMICOLON,
                    TokenCategory.OTHER,
                    this.ch,
                    this.line,
                    this.column,
                    this.position,
                    this.position,
                );
                break;
            default:
                if (isLetter(this.ch)) {
                    const line = this.line;
                    const column = this.column;
                    const pos = this.position;

                    const literal = this.readIdentifier();
                    const type = lookupIdent(literal);
                    tok = newToken(
                        type,
                        type === TokenType.IDENT
                            ? TokenCategory.IDENT
                            : TokenCategory.STATEMENT,
                        literal,
                        line,
                        column,
                        pos,
                        this.position,
                    );
                    if (tok.type === TokenType.REM) {
                        let rest = '';
                        while (this.ch !== '\n' && this.ch !== '') {
                            rest += this.ch;
                            this.readChar();
                        }
                        tok.literal = 'REM' + rest;
                        tok.category = TokenCategory.COMMENT;
                        tok.end = this.position;
                    }
                    return tok;
                } else if (isDigit(this.ch) || this.ch === '.') {
                    const line = this.line;
                    const column = this.column;
                    const pos = this.position;

                    const num = this.readNumber();

                    tok = newToken(
                        num.indexOf('.') >= 0 ? TokenType.FLOAT : TokenType.INT,
                        TokenCategory.NUMBER,
                        num,
                        line,
                        column,
                        pos,
                        this.position,
                    );
                    return tok;
                } else {
                    tok = newToken(
                        TokenType.ILLEGAL,
                        TokenCategory.OTHER,
                        this.ch,
                        this.line,
                        this.column,
                        this.position,
                        this.position,
                    );
                }
        }

        this.readChar();

        return tok;
    }
}

export default Lexer;
