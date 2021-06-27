import Lexer from "./lexer";
import { Token, TokenType } from "./tokens";
import {
    CompoundStatement,
    Expression,
    FloatLiteral,
    Identifier,
    InfixExpression,
    IntegerLiteral,
    LetStatement,
    PrefixExpression,
    Program,
    Statement,
    StringLiteral,
} from "./ast";

export type PrefixParser = () => Expression | null;
export type InfixParser = (expression: Expression | null) => Expression | null;

export enum Precedence {
    LOWEST = 0,
    EQUALS,
    LESSGREATER,
    SUM,
    PRODUCT,
    PREFIX,
    CALL,
    INDEX,
}

const precedences: Record<string, Precedence> = {
    [TokenType.ASSIGN]: Precedence.EQUALS,
    [TokenType.NOT_EQ]: Precedence.EQUALS,
    [TokenType.LT]: Precedence.LESSGREATER,
    [TokenType.GT]: Precedence.LESSGREATER,
    [TokenType.PLUS]: Precedence.SUM,
    [TokenType.MINUS]: Precedence.SUM,
    [TokenType.ASTERISK]: Precedence.PRODUCT,
    [TokenType.SLASH]: Precedence.PRODUCT,
};

export class Parser {
    lexer: Lexer;
    errors: string[];

    private lastLineNumber;

    private curToken!: Token;
    private peekToken!: Token;

    private prefixParsers: Record<string, PrefixParser>;
    private infixParsers: Record<string, InfixParser>;

    constructor(lexer: Lexer) {
        this.lexer = lexer;
        this.errors = [];
        this.prefixParsers = {};
        this.infixParsers = {};
        this.lastLineNumber = 0;

        this.registerPrefix(TokenType.IDENT, this.parseIdentifier.bind(this));
        this.registerPrefix(TokenType.INT, this.parseIntegerLiteral.bind(this));
        this.registerPrefix(TokenType.FLOAT, this.parseFloatLiteral.bind(this));
        this.registerPrefix(
            TokenType.STRING,
            this.parseStringLiteral.bind(this)
        );
        this.registerPrefix(
            TokenType.MINUS,
            this.parsePrefixExpression.bind(this)
        );
        this.registerInfix(
            TokenType.PLUS,
            this.parseInfixExpression.bind(this)
        );
        this.registerInfix(
            TokenType.MINUS,
            this.parseInfixExpression.bind(this)
        );
        this.registerInfix(
            TokenType.SLASH,
            this.parseInfixExpression.bind(this)
        );
        this.registerInfix(
            TokenType.ASTERISK,
            this.parseInfixExpression.bind(this)
        );
        this.registerInfix(
            TokenType.ASSIGN,
            this.parseInfixExpression.bind(this)
        );
        this.registerInfix(
            TokenType.NOT_EQ,
            this.parseInfixExpression.bind(this)
        );
        this.registerInfix(TokenType.LT, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.GT, this.parseInfixExpression.bind(this));

        // read the two tokens to fill our buffer
        this.nextToken();
        this.nextToken();
    }

    registerPrefix(tokenType: TokenType, parser: PrefixParser) {
        this.prefixParsers[tokenType] = parser;
    }

    registerInfix(tokenType: TokenType, parser: InfixParser) {
        this.infixParsers[tokenType] = parser;
    }

    nextToken() {
        this.curToken = this.peekToken;
        this.peekToken = this.lexer.nextToken();
    }

    peekTokenIs(type: TokenType) {
        return this.peekToken.type === type;
    }

    curTokenIs(type: TokenType) {
        return this.curToken.type === type;
    }

    peekError(t: TokenType) {
        this.errors.push(
            `expected next token to be ${t}, got ${this.peekToken.type} instead`
        );
    }

    noPrefixParseFnError(tokenType: TokenType) {
        this.errors.push(`no prefix parse function available for ${tokenType}`);
    }

    expectPeek(type: TokenType) {
        if (this.peekTokenIs(type)) {
            this.nextToken();
            return true;
        }

        this.peekError(type);

        return false;
    }

    peekPrecedence(): number {
        const p = precedences[this.peekToken.type];
        if (p !== undefined) {
            return p;
        }

        return Precedence.LOWEST;
    }

    curPrecedence(): number {
        const p = precedences[this.curToken.type];
        if (p !== undefined) {
            return p;
        }

        return Precedence.LOWEST;
    }

