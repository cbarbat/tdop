# Pratt parser in JavaScript with Prolog operators

## Overview

I used Prolog style operator definitions from the first article (see Table II on page 1456)
to implement a Pratt parser for Agda style parsing from here:
[https://softwareengineering.stackexchange.com/questions/310735/language-with-two-binary-operators-of-same-precedence-left-associative-right](https://softwareengineering.stackexchange.com/questions/310735/language-with-two-binary-operators-of-same-precedence-left-associative-right)

In the first implementation, when operators L, R are left-associative resp. right-associative with the same precedence, 
we get a L b R c = a L (b R c).

In the second implementation, when operators L, R are left-associative resp. right-associative with the same precedence, 
we get a L b R c = (a L b) R c.

The third implementation can switch between both behaviours depending on a boolean flag. 

## References

In this implementation of Pratt's parser I made use of the material presented in these articles:

- _The simple and powerful yfx operator precedence parser_, E. L. Favero, 2007 available at
  [https://onlinelibrary.wiley.com/doi/pdf/10.1002/spe.811](https://onlinelibrary.wiley.com/doi/pdf/10.1002/spe.811)

- _A Formalization and Correctness Proof of the CGOL Language System (Master's Thesis)_, Michael L. Van De Vanter, 1975 available at
  [http://publications.csail.mit.edu/lcs/pubs/pdf/MIT-LCS-TR-147.pdf](http://publications.csail.mit.edu/lcs/pubs/pdf/MIT-LCS-TR-147.pdf)

- _Top Down Operator Precedence_, Vaughan R. Pratt, 1973 available at
  [http://tdop.github.io/](http://tdop.github.io/).  Original description of
  Pratt's algorithm.

- _Top Down Operator Precedence_, Douglas Crockford, 2007 available at
  [https://crockford.com/javascript/tdop/tdop.html](https://crockford.com/javascript/tdop/tdop.html).
