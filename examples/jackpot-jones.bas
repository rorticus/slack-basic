10 DIM emoji$(4)
20 target$ = ":ryanjones::ryanjones::ryanjones:"
30 emojiCount% = 4

40 emoji$(1) = ":ryanjones:"
50 emoji$(2) = ":seven:"
60 emoji$(3) = ":cherries:"
70 emoji$(4) = ":woman:"

80 str$ = ""

90 for i = 1 to 3
100    str$ = str$ + emoji$(INT(RND() * emojiCount%) + 1)
110 next

120 print str$

130 if str$ = target$ then 140
135 if str$ <> target$ then 160

140 REM winning!
150 print "Ryan Jooooooooones!" : END

160 REM losing :(
170 IF str$ = ":woman::woman::woman:" THEN GOTO 210
180 dataIndex% = INT(RND() * 108) + 1
190 FOR I = 1 TO dataIndex% - 1 : READ response$ : NEXT
200 PRINT response$ : END

210 REM all the ladies
220 PRINT "Ryan jones gets all the ladies!"

230 REM DATA

240 DATA "Ryan Jones gave his father “the talk”"
250 DATA "Ryan Jones' passport requires no photograph"
260 DATA "When Ryan Jones drives a car off the lot, its price increases in value"
280 DATA "Once a rattlesnake bit Ryan Jones, after 5 days of excruciating pain, the snake finally died"
290 DATA "Ryan Jones' 5 de Mayo party starts on the 8th of March"
300 DATA "Ryan Jones' feet don’t get blisters, but his shoes do"
310 DATA "Ryan Jones once went to the psychic, to warn her"
320 DATA "If Ryan Jones were to punch you in the face you would have to fight off a strong urge to thank him"
330 DATA "Whatever side of the tracks Ryan Jones’s currently on is the right side, even if Ryan Jones crosses the tracks Ryan Jones’ll still be on the right side"
340 DATA "Ryan Jones can speak Russian… in French"
350 DATA "Ryan Jones never says something tastes like chicken.. not even chicken"
360 DATA "Superman has pajamas with his logo"
370 DATA "Ryan Jones' tears can cure cancer, too bad Ryan Jones never cries"
380 DATA "The circus ran away to join Ryan Jones"
390 DATA "Bear hugs are what Ryan Jones gives bears"
400 DATA "Ryan Jones once brought a knife to a gunfight… just to even the odds"
410 DATA "When Ryan Jones meets the Pope, the Pope kisses his ring"
420 DATA "Ryan Jones' friends call him by his name, his enemies don’t call him anything because they are all dead"
430 DATA "Ryan Jones has never waited 15 minutes after finishing a meal before returning to the pool"
440 DATA "If Ryan Jones were to visit the dark side of the moon, it wouldn’t be dark"
450 DATA "Ryan Jones once won a staring contest with his own reflection"
460 DATA "Ryan Jones can kill two stones with one bird"
470 DATA "Ryan Jones' signature won a Pulitzer"
480 DATA "When a tree falls in a forest and no one is there, Ryan Jones hears it"
490 DATA "Ryan Jones once got pulled over for speeding, and the cop got the ticket"
500 DATA "The dark is afraid of Ryan Jones"
510 DATA "Sharks have a week dedicated to Ryan Jones"
520 DATA "Ryan Jones' ten gallon hat holds twenty gallons"
530 DATA "No less than 25 Mexican folk songs have been written about his beard"
540 DATA "Ryan Jones once made a weeping willow laugh"
550 DATA "Ryan Jones lives vicariously through himself"
560 DATA "Ryan Jones' business card simply says ‘I’ll Call You”"
570 DATA "Ryan Jones once taught a german shepherd how to bark in spanish"
580 DATA "Ryan Jones bowls overhand"
590 DATA "In museums, Ryan Jones is allowed to touch the art"
600 DATA "Ryan Jones is allowed to talk about the fight club"
610 DATA "Ryan Jones once won a fist fight, only using his beard"
620 DATA "Ryan Jones once won the Tour-de-France, but was disqualified for riding a unicycle"
630 DATA "A bird in his hand is worth three in the bush"
640 DATA "Ryan Jones' lovemaking has been detected by a seismograph"
650 DATA "The Holy Grail is looking for Ryan Jones"
660 DATA "Roses stop to smell Ryan Jones"
670 DATA "Ryan Jones once started a fire using only dental floss and water"
680 DATA "Ryan Jones' sweat is the cure for the common cold"
690 DATA "Bigfoot tries to get pictures of Ryan Jones"
700 DATA "Werewolves are jealous of his beard"
710 DATA "Ryan Jones once turned a vampire into a vegetarian"
720 DATA "Ryan Jones once won the world series of poker using UNO cards"
730 DATA "Ryan Jones never wears a watch because time is always on his side"
740 DATA "Ryan Jones has taught old dogs a variety of new tricks"
750 DATA "Ryan Jones has won the lifetime achievement award… twice"
760 DATA "If opportunity knocks, and Ryan Jones’s not at home, opportunity waits"
770 DATA "Batman watches Saturday morning cartoons about Ryan Jones"
780 DATA "When Ryan Jones was young Ryan Jones once sent his parents to his room"
790 DATA "Ryan Jones once had an awkward moment, just to see how it feels"
800 DATA "Ryan Jones' beard alone has experienced more than a lesser man’s entire body"
810 DATA "Ryan Jones' blood smells like cologne"
820 DATA "On every continent in the world, there is a sandwich named after Ryan Jones. His hands feel like rich brown suede"
830 DATA "Mosquitoes refuse to bite Ryan Jones purely out of respect"
840 DATA "Ryan Jones is fluent in all languages, including three that Ryan Jones only speaks"
850 DATA "Once while sailing around the world, Ryan Jones discovered a short cut"
860 DATA "Panhandlers give Ryan Jones money"
870 DATA "When Ryan Jones goes to Spain, Ryan Jones chases the bulls"
880 DATA "Ryan Jones' shadow has been on the ‘best dressed’ list twice"
890 DATA "When Ryan Jones holds a lady’s purse, Ryan Jones looks manly"
900 DATA "Two countries went to war to dispute HIS nationality"
910 DATA "When in Rome, they do as Ryan Jones does"
920 DATA "Ryan Jones' pillow is cool on BOTH sides"
930 DATA "The Nobel Academy was awarded a prize from RYAN JONES"
940 DATA "While swimming off the coast of Australia, Ryan Jones once scratched the underbelly of the Great White with his right hand"
950 DATA "Ryan Jones taught Chuck Norris martial arts"
960 DATA "Time waits on no one, but Ryan Jones"
970 DATA "Once Ryan Jones ran a marathon because it was on the way
980 DATA "Ryan Jones' mother has a tattoo that says Son"
990 DATA "The star on his Christmas tree is tracked by NASA"
1000 DATA "Presidents take his birthday off"
1010 DATA "Ryan Jones' shirts never wrinkle"
1020 DATA "Ryan Jones has never walked into a spider web"
1030 DATA "Ryan Jones is left-handed. And right-handed"
1040 DATA "Ryan Jones' shirts never wrinkle"
1050 DATA "The police often question Ryan Jones, just because they find him interesting"
1060 DATA "Ryan Jones' organ donation card also lists his beard"
1070 DATA "Ryan Jones doesn’t believe in using oven mitts, nor potholders"
1080 DATA "Ryan Jones' cereal never gets soggy. It sits there, staying crispy, just for him"
1090 DATA "Respected archaeologists fight over his discarded apple cores"
1100 DATA "Even his tree houses have fully finished basements"
1110 DATA "Ryan Jones' garden maze is responsible for more missing persons than the bermuda triangle"
1120 DATA "If Ryan Jones were to say something costs an arm and a leg, it would"
1130 DATA "Ryan Jones’s never lost a game of chance"
1140 DATA "Ryan Jones is the life of parties that Ryan Jones has never attended"
1150 DATA "Ryan Jones was on a recent archaeological dig and came across prehistoric foot prints that lead out of Africa into all parts of the world. On close inspection, it turned out that the prints were his"
1160 DATA "Ryan Jones once caught the Loch Ness Monster….with a cane pole, but threw it back"
1170 DATA "Ryan Jones' wallet is woven out of chupacabra leather"
1180 DATA "Ryan Jones played a game of Russian Roulette with a fully loaded magnum, and won"
1190 DATA "Freemasons strive to learn HIS secret handshake"
1200 DATA "If Ryan Jones was to pat you on the back, you would list it on your resume"
1210 DATA "Ryan Jones is considered a national treasure in countries Ryan Jones’s never visited"
1220 DATA "Cars look both ways for Ryan Jones, before driving down a street"
1230 DATA "Ryan Jones once tried to acquire a cold just to see what it felt like, but it didn’t take"
1240 DATA "Ryan Jones has inside jokes with people Ryan Jones’s never met"
1250 DATA "Bikers walk their motorcycles past his home"
1260 DATA "Ryan Jones has inside jokes with complete strangers"
1270 DATA "Ryan Jones pees standing up and sitting down, at the same time"
1280 DATA "Ryan Jones can cook minute rice in 30 seconds"
1290 DATA "Roses are red, violets are blue, Ryan Jones just dumped you"
1300 DATA "Insurance companies pay Ryan Jones a premium to insure him"
1310 DATA "When Ryan Jones works out, the machine gets stronger"
1320 DATA "While practicing CPR, Ryan Jones successfully resuscitated the practice dummy"