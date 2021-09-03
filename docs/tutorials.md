# Slack Basic Tutorials

## Reading and Writing

As in normal basic, you use the `PRINT` and `INPUT` commands to interact with the user.  Let's build a simple calculator.

```bas
10 INPUT "Enter the first number"; N1
20 INPUT "Enter the operator (+, -, /, *)"; OP$
30 INPUT "Enter the second number"; N2
```

- `10` - The `INPUT` command will prompt the user for input. If you specify a string first, the string will be displayed in the prompt. In Slack Basic, if someone is running this via the `/basic` command, this will appear as a modal prompt.  Notice that the `N1` variable here. Because this represents a floating point value, the `INPUT` statement will automatically try to convert the user's input to a floating point value.

- `20` - Here is similar, but since we are input a string variable, `OP$`, no type conversion will take place.

```bas
40 IF OP$ = "+" THEN RESULT = N1 + N2
50 IF OP$ = "-" THEN RESULT = N1 - N2
60 IF OP$ = "*" THEN RESULT = N1 * N2
70 IF OP$ = "/" THEN RESULT = N1 / N2
```

Notice that we don't have cool stuff like else and if/else statements, so if you need to do something more complicated, you have to structure things a bit differently.

```bas
80 PRINT "The result is "; RESULT
```

`PRINT` will print everything you pass to it. You can use a comma delimiter, a semicolon, or just a space!  These are all equivalent:

- `PRINT "A", B, C%, D$`
- `PRINT "A"; B; C%; D$`
- `PRINT "A" B C% D$"`

Slack Basic will buffer print statements for a second before it sends them to the client. This saves on calls to the slack API but also means that you can't call `PRINT` a million times to spam the channel. Additionally, you are not allowed to call `PRINT` more than 25 times within a few seconds.  Usually this means you are up to something nefarious.

## Graphics

Primitive graphics are supported in the hopes that someone will make something truly useless but amazing.  To start using graphics, you need to use the `GRAPHICS` statement.

```bas
GRAPHICS 512, 512
```

This will create a "graphics canvas" of 512 by 512 pixels. You can now use graphics statements to draw to this canvas.  Let's draw a couple of boxes.

```bas
10 DATA #ff0000ff #00ff00ff #0000ffff
20 DIM COLORS$(2) : READ COLORS$(0), COLORS$(1), COLORS$(2)
30 DEF FN COLOR() = COLORS$(INT(RND() * 3))
40 DEF FN BETWEEN(MIN, MAX) = MIN + INT(RND() * (MAX - MIN))
```

Woah! What's going on here.

- `10` - A `DATA` statement declares static data. This data can only be accessed via the `READ` statement.  Here we are listing what colors we want to have available.  `DATA` statements can appear **anywhere** in the program and will be processed before the program is run.

- `20` - We're declaring a new string array (`DIM`) and filling its contents with static data.

- `30` - Slack Basic supports single expression functions - more similar to a function in the mathematical sense than the programming sense. Here we are creating a function that will return a single random color from the `COLORS$` array.  Remember, `INT` converts a floating point value to an integer by rounding down, and `RND` returns a random number between 0 and 1.

- `40` - Another function here, but this one is fancy and takes parameters!

```bas
50 FOR I% = 0 TO 2
60   C$ = FN COLOR()
70   X = FN BETWEEN(0, 512)  
80   Y = FN BETWEEN(0, 512)
90   S = FN BETWEEN(25, 50)
100  BOX C$, X, Y, S, S
110 NEXT
```

This is a mouthfull.

- `50` - Creating a small loop to run from 0 to 2 inclusively, so this loop will run 3 times which means we are going to be drawing 3 boxes.

- `60`-`80` - Call the functions we declared earlier. See how much nicer this is than duplicating the code a bunch in the loop?

- `100` - Draw a filled rectangle of a random color (`C$`) at the specified coordinates and size.

- `110` - This is the other half of the loop. `NEXT` by itself will always jump up back to the most innermost loop.

`RUN` this and you should get something that looks like this.
