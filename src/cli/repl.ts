import { BasicCanvas, Context } from '../basic/context';
import { Statement } from '../basic/ast';
import { Parser } from '../basic/parser';
import Lexer from '../basic/lexer';
import { isError } from '../basic/object';

const run = async (code: string) => {
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

    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const parser = new Parser(new Lexer(lines[i].trim()));
        const statement = parser.parseStatement();

        if (statement) {
            const result = await context.runImmediateStatement(statement);
            if (isError(result)) {
                console.log(result.toString());
            }
        }
    }
};

run(`
10 PRINT "hello" : GOTO 10
RUN
`);
