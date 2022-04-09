# REM
```
REM [<text>]
```
---

The BASIC command REM is used to place remarks into BASIC programs. The BASIC interpreter ignores all following text until the end of the line (even if it contains BASIC commands). Using this command a program can be enriched with further explanation on how the code works and what variable names and line numbers really mean. Blocks of remarks are useful to structure and separate the program and subroutines in visual blocks to make the listing more readable and keep it maintainable. Remarks are also a valuable tool for debugging purposes. Code lines may be commented in and out to quickly select different implementations for a task.

REM comments will be listed and printed, but this command has no effect on the program logic. However, using REM and any associated following text still takes up space in RAM and this needs to be taken in account when remaining available memory is tight. Also, depending on where the remarks are located the performance of the running program may suffer notably.
