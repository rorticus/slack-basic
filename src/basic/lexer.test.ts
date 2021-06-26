import { TokenType } from "./tokens";
import Lexer from "./lexer";

describe("Token Tests", () => {
    it("Gets the next token", () => {
        const input = `
        START:
        LET A = 3
        IF A < 4.5 THEN
            GOSUB DOTHING
        END
        `;

        const expectedTypes = [
            [TokenType.IDENT, "START"],
            [TokenType.COLON, ":"],
            [TokenType.LET, "LET"],
            [TokenType.IDENT, "A"],
            [TokenType.ASSIGN, "="],
            [TokenType.INT, "3"],
            [TokenType.IF, "IF"],
            [TokenType.IDENT, "A"],
            [TokenType.LT, "<"],
            [TokenType.FLOAT, "4.5"],
            [TokenType.THEN, "THEN"],
            [TokenType.GOSUB, "GOSUB"],
            [TokenType.IDENT, "DOTHING"],
            [TokenType.END, "END"],
            [TokenType.EOF, ""],
        ];

        const l = new Lexer(input);

        for (let i = 0; i < expectedTypes.length; i++) {
            const tok = l.nextToken();

            expect(tok.type).toEqual(expectedTypes[i][0]);
            expect(tok.literal).toEqual(expectedTypes[i][1]);
        }
    });
});
