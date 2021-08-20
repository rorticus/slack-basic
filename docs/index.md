# SlackBasic

SlackBasic is a simple Commodore Basic 2.0 (with a few enhancements) interpretter built to run right inside slack.

## Running Commands

To get started, click on the app's homepage in your Slack menu and choose the Messages tab. Anything you type here will be sent directly to the SlackBasic interpretter.

```basic
PRINT "Hello, World."
```

## File Management

Files can be saved or loaded with the `SAVE` and `LOAD` commands. To remove files, head over to the _Homepage_ tab where you will find additional options.

## Programming Basics

Commands can be run in two modes, **Immediate** mode, and **Stored** mode.  

### Immediate Mode

When running a command in Immediate mode, it is run... immediately. Any command _that does not start with a line number_ is automatically run in immediate mode.  Note that some commands don't make sense to run in immediate mode. For example, you can't run a multi-line `FOR` loop in immediate mode as you are only allowed one line. You can, however, run a `FOR` loop that has been condensed to a single line.

```basic
FOR I = 0 TO 10 : PRINT I : NEXT
```

### Stored Mode

Any command entered that is preceded by a line number will be run in _Stored_ mode. In this mode, your commands are not executed, but simply stored for later execution using the immediate mode `RUN` command.

> Tip! You can use the `LIST` command at any time to list the contents of your stored program.

Lines in stored mode can be entered in any order and will automatically be sorted into ascending order after entered. For example,

```BASIC
10 FOR I = 0 TO 10
30 NEXT I
20 PRINT "Hello, World"
```

Is, although confusing, perfectly valid.  After entering this program and running a `LIST` you will see that the program has been properly sorted.

To replace an existing line number with new code, simply use the same line number again.

```BASIC
10 PRINT "Hello, Toad"
20 PRINT "Hello, World"
```

To insert a line in between two line numbers, you had better hope you left some padding in between the two line numbers, otherwise, lol, good luck.

### Commands

Most of the Basic 2.0 commands are supported, though with subtle changes where it made sense. For example, being a Slack app, there are no peripheral devices, so support for those was not even attempted.

| Keyword   | Fully Implemented | Partialy Implemented | Notes                                                                                                                    |     |
| --------- | ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ | --- |
| ABS       | X                 |                      |                                                                                                                          |     |
| AND       | X                 |                      |                                                                                                                          |     |
| ASC       | X                 |                      |                                                                                                                          |     |
| ATN       | X                 |                      |                                                                                                                          |     |
| CHR$      | X                 |                      |                                                                                                                          |     |
| CLOSE     |                   |                      | Not implemented. Opening files not supported.                                                                            |     |
| CLR       |                   | X                    | Does not support closing of open files, as files are not supported.                                                      |     |
| CMD       |                   |                      | Not implemented. Other devices are not supported.                                                                        |     |
| CONT      | X                 |                      |                                                                                                                          |     |
| COS       | X                 |                      |                                                                                                                          |     |
| DATA      |                   | X                    | Reserved words are not supported without quotes.                                                                         |     |
| DEF       | X                 |                      |                                                                                                                          |     |
| DIM       | X                 |                      |                                                                                                                          |     |
| END       | X                 |                      |                                                                                                                          |     |
| EXP       | X                 |                      |                                                                                                                          |     |
| FN        | X                 |                      |                                                                                                                          |     |
| FOR       | X                 |                      |                                                                                                                          |     |
| FRE       |                   |                      | Not implemented. So much memories!                                                                                       |     |
| GET       |                   |                      | Not implemented. Keyboard support is limited to input.                                                                   |     |
| GOSUB     | X                 |                      |                                                                                                                          |     |
| GOTO      | X                 |                      |                                                                                                                          |     |
| IF        | X                 |                      |                                                                                                                          |     |
| INPUT     | X                 |                      |                                                                                                                          |     |
| INT       | X                 |                      |                                                                                                                          |     |
| LEFT$     | X                 |                      |                                                                                                                          |     |
| LEN       | X                 |                      |                                                                                                                          |     |
| LET       | X                 |                      |                                                                                                                          |     |
| LIST      |                   | X                    | The returned program is the processed AST of your program, so some lines may be changed.                                 |     |
| LOAD      |                   | X                    | Only support for loading files, none of this device index nonsense.                                                      |     |
| LOG       | X                 |                      |                                                                                                                          |     |
| MID$      | X                 |                      |                                                                                                                          |     |
| NEW       | X                 |                      |                                                                                                                          |     |
| NEXT      | X                 |                      |                                                                                                                          |     |
| NOT       | X                 |                      |                                                                                                                          |     |
| ON        | X                 |                      |                                                                                                                          |     |
| OPEN      |                   |                      | Not implemented as peripherals are not implemented.                                                                      |     |
| OR        | X                 |                      |                                                                                                                          |     |
| PEEK      |                   |                      | Not implemented. No peeking.                                                                                             |     |
| π         |                   | X                    | Implemented as the keyword "PI"                                                                                          |     |
| POKE      |                   |                      | Not implemented. No poking!                                                                                              |     |
| POS       |                   |                      | Not implemented, no cursor.                                                                                              |     |
| PRINT     | X                 |                      |                                                                                                                          |     |
| READ      | X                 |                      |                                                                                                                          |     |
| REM       | X                 |                      |                                                                                                                          |     |
| RESTORE   | X                 |                      |                                                                                                                          |     |
| RETURN    | X                 |                      |                                                                                                                          |     |
| RIGHT$    | X                 |                      |                                                                                                                          |     |
| RND       |                   | X                    | Passing a negative number is not supported, nor is using the system clock as the seed.                                   |     |
| RUN       | X                 |                      |                                                                                                                          |     |
| SAVE      |                   | X                    | Only saving to files is supported.                                                                                       |     |
| SGN       | X                 |                      |                                                                                                                          |     |
| SIN       | X                 |                      |                                                                                                                          |     |
| SPC       | X                 |                      |                                                                                                                          |     |
| SQR       | X                 |                      |                                                                                                                          |     |
| STATUS/ST |                   |                      | Not implemented, no peripherals                                                                                          |     |
| STEP      | X                 |                      |                                                                                                                          |     |
| STOP      | X                 |                      |                                                                                                                          |     |
| STR$      | X                 |                      |                                                                                                                          |     |
| SYS       |                   |                      | Not implemented.                                                                                                         |     |
| TAB       |                   |                      | Not implemented, no cursor.                                                                                              |     |
| TAN       | X                 |                      |                                                                                                                          |     |
| THEN      | X                 |                      |                                                                                                                          |     |
| TIME/TI   |                   | X                    | TIME / TI returns current system time in jiffies. TIME$ / TI$ returns current system time as string. Time cannot be set. |     |
| TO        | X                 |                      |                                                                                                                          |     |
| USR       |                   |                      | Machine language not implemented.                                                                                        |     |
| VAL       |                   |                      |                                                                                                                          |     |
| VERIFY    |                   |                      | Not implemented.                                                                                                         |     |
| WAIT      |                   |                      | Not implemented. Access to memory restricted.                                                                            |     |

