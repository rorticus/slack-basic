# IF
```
IF <equation> THEN <linenumber> 
    or IF <equation> GOTO <linenumber> 
    or IF <equation> THEN <command>
```
---

The BASIC command IF is used to test a "condition". If the condition produces a non-zero value, the statements after the THEN or GOTO are performed. When the condition is false then the BASIC interpreter will ignore the rest of the BASIC commands in the line.

For the condition the following relational operators are useful:
- = equal
- <> unequal
- < less than
- &gt; greater
- <= less-equal
- &gt;= greater-equal

Furthermore, logical operators like AND, OR or NOT can be used to combine several conditions, and parentheses () to override precedence order.
When the command is GOTO, GOSUB or THEN <line>, the system will perform a branch. The performance of branches gets progressively worse as the program size grows. This can be addressed to some degree by understanding the line-lookup process.