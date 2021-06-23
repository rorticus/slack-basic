import * as readline from "readline";
import Lexer from "../language/lexer";
import {TokenType} from "../language/tokens";
import {Parser} from "../language/parser";
import {Program} from "../language/ast";
import {languageEval} from "../language/evaluator";
import {Environment} from "../language/environment";
import readlineSync from "readline-sync";

console.log("Welcome to the Monkey REPL!");
console.log("");

function repl() {
    const env = new Environment();

    while (1) {
        const line = readlineSync.question("> ");

        if (line === "exit") {
            break;
        } else {
            const lexer = new Lexer(line);
            const parser = new Parser(lexer);
            const program = parser.parseProgram();

            const result = languageEval(program, env);

            console.log(result?.inspect());
        }
    }
}

repl();
