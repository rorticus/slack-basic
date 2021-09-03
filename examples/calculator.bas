10 INPUT "Enter the first number"; N1
20 INPUT "Enter the operator (+, -, /, *)"; OP$
30 INPUT "Enter the second number"; N2
40 IF OP$ = "+" THEN RESULT = N1 + N2
50 IF OP$ = "-" THEN RESULT = N1 - N2
60 IF OP$ = "*" THEN RESULT = N1 * N2
70 IF OP$ = "/" THEN RESULT = N1 / N2
80 PRINT "The result is "; RESULT
