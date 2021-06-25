import Lexer from "./lexer";
import { Token, TokenType } from "./tokens";
import {
    ArrayLiteral,
    BlockStatement,
    BooleanExpression,
    CallExpression,
    Expression,
    ExpressionStatement,
    FunctionExpression,
    HashLiteral,
    Identifier,
    IfExpression,
    IndexExpression,
    InfixExpression,
    IntegerLiteral,
    LetStatement,
    PrefixExpression,
    Program,
    ReturnStatement,
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
    [TokenType.EQ]: Precedence.EQUALS,
    [TokenType.NOT_EQ]: Precedence.EQUALS,
    [TokenType.LT]: Precedence.LESSGREATER,
    [TokenType.GT]: Precedence.LESSGREATER,
    [TokenType.PLUS]: Precedence.SUM,
    [TokenType.MINUS]: Precedence.SUM,
    [TokenType.ASTERISK]: Precedence.PRODUCT,
    [TokenType.SLASH]: Precedence.PRODUCT,
    [TokenType.LPAREN]: Precedence.CALL,
    [TokenType.LBRACKET]: Precedence.INDEX,
};

export class Parser {
    lexer: Lexer;
    errors: string[];

    private curToken!: Token;
    private peekToken!: Token;

    private prefixParsers: Record<string, PrefixParser>;
    private infixParsers: Record<string, InfixParser>;

    constructor(lexer: Lexer) {
        this.lexer = lexer;
        this.errors = [];
        this.prefixParsers = {};
        this.infixParsers = {};

        this.registerPrefix(TokenType.IDENT, this.parseIdentifier.bind(this));
        this.registerPrefix(TokenType.INT, this.parseIntegerLiteral.bind(this));
        this.registerPrefix(
            TokenType.STRING,
            this.parseStringLiteral.bind(this)
        );
        this.registerPrefix(
            TokenType.BANG,
            this.parsePrefixExpression.bind(this)
        );
        this.registerPrefix(
            TokenType.MINUS,
            this.parsePrefixExpression.bind(this)
        );
        this.registerPrefix(TokenType.TRUE, this.parseBoolean.bind(this));
        this.registerPrefix(TokenType.FALSE, this.parseBoolean.bind(this));
        this.registerPrefix(
            TokenType.LPAREN,
            this.parseGroupedExpression.bind(this)
        );
        this.registerPrefix(TokenType.IF, this.parseIfExpression.bind(this));
        this.registerPrefix(TokenType.FUNCTION, this.parseFunction.bind(this));
        this.registerPrefix(
            TokenType.LBRACKET,
            this.parseArrayLiteral.bind(this)
        );
        this.registerPrefix(TokenType.LBRACE, this.parseHashLiteral.bind(this));

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
        this.registerInfix(TokenType.EQ, this.parseInfixExpression.bind(this));
        this.registerInfix(
            TokenType.NOT_EQ,
            this.parseInfixExpression.bind(this)
        );
        this.registerInfix(TokenType.LT, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.GT, this.parseInfixExpression.bind(this));
        this.registerInfix(
            TokenType.LPAREN,
            this.parseCallExpression.bind(this)
        );
        this.registerInfix(
            TokenType.LBRACKET,
            this.parseIndexExpression.bind(this)
        );

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
        switch (this.curToken.type) {
            case TokenType.LET:
                return this.parseLetStatement();
            case TokenType.RETURN:
                return this.parseReturnStatement();
            default:
                return this.parseExpressionStatement();
        }

        return null;
    }

    parseExpressionStatement(): ExpressionStatement {
        const statement = new ExpressionStatement(
            this.curToken,
            this.parseExpression(Precedence.LOWEST)
        );

        if (this.peekTokenIs(TokenType.SEMICOLON)) {
            this.nextToken();
        }

        return statement;
    }

    parseLetStatement(): LetStatement | null {
        const letToken = this.curToken;

        if (!this.expectPeek(TokenType.IDENT)) {
            return null;
        }

        const name = new Identifier(this.curToken);

        if (!this.expectPeek(TokenType.ASSIGN)) {
            return null;
        }

        this.nextToken();

        const expr = this.parseExpression(Precedence.LOWEST);

        if (this.peekTokenIs(TokenType.SEMICOLON)) {
            this.nextToken();
        }

        return new LetStatement(letToken, name, expr);
    }

    parseReturnStatement() {
        const token = this.curToken;

        this.nextToken();

        const expr = this.parseExpression(Precedence.LOWEST);

        if (this.peekTokenIs(TokenType.SEMICOLON)) {
            this.nextToken();
        }

        return new ReturnStatement(token, expr);
    }

