# MID$

```
MID$(<string>, <1. integer number - startchar>[, <2. integer number>])
```

---

**MID$** will be used for cutting strings into component parts inside strings beginning by the startchar (1. integer number) until to the indicated length number (2. integer number) from the left side to the right side. By using a wrong type of variable the BASIC-error TYPE MISMATCH appears.

An empty string (for example A$="") is returned when the 1. integer number is greater than the string or the 2. integer number is 0. If the 2. integer number is not set or is greater than the rest of the string, the whole rest of string will be returned.
