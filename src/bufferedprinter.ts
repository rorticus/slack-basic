export class BufferedPrinter {
    buffer: string[];
    printTimeout: NodeJS.Timeout | null;
    delay: number;
    say: ((message) => Promise<void>) | undefined;

    constructor() {
        this.buffer = [];
        this.printTimeout = null;
        this.delay = 500;
        this.say = undefined;
    }

    print(message: string) {
        this.buffer.push(message);

        if (this.printTimeout) {
            clearTimeout(this.printTimeout);
        }

        this.printTimeout = setTimeout(() => {
            const _ = this.flush();
            this.printTimeout = null;
        }, this.delay);

        return Promise.resolve();
    }

    async flush() {
        const lines = this.buffer;
        this.buffer = [];
        await this.say?.('```' + lines.join('\n') + '```');
    }
}
