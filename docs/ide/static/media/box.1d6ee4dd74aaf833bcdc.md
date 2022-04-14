# BOX

```
BOX <color: string>, <left: number>, <top: number>, <width: number>, <height: number>
```

---

The **BOX** statement draws a box of the specified color at the provided
coordinates. Note that the you must have previously issued a `GRAPHICS` statement
to initialize the canvas.

## Example

> Draw a 16x32 red box at coordinate 16, 17

```
BOX "#ff0000", 16, 17, 16, 32
```