    parseExpression(precedence: Precedence): Expression | null {
        const prefix = this.prefixParsers[this.curToken.type];

        if (!prefix) {
            this.noPrefixParseFnError(this.curToken.type);
            return null;
        }

        let leftExp = prefix();

        while (
            !this.peekTokenIs(TokenType.SEMICOLON) &&
            precedence < this.peekPrecedence()
        ) {
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

    parseBoolean(): Expression {
        return new BooleanExpression(
            this.curToken,
            this.curTokenIs(TokenType.TRUE)
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

    parseIfExpression(): Expression | null {
        const token = this.curToken;

        if (!this.expectPeek(TokenType.LPAREN)) {
            return null;
        }

        this.nextToken();

        const condition = this.parseExpression(Precedence.LOWEST);

        if (!this.expectPeek(TokenType.RPAREN)) {
            return null;
        }

        if (!this.expectPeek(TokenType.LBRACE)) {
            return null;
        }

        const consequence = this.parseBlockStatement();
        let alternative: BlockStatement | null = null;

        if (this.peekTokenIs(TokenType.ELSE)) {
            this.nextToken();

            if (!this.expectPeek(TokenType.LBRACE)) {
                return null;
            }

            alternative = this.parseBlockStatement();
        }

        return new IfExpression(token, condition, consequence, alternative);
    }

    parseBlockStatement(): BlockStatement {
        const block = new BlockStatement(this.curToken, []);

        this.nextToken();

        while (
            !this.curTokenIs(TokenType.RBRACE) &&
            !this.curTokenIs(TokenType.EOF)
        ) {
            const statement = this.parseStatement();
            if (statement !== null) {
                block.statements.push(statement);
            }

            this.nextToken();
        }

        return block;
    }

    parseFunction(): FunctionExpression | null {
        const token = this.curToken;

        if (!this.expectPeek(TokenType.LPAREN)) {
            return null;
        }

        const parameters = this.parseFunctionParameters();

        if (!this.expectPeek(TokenType.LBRACE)) {
            return null;
        }

        const body = this.parseBlockStatement();

        return new FunctionExpression(token, parameters, body);
    }

    parseFunctionParameters(): Identifier[] {
        const params: Identifier[] = [];

        if (this.peekTokenIs(TokenType.RPAREN)) {
            return params;
        }

        this.nextToken();

        params.push(this.parseIdentifier());

        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken();
            this.nextToken();

            params.push(this.parseIdentifier());
        }

        if (!this.expectPeek(TokenType.RPAREN)) {
            return [];
        }

        return params;
    }

    parseCallExpression(fn: Expression | null): CallExpression {
        return new CallExpression(
            this.curToken,
            fn!,
            this.parseExpressionList(TokenType.RPAREN)
        );
    }

    parseExpressionList(end: TokenType): Expression[] {
        const args: Expression[] = [];

        if (this.peekTokenIs(end)) {
            this.nextToken();
            return args;
        }

        this.nextToken();

        const arg = this.parseExpression(Precedence.LOWEST);

        if (arg) {
            args.push(arg);
        }

        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken();
            this.nextToken();
            const arg = this.parseExpression(Precedence.LOWEST);
            if (arg) {
                args.push(arg);
            }
        }

        if (!this.expectPeek(end)) {
            return [];
        }

        return args;
    }

    parseArrayLiteral(): Expression {
        const token = this.curToken;
        const elements = this.parseExpressionList(TokenType.RBRACKET);

        return new ArrayLiteral(token, elements);
    }

    parseIndexExpression(left: Expression | null): Expression | null {
        const token = this.curToken;

        this.nextToken();

        const index = this.parseExpression(Precedence.LOWEST);

        if (!this.expectPeek(TokenType.RBRACKET)) {
            return null;
        }

        if (!index || !left) {
            return null;
        }

        return new IndexExpression(token, left, index);
    }

    parseHashLiteral(): Expression | null {
        const token = this.curToken;
        const pairs = new Map<Expression, Expression>();

        while (!this.peekTokenIs(TokenType.RBRACE)) {
            this.nextToken();

            const key = this.parseExpression(Precedence.LOWEST);
            if (!this.expectPeek(TokenType.COLON)) {
                return null;
            }

            this.nextToken();

            const value = this.parseExpression(Precedence.LOWEST);

            if (key && value) {
                pairs.set(key, value);
            }

            if (
                !this.peekTokenIs(TokenType.RBRACE) &&
                !this.expectPeek(TokenType.COMMA)
            ) {
                return null;
            }
        }

        if (!this.expectPeek(TokenType.RBRACE)) {
            return null;
        }

        return new HashLiteral(token, pairs);
    }
}
