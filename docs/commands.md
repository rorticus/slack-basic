# Commands

Most of the Basic 2.0 commands are supported, though with subtle changes where it made sense. For example, being a Slack app, there are no peripheral devices, so support for those was not even attempted.

## Classic Commands

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


## Graphics Commands

In addition to the classic C64 Basic 2.0 commands, a handful of graphical commands / functions have been added in order to produce rad graphics to impress your friends.

`GRAPHICS width, height` - Initialize the graphics context to a certain size.

`DRAW color, x, y, [x2, y2]` - Draw a pixel or a line. If `x2, y2` is not provided, a single pixel is drawn. Otherwise, a line is drawn.

`BOX color, left, top, width, height` - Draw a filled rectangle at the specified coordinates.

`RGB(r, g, b)` - Convert the specified red, green, blue values into a single color. Values are between 0 and 255.
