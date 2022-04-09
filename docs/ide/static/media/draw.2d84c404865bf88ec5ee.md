# DRAW
```
DRAW <color: string>, <x: number>, <y: number> [, <x2: number>, <y2: number>]
```
---

The **DRAW** statement draws a 1 to n pixel line from the starting coordinates
to the ending coordinates. If the ending coordinates are not provided
the statement draws a single pixel. If ending coordinates are provided,
the statement draws a line connecting the two pairs of coordinates.

## Examples

> Drawing a single red pixel at coordinate 15,16
```
DRAW "#ff0000", 15, 16
```

> Drawing a blue line from 0,0 to 160,160
```
DRAW "#0000ff", 0, 0, 160, 160
```