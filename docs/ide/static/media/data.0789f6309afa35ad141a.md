# DATA
```
DATA <constant> [,<constant>]...
```
---

The BASIC-Command DATA is used to store constant information in the program code, and is used with the BASIC-command READ. Each DATA-line can contain one or more constants separated by commas. Expressions containing variables etc. will not be evaluated here.

The DATA values will be read from left to right, beginning with the first line containing a DATA statement. Each time a READ instruction is executed the saved DATA position of the last READ is advanced to the next value. Strings can be written normally or in quotes, but characters like comma, space, colon, graphical ones or control characters has to be written inside double quotes like string constants. The BASIC command RESTORE resets the pointer of the current DATA position the program start so that next READ will read from the first DATA found from the beginning of the program (starting with BASIC 3.5 the DATA line can be selected, too).