    parseProgram(): Program {
        const program = new Program();
        this.lastLineNumber = 0;

        while (!this.curTokenIs(TokenType.EOF)) {
            const statement = this.parseStatement();
            if (statement !== null) {
                program.statements.push(statement);
            }
            this.nextToken();
        }

        return program;
    }

    parseStatement(): Statement | null {
        let label = undefined;
        let lineNumber = this.lastLineNumber + 1;

        // statements can start with numbers
        if (this.curToken.type === TokenType.INT) {
            lineNumber = parseInt(this.curToken.literal, 10);
            // consume the number
            this.nextToken();
        } else if (this.curToken.type === TokenType.IDENT) {
            // or they can start with labels
            if (this.peekTokenIs(TokenType.COLON)) {
                label = this.curToken.literal;
                // consume the identifier and the colon
                this.nextToken();
                this.nextToken();
            }
        }

        this.lastLineNumber = lineNumber;

        const originalToken = this.curToken;
        let statements: (Statement | null)[] = [];
        while (1) {
            switch (this.curToken.type) {
                case TokenType.LET:
                    statements.push(this.parseLetStatement());
                    break;
                default:
                    // statements with no labels default to LET statements
                    statements.push(this.parseLetStatement());
            }

            if (this.peekTokenIs(TokenType.COLON)) {
                this.nextToken();
            } else {
                break;
            }
        }

        const result =
            statements.length > 1
                ? new CompoundStatement(
                      originalToken,
                      statements.filter((s) => s !== null) as Statement[]
                  )
                : statements[0];

        if (result) {
            result.lineNumber = lineNumber;
            result.label = label;
        }

        return result;
    }

    parseLetStatement(): LetStatement | null {
        const letToken = this.curToken;

        if (!this.expectPeek(TokenType.IDENT)) {
            return null;
        }

        const names: Identifier[] = [];

        names.push(this.parseIdentifier());

        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken();
            this.nextToken();
            const name = this.parseIdentifier();
            if (name) {
                names.push(name);
            }
        }

        if (!this.expectPeek(TokenType.ASSIGN)) {
            return null;
        }

        this.nextToken();

        const expr = this.parseExpression(Precedence.LOWEST);

        return new LetStatement(letToken, names, expr);
    }

    parseExpression(precedence: Precedence): Expression | null {
        const prefix = this.prefixParsers[this.curToken.type];

        if (!prefix) {
            this.noPrefixParseFnError(this.curToken.type);
            return null;
        }

        let leftExp = prefix();

        while (precedence < this.peekPrecedence()) {
            const infix = this.infixParsers[this.peekToken.type];
            if (!infix) {
                return leftExp;
            }

            this.nextToken();

            leftExp = infix(leftExp);
        }

        return leftExp;
    }

    parseIdentifier(): Identifier {
        return new Identifier(this.curToken);
    }

    parseIntegerLiteral(): Expression | null {
        const value = parseInt(this.curToken.literal, 10);

        if (isNaN(value)) {
            this.errors.push(
                `could not parse "${this.curToken.literal}" as integer`
            );
            return null;
        }

        return new IntegerLiteral(this.curToken, value);
    }

    parseFloatLiteral(): Expression | null {
        const value = parseFloat(this.curToken.literal);
        if (isNaN(value)) {
            this.errors.push(
                `could not parse "${this.curToken.literal}" as float`
            );
            return null;
        }

        return new FloatLiteral(this.curToken, value);
    }

    parseStringLiteral(): Expression {
        return new StringLiteral(this.curToken, this.curToken.literal);
    }

    parsePrefixExpression(): Expression | null {
        const token = this.curToken;
        this.nextToken();
        const right = this.parseExpression(Precedence.PREFIX);

        return new PrefixExpression(token, token.literal, right);
    }

    parseInfixExpression(left: Expression | null): Expression | null {
        const token = this.curToken;
        const precedence = this.curPrecedence();

        if (!left) {
            return null;
        }

        this.nextToken();

        return new InfixExpression(
            token,
            left,
            token.literal,
            this.parseExpression(precedence)
        );
    }

    parseGroupedExpression(): Expression | null {
        this.nextToken();

        const exp = this.parseExpression(Precedence.LOWEST);

        if (!this.expectPeek(TokenType.RPAREN)) {
            return null;
        }

        return exp;
    }
}
