# SlackBasic

SlackBasic is a simple Commodore Basic 2.0 (with a few enhancements) interpretter built to run right inside slack.

- [Command Reference](./commands.md)
- [Tutorials](./tutorials.md)

## Running Commands

To get started, click on the app's homepage in your Slack menu and choose the Messages tab. Anything you type here will be sent directly to the SlackBasic interpretter.

```basic
PRINT "Hello, World."
```

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

## File Management

Files can be saved or loaded with the `SAVE` and `LOAD` commands. To remove files, head over to the _Homepage_ tab where you will find additional options.
