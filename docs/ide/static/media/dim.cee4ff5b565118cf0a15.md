# DIM

```
DIM <Variable>(<d1>[,<d2>[,<d3>...]])[, <Variable>(<d1>[,<d2>[,<d3>...]])...]
```

---

The BASIC command DIM allocates space in array memory for a new array, with one dimension for each of the dimension sizes d1, d2, d3, etc. given in the DIM statement.

Note that the dimension sizes represent the last, or "highest", index number available. Since the lower limit for the indices is always fixed at zero, specifying a dimension of n reserves space for n+1 variables "along" that dimension.

Note that using an array without DIMensioning is actually legal in Commodore BASIC: If a BASIC program e.g. starts assigning values to an array not "declared" in a prior DIM statement, the interpreter "auto-DIMensions" the array to a size of 10+1=11 elements along each specified dimension. Like other arrays, such "auto-DIMensioned" arrays cannot be re-dimensioned later through an explicit DIM command.
