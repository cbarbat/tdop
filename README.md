# Various Pratt parsers in JavaScript

## Overview

This project is for experimenting with variants of Pratt parsers.

## References

In these implementations of Pratt's parser I made use of the material presented in these articles:

Very good presentation of the algorithm in JavaScript:

- _Top Down Operator Precedence_, Douglas Crockford, 2007 available at
  [https://crockford.com/javascript/tdop/tdop.html](https://crockford.com/javascript/tdop/tdop.html).

Original description of Pratt's algorithm:
  
- _Top Down Operator Precedence_, Vaughan R. Pratt, 1973 available at
  [http://tdop.github.io/](http://tdop.github.io/).  

I implement the parser from this master's thesis in the cgol directory:

- _A Formalization and Correctness Proof of the CGOL Language System (Master's Thesis)_, Michael L. Van De Vanter, 1975 available at
  [http://publications.csail.mit.edu/lcs/pubs/pdf/MIT-LCS-TR-147.pdf](http://publications.csail.mit.edu/lcs/pubs/pdf/MIT-LCS-TR-147.pdf)

From here I take the Prolog way of specifying operators (see the prolog directory):
 
- _The simple and powerful yfx operator precedence parser_, E. L. Favero, 2007 available at
  [https://onlinelibrary.wiley.com/doi/pdf/10.1002/spe.811](https://onlinelibrary.wiley.com/doi/pdf/10.1002/spe.811)

The concept of nbp (next binding power for making non-associative infix operators) is from:

- [http://www.engr.mun.ca/~theo/Misc/pratt_parsing.htm](http://www.engr.mun.ca/~theo/Misc/pratt_parsing.htm)

The agda directory contains an implementation of the discussion here:

- [https://softwareengineering.stackexchange.com/questions/310735/language-with-two-binary-operators-of-same-precedence-left-associative-right](https://softwareengineering.stackexchange.com/questions/310735/language-with-two-binary-operators-of-same-precedence-left-associative-right)


