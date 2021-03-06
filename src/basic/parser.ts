import Lexer from './lexer';
import { Token, TokenType } from './tokens';
import {
    BoxStatement,
    CallExpression,
    ClrStatement,
    CompoundStatement,
    ContStatement,
    DataStatement,
    DefStatement,
    DimStatement,
    DimVariable,
    DrawStatement,
    EmptyStatement,
    EndStatement,
    Expression,
    FloatLiteral,
    ForStatement,
    GosubStatement,
    GotoStatement,
    GraphicsStatement,
    GroupedExpression,
    Identifier,
    IfStatement,
    InfixExpression,
    InputStatement,
    IntegerLiteral,
    LetAssignment,
    LetStatement,
    ListStatement,
    LoadStatement,
    NewStatement,
    NextStatement,
    OnStatement,
    PrefixExpression,
    PrintStatement,
    ReadStatement,
    RemStatement,
    RestoreStatement,
    ReturnStatement,
    RunStatement,
    SaveStatement,
    Statement,
    StopStatement,
    StringLiteral,
} from './ast';

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
    CALL,
    INDEX,
}

const precedences: Record<string, Precedence> = {
    [TokenType.ASSIGN]: Precedence.EQUALS,
    [TokenType.NOT_EQ]: Precedence.EQUALS,
    [TokenType.LT]: Precedence.LESSGREATER,
    [TokenType.GT]: Precedence.LESSGREATER,
    [TokenType.LTE]: Precedence.LESSGREATER,
    [TokenType.GTE]: Precedence.LESSGREATER,
    [TokenType.PLUS]: Precedence.SUM,
    [TokenType.MINUS]: Precedence.SUM,
    [TokenType.ASTERISK]: Precedence.PRODUCT,
    [TokenType.SLASH]: Precedence.PRODUCT,
    [TokenType.EXP]: Precedence.PRODUCT,
    [TokenType.AND]: Precedence.LOGICAL,
    [TokenType.OR]: Precedence.LOGICAL,
    [TokenType.NOT]: Precedence.LOGICAL,
    [TokenType.LPAREN]: Precedence.CALL,
    [TokenType.MOD]: Precedence.PRODUCT,
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
            this.parseStringLiteral.bind(this),
        );
        this.registerPrefix(
            TokenType.MINUS,
            this.parsePrefixExpression.bind(this),
        );
        this.registerPrefix(
            TokenType.LPAREN,
            this.parseGroupedExpression.bind(this),
        );
        this.registerPrefix(
            TokenType.NOT,
            this.parsePrefixExpression.bind(this),
        );
        this.registerPrefix(
            TokenType.FN,
            this.parsePrefixExpression.bind(this),
        );
        this.registerInfix(
            TokenType.PLUS,
            this.parseInfixExpression.bind(this),
        );
        this.registerInfix(TokenType.MOD, this.parseInfixExpression.bind(this));
        this.registerInfix(
            TokenType.MINUS,
            this.parseInfixExpression.bind(this),
        );
        this.registerInfix(
            TokenType.SLASH,
            this.parseInfixExpression.bind(this),
        );
        this.registerInfix(
            TokenType.ASTERISK,
            this.parseInfixExpression.bind(this),
        );
        this.registerInfix(TokenType.EXP, this.parseInfixExpression.bind(this));
        this.registerInfix(
            TokenType.ASSIGN,
            this.parseInfixExpression.bind(this),
        );
        this.registerInfix(
            TokenType.NOT_EQ,
            this.parseInfixExpression.bind(this),
        );
        this.registerInfix(TokenType.LT, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.GT, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.LTE, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.GTE, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.AND, this.parseInfixExpression.bind(this));
        this.registerInfix(TokenType.OR, this.parseInfixExpression.bind(this));
        this.registerInfix(
            TokenType.LPAREN,
            this.parseCallExpression.bind(this),
        );

        // read the two tokens to fill our buffer
        this.nextToken();
        this.nextToken();
    }

    pushError(message: string) {
        this.errors.push(`Column ${this.curToken.column} - ${message}`);
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
        this.pushError(
            `expected next token to be ${t}, got ${this.peekToken.type} instead`,
        );
    }

    noPrefixParseFnError(tokenType: TokenType) {
        this.pushError(`no prefix parse function available for ${tokenType}`);
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
        let lineNumberToken: Token | undefined = undefined;

        // statements can start with numbers
        if (this.curToken.type === TokenType.INT) {
            lineNumberToken = this.curToken;
            lineNumber = parseInt(this.curToken.literal, 10);
            // consume the number
            this.nextToken();
        }

        const originalToken = this.curToken;
        const statements: (Statement | null)[] = [];
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
                    statements.push(new RemStatement(this.curToken));
                    break;
                case TokenType.RETURN:
                    statements.push(new ReturnStatement(this.curToken));
                    break;
                case TokenType.GOSUB:
                    statements.push(this.parseGosubStatement());
                    break;
                case TokenType.CLR:
                    statements.push(new ClrStatement(this.curToken));
                    break;
                case TokenType.DATA:
                    statements.push(this.parseDataStatement());
                    break;
                case TokenType.READ:
                    statements.push(this.parseReadStatement());
                    break;
                case TokenType.RESTORE:
                    statements.push(new RestoreStatement(this.curToken));
                    break;
                case TokenType.DEF:
                    statements.push(this.parseDefStatement());
                    break;
                case TokenType.DIM:
                    statements.push(this.parseDimStatement());
                    break;
                case TokenType.END:
                    statements.push(new EndStatement(this.curToken));
                    break;
                case TokenType.CONT:
                    statements.push(new ContStatement(this.curToken));
                    break;
                case TokenType.LIST:
                    statements.push(this.parseListStatement());
                    break;
                case TokenType.LOAD:
                    statements.push(this.parseLoadStatement());
                    break;
                case TokenType.SAVE:
                    statements.push(this.parseSaveStatement());
                    break;
                case TokenType.NEW:
                    statements.push(new NewStatement(this.curToken));
                    break;
                case TokenType.ON:
                    statements.push(this.parseOnStatement());
                    break;
                case TokenType.STOP:
                    statements.push(new StopStatement(this.curToken));
                    break;
                case TokenType.GRAPHICS:
                    statements.push(this.parseGraphicsStatement());
                    break;
                case TokenType.DRAW:
                    statements.push(this.parseDrawStatement());
                    break;
                case TokenType.BOX:
                    statements.push(this.parseBoxStatement());
                    break;
                case TokenType.EOF:
                    statements.push(new EmptyStatement(this.curToken));
                    break;
                default:
                    // statements with no labels default to LET statements
                    statements.push(this.parseLetStatement());
            }

            this.nextToken();

            if (this.curTokenIs(TokenType.COLON)) {
                this.nextToken();
            } else if (this.curTokenIs(TokenType.EOF)) {
                break;
            } else {
                this.pushError(
                    'unexpected token ' +
                        this.curToken.type +
                        '. expected end of line or compound statement',
                );
                break;
            }
        }

        const result =
            statements.length > 1
                ? new CompoundStatement(
                      originalToken,
                      statements.filter((s) => s !== null) as Statement[],
                  )
                : statements[0];

        if (result) {
            result.lineNumber = lineNumber;
            result.lineNumberToken = lineNumberToken;
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
            this.pushError(
                `Expecting identifier but found ${this.curToken.type}`,
            );
            return null;
        }

        const parseLetAssignment = () => {
            const ident = this.parseIdentifier();

            if (!ident) {
                return null;
            }

            // this is an index expression
            if (this.peekTokenIs(TokenType.LPAREN)) {
                this.nextToken();

                const indices = this.parseExpressionList(TokenType.RPAREN);

                return {
                    name: ident,
                    indices,
                };
            }

            return { name: ident, indices: [] };
        };

        const names: LetAssignment[] = [];

        const first = parseLetAssignment();
        if (first) {
            names.push(first);
        }

        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken();
            this.nextToken();
            const name = parseLetAssignment();
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

        // consume additional arguments, if available
        while (
            !this.peekTokenIs(TokenType.COLON) &&
            !this.peekTokenIs(TokenType.EOF) &&
            !this.peekTokenIs(TokenType.ELSE)
        ) {
            if (
                this.peekTokenIs(TokenType.COMMA) ||
                this.peekTokenIs(TokenType.SEMICOLON)
            ) {
                this.nextToken();
                continue;
            }

            this.nextToken();

            args.push(this.parseExpression(Precedence.LOWEST));
        }

        return new PrintStatement(token, args.filter((a) => a) as Expression[]);
    }

    parseInputStatement(): Statement | null {
        const token = this.curToken;
        let message: Expression | null = null;
        const destinations: Identifier[] = [];

        if (this.peekTokenIs(TokenType.STRING)) {
            // there is a message!
            this.nextToken();
            message = this.parseStringLiteral();

            if (!this.expectPeek(TokenType.SEMICOLON)) {
                return null;
            }
        }

        if (!this.peekTokenIs(TokenType.IDENT)) {
            this.pushError(`expected identifier`);
            return null;
        }

        this.nextToken();
        destinations.push(this.parseIdentifier());

        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken();
            this.nextToken();

            destinations.push(this.parseIdentifier());
        }

        return new InputStatement(token, message, destinations);
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
            this.pushError(
                `could not parse "${this.curToken.literal}" as integer`,
            );
            return null;
        }

        return new IntegerLiteral(this.curToken, value);
    }

    parseFloatLiteral(): Expression | null {
        const value = parseFloat(this.curToken.literal);
        if (isNaN(value)) {
            this.pushError(
                `could not parse "${this.curToken.literal}" as float`,
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
                : Precedence.PREFIX,
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
            this.parseExpression(precedence),
        );
    }

    parseGroupedExpression(): Expression | null {
        const startParenToken = this.curToken;
        this.nextToken();

        const exp = this.parseExpression(Precedence.LOWEST);

        const endParenToken = this.curToken;
        if (!this.expectPeek(TokenType.RPAREN)) {
            return null;
        }

        return new GroupedExpression(startParenToken, exp, endParenToken);
    }

    parseGotoStatement(): Statement | null {
        const token = this.curToken;

        if (!this.expectPeek(TokenType.INT)) {
            return null;
        }

        const dest = parseInt(this.curToken.literal, 10);
        if (isNaN(dest)) {
            this.pushError(`invalid line number ${this.curToken.literal}`);
            return null;
        }

        return new GotoStatement(token, dest, this.curToken);
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
                this.pushError(
                    `cannot goto a number that is not a number, ${this.curToken.literal}`,
                );
                return null;
            }

            statement.goto = nextLine;
            statement.gotoToken = this.curToken;

            this.nextToken();
        } else if (this.peekTokenIs(TokenType.THEN)) {
            this.nextToken();

            if (this.peekTokenIs(TokenType.INT)) {
                // another goto!
                this.nextToken();
                const nextLine = parseInt(this.curToken.literal, 10);
                if (isNaN(nextLine)) {
                    this.pushError(
                        `cannot goto a number that is not a number, ${this.curToken.literal}`,
                    );
                    return null;
                }

                statement.then = nextLine;
                statement.thenToken = this.curToken;

                this.nextToken();
            } else {
                this.nextToken();

                const curToken = this.curToken;
                const then = this.parseStatement();
                if (then) {
                    statement.then = then;
                }
            }
        } else {
            this.pushError(
                `IF must be followed by GOTO or THEN, found ${this.peekToken.literal}`,
            );
            return null;
        }

        if (this.curTokenIs(TokenType.ELSE)) {
            statement.elseToken = this.curToken;

            if (this.peekTokenIs(TokenType.INT)) {
                this.nextToken();

                const lineNumber = parseInt(this.curToken.literal, 10);
                if (isNaN(lineNumber) || lineNumber < 0) {
                    this.pushError(
                        `Invalid line number in else statement ${this.curToken.literal}`,
                    );
                    return null;
                }
                statement.elseGoto = lineNumber;
                statement.elseGotoToken = this.curToken;
            } else {
                this.nextToken();

                const elseStatement = this.parseStatement();
                if (!elseStatement) {
                    this.pushError(`ELSE without statement`);
                    return null;
                }

                statement.elseThen = elseStatement;
            }
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

    parseGosubStatement(): Statement | null {
        const token = this.curToken;

        if (!this.expectPeek(TokenType.INT)) {
            return null;
        }

        const target = this.parseIntegerLiteral();
        if (!target) {
            return null;
        }

        return new GosubStatement(
            token,
            (target as IntegerLiteral).value,
            this.curToken,
        );
    }

    parseCallExpression(fn: Expression | null): CallExpression {
        return new CallExpression(
            this.curToken,
            fn!,
            this.parseExpressionList(TokenType.RPAREN),
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

    parseDataStatement() {
        const token = this.curToken;
        const datas: Expression[] = [];

        while (
            !this.peekTokenIs(TokenType.EOF) &&
            !this.peekTokenIs(TokenType.COLON)
        ) {
            if (
                this.peekTokenIs(TokenType.COMMA) ||
                this.peekTokenIs(TokenType.SEMICOLON)
            ) {
                this.nextToken();
                continue;
            }

            this.nextToken();

            const d = this.parseExpression(Precedence.LOWEST);
            if (d) {
                if (
                    !(d instanceof IntegerLiteral) &&
                    !(d instanceof FloatLiteral) &&
                    !(d instanceof StringLiteral) &&
                    !(d instanceof Identifier) &&
                    !(
                        d instanceof PrefixExpression &&
                        d.operator === '-' &&
                        (d.right instanceof IntegerLiteral ||
                            d.right instanceof FloatLiteral)
                    )
                ) {
                    this.pushError(
                        'invalid data value, must be an number, string, or non-reserved keyword.',
                    );
                    return null;
                }
                datas.push(d);
            }
        }

        return new DataStatement(token, datas);
    }

    parseReadStatement() {
        const token = this.curToken;
        const outputs: LetAssignment[] = [];

        while (
            !this.peekTokenIs(TokenType.EOF) &&
            !this.peekTokenIs(TokenType.COLON)
        ) {
            this.nextToken();

            const d = this.parseExpression(Precedence.CALL);

            if (!d || !(d instanceof Identifier)) {
                this.pushError(`can only READ into identifiers, not ${d}`);
                return null;
            }

            // this is an index expression
            if (this.peekTokenIs(TokenType.LPAREN)) {
                this.nextToken();

                const indices = this.parseExpressionList(TokenType.RPAREN);

                outputs.push({
                    name: d,
                    indices,
                });
            } else {
                outputs.push({ name: d, indices: [] });
            }

            if (this.peekTokenIs(TokenType.COMMA)) {
                this.nextToken();
            }
        }

        return new ReadStatement(token, outputs);
    }

    parseDefStatement() {
        const token = this.curToken;

        if (!this.expectPeek(TokenType.FN)) {
            return null;
        }

        this.nextToken();

        const name = this.parseIdentifier();
        if (name === null) {
            return null;
        }

        if (!this.expectPeek(TokenType.LPAREN)) {
            return null;
        }

        let argument: Identifier | null = null;

        if (this.peekTokenIs(TokenType.IDENT)) {
            this.nextToken();

            argument = this.parseIdentifier();
        }

        if (!this.expectPeek(TokenType.RPAREN)) {
            return null;
        }

        if (!this.expectPeek(TokenType.ASSIGN)) {
            return null;
        }

        this.nextToken();

        const body = this.parseExpression(Precedence.LOWEST);
        if (body === null) {
            return null;
        }

        return new DefStatement(token, name, argument, body);
    }

    parseDimStatement() {
        const vars: DimVariable[] = [];
        const token = this.curToken;

        this.nextToken();

        const parseDimVariable = () => {
            const dimensions: Expression[] = [];

            const ident = this.parseIdentifier();
            if (!ident) {
                return null;
            }

            if (!this.expectPeek(TokenType.LPAREN)) {
                return null;
            }

            this.nextToken();

            const firstDim = this.parseExpression(Precedence.LOWEST);
            if (!firstDim) {
                this.pushError(`expecting at least one dimension`);
                return null;
            }

            dimensions.push(firstDim);

            while (this.peekTokenIs(TokenType.COMMA)) {
                this.nextToken();
                this.nextToken();

                const dim = this.parseExpression(Precedence.LOWEST);
                if (!dim) {
                    this.pushError(`expecting dimension after comma`);
                    return null;
                }

                dimensions.push(dim);
            }

            if (!this.expectPeek(TokenType.RPAREN)) {
                return null;
            }

            return {
                name: ident,
                dimensions,
            };
        };

        // parse the first one
        const first = parseDimVariable();

        if (!first) {
            this.pushError(`expecting at least one dimension variable`);
            return null;
        }

        vars.push(first);
        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken();
            this.nextToken();

            const v = parseDimVariable();
            if (v) {
                vars.push(v);
            }
        }

        return new DimStatement(token, vars);
    }

    parseListStatement() {
        const token = this.curToken;
        let startLine: Expression | null = null;
        let endLine: Expression | null = null;

        if (this.peekTokenIs(TokenType.INT)) {
            // has at least one line
            this.nextToken();
            startLine = this.parseIntegerLiteral();

            if (this.peekTokenIs(TokenType.MINUS)) {
                this.nextToken();

                if (this.peekTokenIs(TokenType.INT)) {
                    this.nextToken();
                    endLine = this.parseIntegerLiteral();
                }
            } else {
                endLine = startLine;
            }
        } else if (this.peekTokenIs(TokenType.MINUS)) {
            // just has an end line
            this.nextToken();
            if (!this.expectPeek(TokenType.INT)) {
                return null;
            }

            endLine = this.parseIntegerLiteral();
        }

        return new ListStatement(token, startLine, endLine);
    }

    parseLoadStatement() {
        const token = this.curToken;

        this.nextToken();

        const filename = this.parseExpression(Precedence.LOWEST);

        if (filename) {
            return new LoadStatement(token, filename);
        } else {
            this.pushError('expected filename');
            return null;
        }
    }

    parseSaveStatement() {
        const token = this.curToken;

        this.nextToken();

        const filename = this.parseExpression(Precedence.LOWEST);

        if (filename) {
            return new SaveStatement(token, filename);
        } else {
            this.pushError('expected filename');
            return null;
        }
    }

    parseOnStatement() {
        const token = this.curToken;

        this.nextToken();

        const condition = this.parseExpression(Precedence.LOWEST);
        if (!condition) {
            return null;
        }

        if (
            !this.peekTokenIs(TokenType.GOSUB) &&
            !this.peekTokenIs(TokenType.GOTO)
        ) {
            this.pushError(`expecting gosub or goto`);
            return null;
        }

        this.nextToken();

        const operation = this.curToken;

        this.nextToken();

        const destinations = [];

        const first = this.parseExpression(Precedence.LOWEST);

        if (!first) {
            this.pushError('expected at least one line number');
            return null;
        }

        destinations.push(first);
        while (this.peekTokenIs(TokenType.COMMA)) {
            this.nextToken();
            this.nextToken();

            const next = this.parseExpression(Precedence.LOWEST);
            if (next) {
                destinations.push(next);
            }
        }

        return new OnStatement(token, condition, operation, destinations);
    }

    parseGraphicsStatement() {
        const token = this.curToken;

        this.nextToken();

        const width = this.parseExpression(Precedence.LOWEST);
        if (!width) {
            this.pushError('expected expression');
            return null;
        }

        if (!this.expectPeek(TokenType.COMMA)) {
            return null;
        }

        this.nextToken();

        const height = this.parseExpression(Precedence.LOWEST);
        if (!height) {
            this.pushError('expected expression');
            return null;
        }

        return new GraphicsStatement(token, width, height);
    }

    parseDrawStatement() {
        const token = this.curToken;

        this.nextToken();

        const color = this.parseExpression(Precedence.LOWEST);
        if (!color) {
            this.pushError('expected color');
            return null;
        }

        if (!this.expectPeek(TokenType.COMMA)) {
            return null;
        }
        this.nextToken();

        const x1 = this.parseExpression(Precedence.LOWEST);
        if (!x1) {
            this.pushError('expected x1');
            return null;
        }

        if (!this.expectPeek(TokenType.COMMA)) {
            return null;
        }
        this.nextToken();

        const y1 = this.parseExpression(Precedence.LOWEST);
        if (!y1) {
            return null;
        }

        let x2: Expression | null = null;
        let y2: Expression | null = null;

        if (this.peekTokenIs(TokenType.TO)) {
            this.nextToken();
            this.nextToken();

            x2 = this.parseExpression(Precedence.LOWEST);
            if (!x2) {
                this.pushError('expected x2');
            }

            if (!this.expectPeek(TokenType.COMMA)) {
                return null;
            }
            this.nextToken();

            y2 = this.parseExpression(Precedence.LOWEST);
            if (!y2) {
                this.pushError('expected y2');
            }
        }

        return new DrawStatement(token, color, x1, y1, x2, y2);
    }

    parseBoxStatement() {
        const token = this.curToken;

        this.nextToken();

        const color = this.parseExpression(Precedence.LOWEST);
        if (!color) {
            this.pushError('expecting color');
            return null;
        }

        if (!this.expectPeek(TokenType.COMMA)) {
            return null;
        }
        this.nextToken();

        const left = this.parseExpression(Precedence.LOWEST);
        if (!left) {
            this.pushError('expecting left');
            return null;
        }

        if (!this.expectPeek(TokenType.COMMA)) {
            return null;
        }
        this.nextToken();

        const top = this.parseExpression(Precedence.LOWEST);
        if (!top) {
            this.pushError('expecting top');
            return null;
        }

        if (!this.expectPeek(TokenType.COMMA)) {
            return null;
        }
        this.nextToken();

        const width = this.parseExpression(Precedence.LOWEST);
        if (!width) {
            this.pushError('expecting width');
            return null;
        }

        if (!this.expectPeek(TokenType.COMMA)) {
            return null;
        }
        this.nextToken();

        const height = this.parseExpression(Precedence.LOWEST);
        if (!height) {
            this.pushError('expecting height');
            return null;
        }

        return new BoxStatement(token, color, left, top, width, height);
    }
}
