import * as readline from "readline";
import Lexer from "../monkey/lexer";
import {TokenType} from "../monkey/tokens";
import {Parser} from "../monkey/parser";
import {Program} from "../monkey/ast";
import {languageEval} from "../monkey/evaluator";
import {Environment} from "../monkey/environment";
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
