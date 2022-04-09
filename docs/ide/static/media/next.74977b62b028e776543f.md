# NEXT
```
NEXT [[<Variable>[,<Variable>…]]
```
---

The BASIC command NEXT is used with the BASIC command FOR. NEXT denotes the "end" of a FOR…TO…STEP…NEXT loop construction and is usually paired with a corresponding FOR statement. It is not necessarily the end of the loop block, furthermore the statement could appear multiple times at any place. The inclusion of the loop variable after NEXT isn't necessary if referring to the inner-most loop. FOR-NEXT loops could be nested and with a single NEXT multiple loops could be closed by stating a comma-separated list of loop variables as NEXT parameters. An explicitly given variable name would force to abandon all nested and still open FOR loops, which might help in difficult structured program flows to ensure a safe program execution.

If a loop is left by GOTO the loop's administrative stack-frame remains on the stack, but will be reused if the a FOR with the same loop variable is entered (which also would remove all open nested FOR loops). 
