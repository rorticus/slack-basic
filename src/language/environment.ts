import { ValueObject } from "./object";

export class Environment {
    store: Map<string, ValueObject>;
    private outer: Environment | null;

    constructor(outer: Environment | null = null) {
        this.store = new Map<string, ValueObject>();
        this.outer = outer;
    }

    get(name: string): ValueObject | undefined {
        const n = this.store.get(name);

        if(n === undefined && this.outer !== null) {
            return this.outer.get(name);
        }

        return n;
    }

    set(name: string, value: ValueObject) {
        this.store.set(name, value);
    }
}
