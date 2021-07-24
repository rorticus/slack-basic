import Lexer from "../basic/lexer";
import { Parser } from "../basic/parser";
import { BasicCanvas, Context } from "../basic/context";
import readlineSync from "readline-sync";
import { ObjectType } from "../basic/object";

console.log("Welcome to the BASIC 2.0 REPL!");
console.log("");

async function repl() {
    const context = new Context({
        print: async (str) => console.log(str),
        input: () => Promise.resolve(readlineSync.question()),
        load: () => {
            throw "not implemented";
        },
        save: () => {
            throw "note implemented";
        },
        createImage(width: number, height: number): Promise<BasicCanvas> {
            let data = Array(width * height);
            for (let i = 0; i < width * height; i++) {
                data[i] = 0;
            }

            return Promise.resolve({
                width,
                height,
                setPixel: (x, y, color) => {
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        data[Math.floor(y) * width + Math.floor(x)] = color;
                    }
                },
                getPixel: (x, y) => data[Math.floor(y) * width + Math.floor(x)],
                clear: (color) =>
                    data.forEach((_, index) => (data[index] = color)),
            });
        },
    });

    while (1) {
        const line = readlineSync.question("> ");

        if (line === "exit") {
            break;
        } else if (line === "image") {
            const canvas = context.image;
            if (canvas) {
                for (let y = 0; y < canvas.height; y++) {
                    let pixels: string[] = [];
                    for (let x = 0; x < canvas.width; x++) {
                        pixels.push(canvas.getPixel(x, y) > 0 ? "X" : " ");
                    }
                    console.log(pixels.join(""));
                }
            }
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
