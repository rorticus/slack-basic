10 GRAPHICS 320, 200
20 BOX "#ff00ff", 0, 0, 320, 200
30 LET boxCount% = 10
40 FOR I = 0 TO boxCount%
50  left = INT(RND() * 320)
60  top = INT(RND() * 200)
70  width = INT(RND() * 25)
80  height = INT(RND() * 25)
90 BOX "#ffffff", left, top, width, height
100 NEXT