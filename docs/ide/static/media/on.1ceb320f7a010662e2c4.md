# ON
```
ON <index> GOSUB|GOTO <line>[,<line>...]
```
---

In Commodore BASIC V2, the command ON is part of a structure which jumps to a specific line in the given list of BASIC <line> numbers, either as an unconditional GOTO or as a subroutine call through GOSUB. If <index> (which must be either a floating point or integer expression) equals 1, the first <line> on the list is taken, if <index> equates to 2, the second line number is taken.

If the numerical <index> expression evaluates to a non-integer result, ON will round it down to nearest lower integer, as if the INT function had been used on the result; e.g. an <index> of 2.2 resolves to 2, and so the second line number on the list is taken.

If the <index> expression, after eventual rounding, exceeds the count of line numbers given, ON does not GOTO or GOSUB anywhere, and program execution continues with the subsequent command.
