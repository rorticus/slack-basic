# GOTO
```
GOTO [<line>]
```
---

The BASIC command GOTO makes the BASIC interpreter branch to the indicated line and the execution of the BASIC program is continued at that line. In Commodore BASIC, legal line numbers are from 0 to 63999. Exceeding the upper limit leads to an ?SYNTAX ERROR. If the targeted line number doesn't exist, the BASIC error ?UNDEF'D STATEMENT ERROR occurs. A special case is the usage without a parameter which implicitly refers to line number 0.

The line number is expected to be a numeric constant consisting of digits only (possibly intermixed with spaces) until the first non-digit character. All the following characters until the end of the line are ignored and can be regarded as a comment.

GOTO can be used to construct infinite loops. The code sample 55 GOTO 55 won't terminate, but can be aborted manually by pushing RUN/STOP .
