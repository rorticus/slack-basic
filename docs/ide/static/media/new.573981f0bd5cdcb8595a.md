# NEW

```
NEW
```

---

The BASIC command NEW releases the whole BASIC RAM and the stack of the C64. This way, BASIC program that eventually was stored in the memory will be deleted.

NEW can be used in programs, but after executing NEW, the program ends by being deleted. That is, using the BASIC command NEW in programs makes not much sense.

You should use NEW before writing a new BASIC program, because old program code can conflict with the new BASIC code and complicate debugging (eliminating program errors).
