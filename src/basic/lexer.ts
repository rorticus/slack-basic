import { lookupIdent, newToken, Token, TokenType } from "./tokens";

export function isLetter(c: string) {
    const letters = "abcdefghijklmnopqrstuvwxyz_";

    if (c === "") {
        return false;
    }

    return letters.indexOf(c.toLowerCase()) >= 0;
}

export function isDigit(c: string) {
    const digits = "0123456789";

    if (c === "") {
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
        this.ch = "";
        this.line = 1;
        this.column = 0;

        this.readChar();
    }

    peekChar() {
        if (this.readPosition >= this.input.length) {
            return "";
        } else {
            return this.input[this.readPosition];
        }
    }

    readChar() {
        if (this.readPosition >= this.input.length) {
            this.ch = "";
        } else {
            if (this.ch === "\n") {
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
        let position = this.position;

        while (isLetter(this.ch)) {
            this.readChar();
        }

        if (this.ch === "$" || this.ch === "%") {
            this.readChar();
        }

        return this.input.slice(position, this.position).toUpperCase();
    }

    readNumber() {
        let position = this.position;

        while (isDigit(this.ch) || this.ch === ".") {
            this.readChar();
        }

        return this.input.slice(position, this.position);
    }

    skipWhitespace() {
        while (
            this.ch === " " ||
            this.ch === "\t" ||
            this.ch === "\r" ||
            this.ch === "\n"
        ) {
            this.readChar();
        }
    }

    readString() {
        let position = this.position + 1;
        while (1) {
            this.readChar();

            if (this.ch === '"' || this.ch === "") {
                break;
            }
        }

        return this.input.substr(position, this.position - position);
    }

    nextToken(): Token {
        let tok: Token;

        this.skipWhitespace();

        switch (this.ch) {
            case "=":
                tok = newToken(
                    TokenType.ASSIGN,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case ":":
                tok = newToken(
                    TokenType.COLON,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case ",":
                tok = newToken(
                    TokenType.COMMA,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case "(":
                tok = newToken(
                    TokenType.LPAREN,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case ")":
                tok = newToken(
                    TokenType.RPAREN,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case "+":
                tok = newToken(TokenType.PLUS, this.ch, this.line, this.column);
                break;
            case "-":
                tok = newToken(
                    TokenType.MINUS,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case "*":
                tok = newToken(
                    TokenType.ASTERISK,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case "/":
                tok = newToken(
                    TokenType.SLASH,
                    this.ch,
                    this.line,
                    this.column
                );
                break;
            case "<":
                if (this.peekChar() === "=") {
                    tok = newToken(
                        TokenType.LTE,
                        this.ch,
                        this.line,
                        this.column
                    );
                    this.readChar();
                } else if (this.peekChar() === ">") {
                    tok = newToken(
                        TokenType.NOT_EQ,
                        this.ch,
                        this.line,
                        this.column
                    );
                    this.readChar();
                } else {
                    tok = newToken(
                        TokenType.LT,
                        this.ch,
                        this.line,
                        this.column
                    );
                }
                break;
            case ">":
                if (this.peekChar() === "=") {
                    tok = newToken(
                        TokenType.GTE,
                        this.ch,
                        this.line,
                        this.column
                    );
                    this.readChar();
                } else {
                    tok = newToken(
                        TokenType.GT,
                        this.ch,
                        this.line,
                        this.column
                    );
                }
                break;
            case "":
                tok = newToken(TokenType.EOF, this.ch, this.line, this.column);
                break;
            case '"':
                tok = newToken(
                    TokenType.STRING,
                    this.readString(),
                    this.line,
                    this.column
                );
                break;
            default:
                if (isLetter(this.ch)) {
                    const line = this.line;
                    const column = this.column;

                    const literal = this.readIdentifier();
                    tok = newToken(lookupIdent(literal), literal, line, column);
                    return tok;
                } else if (isDigit(this.ch)) {
                    const line = this.line;
                    const column = this.column;

                    const num = this.readNumber();

                    tok = newToken(
                        num.indexOf(".") >= 0 ? TokenType.FLOAT : TokenType.INT,
                        num,
                        line,
                        column
                    );
                    return tok;
                } else {
                    tok = newToken(
                        TokenType.ILLEGAL,
                        this.ch,
                        this.line,
                        this.column
                    );
                }
        }

        this.readChar();

        return tok;
    }
}

export default Lexer;
