# Pratt parser in JavaScript with Prolog operators

## Overview

I used Prolog style operator definitions from the first article (see Table II on page 1456)
to implement the Pratt parser from the second referenced article in JavaScript. I also used
ideas from the third article. This is a novel approach, as far as I know.

## Description

There are numbered HTML files which you can open in a browser to test the 
associated JavaScript implementation of the parser. The implementations
are different, the first file follows closely the material presented in the
article and is then gradually modified towards the last version.

## References

In this implementation of Pratt's parser I made use of the material presented in these articles:

- _The simple and powerful yfx operator precedence parser_, E. L. Favero, 2007 available at
  [https://onlinelibrary.wiley.com/doi/pdf/10.1002/spe.811](https://onlinelibrary.wiley.com/doi/pdf/10.1002/spe.811)

- _A Formalization and Correctness Proof of the CGOL Language System (Master's Thesis)_, Michael L. Van De Vanter, 1975 available at
  [http://publications.csail.mit.edu/lcs/pubs/pdf/MIT-LCS-TR-147.pdf](http://publications.csail.mit.edu/lcs/pubs/pdf/MIT-LCS-TR-147.pdf)

- _Top Down Operator Precedence_, Douglas Crockford, 2007 available at
  [https://crockford.com/javascript/tdop/tdop.html](https://crockford.com/javascript/tdop/tdop.html).

- _Top Down Operator Precedence_, Vaughan R. Pratt, 1973 available at
  [http://tdop.github.io/](http://tdop.github.io/).  Original description of
  Pratt's algorithm.

