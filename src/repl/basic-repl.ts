import Lexer from "../basic/lexer";
import { Parser } from "../basic/parser";
import { Context } from "../basic/context";
import readlineSync from "readline-sync";
import { ObjectType } from "../basic/object";

console.log("Welcome to the BASIC 2.0 REPL!");
console.log("");

async function repl() {
    const context = new Context({
        print: async (str) => console.log(str),
        input: () => Promise.resolve(readlineSync.question()),
    });

    while (1) {
        const line = readlineSync.question("> ");

        if (line === "exit") {
            break;
        } else {
            const lexer = new Lexer(line);
            const parser = new Parser(lexer);

            const statement = parser.parseStatement();
            if (parser.errors.length > 0) {
                console.log(parser.errors);
            } else if (statement) {
                const result = await context.runImmediateStatement(statement);

                if (result.type() === ObjectType.ERROR_OBJ) {
                    console.error(result.inspect());
                }
            }
        }
    }
}

repl();
