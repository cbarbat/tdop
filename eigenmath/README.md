# Pratt parser in JavaScript for Eigenmath syntax 

## Overview

I implemented the syntax of George Weigt's Eigenmath project in JavaScript.

## Testing

To test the program, you can use the provided `test-script.txt`:

- open it in an editor and copy the content of the text file.

- open `eigenmath.html` in a web browser and paste the test script
  in the input field.
  
- then press the button `Parse`. This should generate a JSON parse tree of the
  whole script.

## References

In this implementation of Pratt's parser I made use of the material presented in these articles:

- _Top Down Operator Precedence_, Douglas Crockford, 2007 available at
  [https://crockford.com/javascript/tdop/tdop.html](https://crockford.com/javascript/tdop/tdop.html).

- _Top Down Operator Precedence_, Vaughan R. Pratt, 1973 available at
  [http://tdop.github.io/](http://tdop.github.io/).  Original description of
  Pratt's algorithm.
  
The concept of nbp (next binding power) is from:

- http://www.engr.mun.ca/~theo/Misc/pratt_parsing.htm