# RUN
```
RUN [<line number>]
```
---

The BASIC command RUN starts a BASIC program. When no line number is given, the program will be started at the first line number. By starting with RUN the stack is deleted, while the BASIC command CLR is executed automatically in the background.

When RUN is given a line number, it will start the program at this line number. If this line number does not exist, the BASIC error message ?UNDEF'D STATEMENT ERROR IN line will be reported.

RUN can be used in BASIC programs.

The program keeps running until the last line is reached, the commands END, NEW or STOP are executed, the key <RUN/STOP> is pushed or a BASIC error occurs.

Stopped programs can be restarted and continued without deleting the stack using CONT or GOTO [<line number].
