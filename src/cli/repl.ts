import { BasicCanvas, Context } from '../basic/context';
import { Statement } from '../basic/ast';
import { Parser } from '../basic/parser';
import Lexer from '../basic/lexer';
import { isError } from '../basic/object';
import * as readLineSync from 'readline-sync';

const context = new Context({
    print(str: string): Promise<void> {
        console.log(str);
        return Promise.resolve();
    },
    input(message?: string): Promise<string> {
        return Promise.resolve('');
    },
    save(filename: string, statements: Statement[]): Promise<void> {
        return Promise.reject('not implemented');
    },
    load(filename: string): Promise<Statement[]> {
        return Promise.reject('not implemented');
    },
    createImage(width: number, height: number): Promise<BasicCanvas> {
        return Promise.reject('not implemented');
    },
});

const run = async (code: string) => {
    const parser = new Parser(new Lexer(code.trim()));
    const statement = parser.parseStatement();

    if (statement) {
        const result = await context.runImmediateStatement(statement);
        if (isError(result)) {
            console.log(result.toString());
        }

        return result;
    }

    return null;
};

async function main() {
    while (1) {
        const line = readLineSync.question('> ');
        if (line === 'exit') {
            return;
        }

        const result = await run(line);

        
        if (result) {
            console.log(result.toString());
        }
    }
}

main();
