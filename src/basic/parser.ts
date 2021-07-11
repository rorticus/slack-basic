import Lexer from "./lexer";
import { Token, TokenType } from "./tokens";
import {
    CompoundStatement,
    Expression,
    FloatLiteral,
    ForStatement,
    GotoStatement,
    Identifier,
    IfStatement,
    InfixExpression,
    InputStatement,
    IntegerLiteral,
    LetStatement,
    NextStatement,
    PrefixExpression,
    PrintStatement,
    RunStatement,
    Statement,
    StringLiteral,
} from "./ast";

export type PrefixParser = () => Expression | null;
export type InfixParser = (expression: Expression | null) => Expression | null;

export enum Precedence {
    LOWEST = 0,
    LOGICAL,
    EQUALS,
    LESSGREATER,
    SUM,
    PRODUCT,
    PREFIX,
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
    [TokenType.AND]: Precedence.LOGICAL,
    [TokenType.OR]: Precedence.LOGICAL,
    [TokenType.NOT]: Precedence.LOGICAL,
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
        this.registerPrefix(TokenType.FLOAT, this.parseFloatLiteral.bind(this));
        this.registerPrefix(
            TokenType.STRING,
            this.parseStringLiteral.bind(this)
        );
        this.registerPrefix(
            TokenType.MINUS,
            this.parsePrefixExpression.bind(this)
        );
        this.registerPrefix(
            TokenType.LPAREN,
            this.parseGroupedExpression.bind(this)
        );
        this.registerPrefix(
            TokenType.NOT,
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
        this.registerInfix(TokenType.AND, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.OR, this.parseInfixExpression.bind(this));

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

    parseStatement(): Statement | null {
        let lineNumber: number | undefined = undefined;

        // statements can start with numbers
        if (this.curToken.type === TokenType.INT) {
            lineNumber = parseInt(this.curToken.literal, 10);
            // consume the number
            this.nextToken();
        }

        const originalToken = this.curToken;
        let statements: (Statement | null)[] = [];
        while (1) {
            switch (this.curToken.type) {
                case TokenType.LET:
                    statements.push(this.parseLetStatement());
                    break;
                case TokenType.PRINT:
                    statements.push(this.parsePrintStatement());
                    break;
                case TokenType.RUN:
                    statements.push(new RunStatement(this.curToken));
                    break;
                case TokenType.INPUT:
                    statements.push(this.parseInputStatement());
                    break;
                case TokenType.GOTO:
                    statements.push(this.parseGotoStatement());
                    break;
                case TokenType.IF:
                    statements.push(this.parseIfStatement());
                    break;
                case TokenType.FOR:
                    statements.push(this.parseForStatement());
                    break;
                case TokenType.NEXT:
                    statements.push(this.parseNextStatement());
                    break;
                case TokenType.REM:
                    // skip rem statements
                    break;
                default:
                    // statements with no labels default to LET statements
                    statements.push(this.parseLetStatement());
            }

            this.nextToken();

            if (this.curTokenIs(TokenType.COLON)) {
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
        }

        return result;
    }

    parseLetStatement(): LetStatement | null {
        const letToken = this.curToken;

        // swallow the LET statement if its here, but it's optional
        if (this.curTokenIs(TokenType.LET)) {
            this.nextToken();
        }

        if (!this.curTokenIs(TokenType.IDENT)) {
            this.errors.push(
                `Expecting identifier but found ${this.curToken.type}`
            );
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

    parsePrintStatement(): Statement | null {
        const token = this.curToken;
        const args: (Expression | null)[] = [];

        // consume print
        this.nextToken();

        // consume the first argument
        args.push(this.parseExpression(Precedence.LOWEST));

        // consume additional arguments, if available
        while (
            !this.peekTokenIs(TokenType.COLON) &&
            !this.peekTokenIs(TokenType.EOF)
        ) {
            this.nextToken();
            args.push(this.parseExpression(Precedence.LOWEST));
        }

        return new PrintStatement(token, args.filter((a) => a) as Expression[]);
    }

    parseInputStatement(): Statement | null {
        const token = this.curToken;

        if (!this.peekTokenIs(TokenType.IDENT)) {
            return null;
        }

        // consume input
        this.nextToken();

        return new InputStatement(token, this.parseIdentifier());
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
        const right = this.parseExpression(
            token.type === TokenType.NOT
                ? Precedence.LOGICAL
                : Precedence.PREFIX
        );

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

    parseGotoStatement(): Statement | null {
        const token = this.curToken;

        if (!this.expectPeek(TokenType.INT)) {
            return null;
        }

        const dest = parseInt(this.curToken.literal, 10);
        if (isNaN(dest)) {
            this.errors.push(`invalid line number ${this.curToken.literal}`);
            return null;
        }

        return new GotoStatement(token, dest);
    }

    parseIfStatement(): Statement | null {
        const token = this.curToken;

        this.nextToken();

        const condition = this.parseExpression(Precedence.LOWEST);

        const statement = new IfStatement(token, condition);

        if (this.peekTokenIs(TokenType.GOTO)) {
            this.nextToken();

            if (!this.expectPeek(TokenType.INT)) {
                return null;
            }

            const nextLine = parseInt(this.curToken.literal, 10);
            if (isNaN(nextLine)) {
                this.errors.push(
                    `cannot goto a number that is not a number, ${this.curToken.literal}`
                );
                return null;
            }

            statement.goto = nextLine;
        } else if (this.peekTokenIs(TokenType.THEN)) {
            this.nextToken();

            if (this.peekTokenIs(TokenType.INT)) {
                // another goto!
                this.nextToken();
                const nextLine = parseInt(this.curToken.literal, 10);
                if (isNaN(nextLine)) {
                    this.errors.push(
                        `cannot goto a number that is not a number, ${this.curToken.literal}`
                    );
                    return null;
                }

                statement.then = nextLine;
            } else {
                this.nextToken();

                const then = this.parseStatement();
                if (then) {
                    statement.then = then;
                }
            }
        } else {
            this.errors.push(`IF must be followed by GOTO or THEN`);
            return null;
        }

        return statement;
    }

    parseForStatement(): Statement | null {
        const token = this.curToken;

        if (!this.expectPeek(TokenType.IDENT)) {
            return null;
        }

        const iterator = this.parseIdentifier();

        if (!this.expectPeek(TokenType.ASSIGN)) {
            return null;
        }

        this.nextToken();

        const from = this.parseExpression(Precedence.LOWEST);

        if (!this.expectPeek(TokenType.TO)) {
            return null;
        }

        this.nextToken();

        const to = this.parseExpression(Precedence.LOWEST);

        let step = null;

        if (this.peekTokenIs(TokenType.STEP)) {
            this.nextToken();
            this.nextToken();

            step = this.parseExpression(Precedence.LOWEST);
        }

        return new ForStatement(token, iterator, from, to, step);
    }

    parseNextStatement(): Statement | null {
        const token = this.curToken;
        const values: Identifier[] = [];

        if (this.peekTokenIs(TokenType.IDENT)) {
            this.nextToken();

            const v = this.parseIdentifier();
            if (v) {
                values.push(v);
            }

            while (this.peekTokenIs(TokenType.COMMA)) {
                this.nextToken();
                this.nextToken();

                const v = this.parseIdentifier();
                if (v) {
                    values.push(v);
                }
            }
        }

        return new NextStatement(token, values);
    }
}
