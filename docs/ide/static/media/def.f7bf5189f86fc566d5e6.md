# DEF
```
DEF FN <function name>(parameter name)=<mathematical expression>
```
---
The BASIC-command DEF defines a function with exactly one single numeric argument which can be executed with FN afterwards. The definition may contain any legitimate mathematical expression consisting of mathematical and logical operands, functions and variables which finally results in a numeric value. Functions, operands and system variables such as ABS(), AND, ATN(), ASC(), COS(), EXP(), FN<function name>(), FRE(), INT(), LEN() LOG(), NOT, PEEK(), POS(), OR, RND(), SGN(), SIN(), SQR(), STATUS (ST), TAN(), TIME (TI) or VAL() are possible.

The expression could use the parameter's variable name which acts as a placeholder for the actual value when called by FN. Except for the variable with the same name of the function argument, all other variables can still be accessed.

DEF only works within program code. The DEF declaration has to fit into a single line. Afterwards it can be called with the command FN<function name>(<numeric argument>). The function name follows the same rules as for variable names. It begins with one letter (A-Z) and might optionally followed by letters or digits (0-9), but only the first two characters are significant. If you redefine an already defined function with the same name, the first definition will be overwritten and the new definition is the valid one.