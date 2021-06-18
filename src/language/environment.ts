import { ValueObject } from "./object";

export class Environment {
    store: Map<string, ValueObject>;

    constructor() {
        this.store = new Map<string, ValueObject>();
    }

    get(name: string) {
        return this.store.get(name);
    }

    set(name: string, value: ValueObject) {
        this.store.set(name, value);
    }
}
