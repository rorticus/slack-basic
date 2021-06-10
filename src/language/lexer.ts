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

    constructor(input: string) {
        this.input = input;
        this.position = 0;
        this.readPosition = 0;
        this.ch = "";

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

        return this.input.slice(position, this.position);
    }

    readNumber() {
        let position = this.position;

        while (isDigit(this.ch)) {
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

    nextToken(): Token {
        let tok: Token;

        this.skipWhitespace();

        switch (this.ch) {
            case "=":
                if (this.peekChar() === "=") {
                    this.readChar();
                    tok = newToken(TokenType.EQ, "==");
                } else {
                    tok = newToken(TokenType.ASSIGN, this.ch);
                }
                break;
            case ";":
                tok = newToken(TokenType.SEMICOLON, this.ch);
                break;
            case "(":
                tok = newToken(TokenType.LPAREN, this.ch);
                break;
            case ")":
                tok = newToken(TokenType.RPAREN, this.ch);
                break;
            case ",":
                tok = newToken(TokenType.COMMA, this.ch);
                break;
            case "+":
                tok = newToken(TokenType.PLUS, this.ch);
                break;
            case "-":
                tok = newToken(TokenType.MINUS, this.ch);
                break;
            case "*":
                tok = newToken(TokenType.ASTERISK, this.ch);
                break;
            case "/":
                tok = newToken(TokenType.SLASH, this.ch);
                break;
            case "!":
                if (this.peekChar() === "=") {
                    this.readChar();
                    tok = newToken(TokenType.NOT_EQ, "!=");
                } else {
                    tok = newToken(TokenType.BANG, this.ch);
                }
                break;
            case "<":
                tok = newToken(TokenType.LT, this.ch);
                break;
            case ">":
                tok = newToken(TokenType.GT, this.ch);
                break;
            case "{":
                tok = newToken(TokenType.LBRACE, this.ch);
                break;
            case "}":
                tok = newToken(TokenType.RBRACE, this.ch);
                break;
            case "":
                tok = newToken(TokenType.EOF, this.ch);
                break;
            default:
                if (isLetter(this.ch)) {
                    const literal = this.readIdentifier();
                    tok = newToken(lookupIdent(literal), literal);
                    return tok;
                } else if (isDigit(this.ch)) {
                    tok = newToken(TokenType.INT, this.readNumber());
                    return tok;
                } else {
                    tok = newToken(TokenType.ILLEGAL, this.ch);
                }
        }

        this.readChar();

        return tok;
    }
}

export default Lexer;
