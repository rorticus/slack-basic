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
    save(filename: string, code: string): Promise<void> {
        return Promise.reject('not implemented');
    },
    load(filename: string): Promise<string> {
        return Promise.reject('not implemented');
    },
    createImage(width: number, height: number): Promise<BasicCanvas> {
        return Promise.reject('not implemented');
    },
    list(code: string) {
        console.log(code);
        return Promise.resolve();
    },
});

const run = async (code: string) => {
    const result = await context.runImmediateStatement(code);
    if (isError(result)) {
        console.log(result.toString());
    }

    return result;
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
