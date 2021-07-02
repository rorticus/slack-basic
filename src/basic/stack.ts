import { ValueObject } from "../monkey/object";

export class Stack {
    private store: Map<string, ValueObject>;
    private readonly outer: Stack | null;

    constructor(outer: Stack | null = null) {
        this.store = new Map<string, ValueObject>();
        this.outer = outer;
    }

    get(name: string): ValueObject | undefined {
        const n = this.store.get(name);

        if (n === undefined && this.outer !== null) {
            return this.outer.get(name);
        }

        return n;
    }

    set(name: string, value: ValueObject) {
        this.store.set(name, value);
    }

    clear() {
        this.store.clear();
    }
}
