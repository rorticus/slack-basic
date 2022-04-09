# FOR
```
FOR <Counter-Variable>=<startvalue> TO <endvalue> [ STEP <stepsize>]
```
---
The BASIC command FOR is the start command of a FOR…TO…STEP…NEXT loop. This FOR...NEXT loop is executed until counter variable equals the value in the TO clause. With <stepsize>, the counter variable value could be either increased if positive, greater than zero, decreased if negative or remain unchanged if 0. When the STEP command isn't used at all the step size defaults to 1. Note that the counter variable evaluates to <endvalue> + <stepsize> after the last iteration (except if the step value is 0 where the loop ends with the exact limit value <endvalue>).

The FOR loop is always entered, even the start value is beyond the end value, leading to a minimum of one iteration in every case. To overcome this limitation one has to prepend a conditional part to skip the loop if no iteration should take place.