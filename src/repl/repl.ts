import * as readline from "readline";
import Lexer from "../language/lexer";
import {TokenType} from "../language/tokens";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("Welcome to the Monkey REPL!");
console.log("");

async function promptLine(): Promise<string> {
    return new Promise((resolve) => {
        rl.question("> ", (answer: string) => {
            resolve(answer);
        });
    });
}

async function repl() {
    while (1) {
        const line = await promptLine();

        if (line === "exit") {
            break;
        } else {
            const lexer = new Lexer(line);
            while (1) {
                const tok = lexer.nextToken();
                if(tok.type === TokenType.EOF) {
                    break;
                }

                console.log(tok.type);
            }
        }
    }
}

const _ = repl();
