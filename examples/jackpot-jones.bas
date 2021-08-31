10 DIM emoji$(4)
11 target$ = ":ryanjones::ryanjones::ryanjones:"
12 emojiCount% = 4

20 emoji$(1) = ":ryanjones:"
30 emoji$(2) = ":seven:"
40 emoji$(3) = ":cherries:"
50 emoji$(4) = ":woman:"

70 str$ = ""

80 for i = 1 to 3
90    str$ = str$ + emoji$(INT(RND() * emojiCount%) + 1)
100 next

110 if str$ = target$ then 120 else 160
REM 120 if str$ <> target$ then 160

120 REM winning!
130 print str$
140 print "Ryan Jooooooooones!"
150 END
160 REM losing :(
170 PRINT str$
180 PRINT "you lose"