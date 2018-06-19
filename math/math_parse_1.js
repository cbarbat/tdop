// parse.js
// Parser for Simplified JavaScript written in Simplified JavaScript
// From Top Down Operator Precedence
// http://javascript.crockford.com/tdop/index.html
// Douglas Crockford
// 2016-02-15

//jslint for, this

var make_parse = function () {
	var symbol_table = {};
	var pptoken; // previous previous token
	var ptoken; // previous token
	var token; // current token
	var tokens; // lexed tokens
	var token_nr; // index of current token
	var newline_flag = 0;
	var paren_depth = 0;
	var brack_depth = 0;
	var MIN_BP = 0;
	var MAX_BP = 10000;

	// -1 literal constant
	var minus_one = {
		node: "Number",
		value: -1
	};

	// used as nud
	var nud_itself = function () {
		return this;
	};

	// used as led
	var led_multiplication = function (left) {
		var right = expression(150);
		if ((left.value === "*") && (right.value === "*")) {
			left.args = left.args.concat(right.args);
			return left;
		} else
			if ((left.value === "*") && (right.value !== "*")) {
				left.args.push(right);
				return left;
			} else
				if ((left.value !== "*") && (right.value === "*")) {
					right.args = [left].concat(right.args);
					return right;
				} else
					if ((left.value !== "*") && (right.value !== "*")) {
						var result = Object.create(this);
						result.node = "Multiplication";
						result.value = "*";
						result.args = [left, right];
						return result;
					}
	}

	// get next token
	var advance = function (id) {
		var t;
		var v;
		var a;
		var o;
		newline_flag = 0;
		while (token_nr < tokens.length && tokens[token_nr].type === "newline") {
			newline_flag = 1;
			token_nr += 1;
		}
		if (id && token.id !== id) {
			token.error("Expected '" + id + "'.");
		}
		if (token_nr >= tokens.length) {
			pptoken = ptoken;
			ptoken = token;
			token = symbol_table["(end)"];
			return;
		}
		t = tokens[token_nr];
		token_nr += 1;
		v = t.value;
		a = t.type;
		if (a === "string") {
			a = "String";
			o = symbol_table["(string)"];
		} else if (a === "number") {
			a = "Number";
			o = symbol_table["(number)"];
		} else if (a === "symbol") {
			a = "Symbol";
			o = symbol_table["(symbol)"];
		} else if (a === "operator") {
			a = "Operator";
			o = symbol_table[v];
			if (!o) {
				t.error("Unknown operator.");
			}
		} else {
			t.error("Unexpected token.");
		}
		pptoken = ptoken;
		ptoken = token;
		token = Object.create(o);
		token.from = t.from;
		token.to = t.to;
		token.node = a;
		token.value = v;
		return token;
	};

	// Original Pratt's parse routine: parse from left to right until token.lbp <= rbp
	var pratt = function (rbp) {
		var left;
		var t;
		t = token;
		advance();
		left = t.nud();
		while (rbp < token.lbp) {
			t = token;
			advance();
			left = t.led(left);
		}
		return left;
	};

	// Extended Pratt's parse routine: parse from left to right until token.lbp <= rbp
	var expression = function (rbp) {
		var left,
		t;
		if (rbp < MIN_BP) {
			// check precondition
			token.error("rbp:" + rbp + " < MIN_BP:" + MIN_BP + ".");
		}
		t = token;
		advance();
		left = t.nud();
		nbp = t.nbp;
		while ((rbp < token.lbp) && (token.lbp < nbp)) {
			t = token;
			if ((newline_flag === 1) && (paren_depth === 0) && (brack_depth === 0)) {
				break;
			} else if (t.led !== null) {
				advance();
			} else {
				t.led = led_multiplication;
			}
			left = t.led(left);
			nbp = t.nbp;
		}
		return left;
	};

	var original_symbol = {
		nud: null,
		//function () {
		//    this.error("Undefined.");
		//},
		led: null
		//function (ignore) {
		//    this.error("Missing operator.");
		//}
	};

	var nilfix = function (id, bp) {
		var s = symbol_table[id];
		bp = bp || 0;
		if (s) {
			if (bp >= s.lbp) {
				s.lbp = bp;
			}
		} else {
			s = Object.create(original_symbol);
			s.id = id;
			s.value = id;
			s.lbp = bp; // left binding power
			s.rbp = bp; // right binding power
			s.nbp = MAX_BP; // next binding power (for non-associative operators)
			symbol_table[id] = s;
		}
		return s;
	};

	var prefix = function (id, bp, nud, node) {
		var s = nilfix(id);
		//s.lbp = MIN_BP;
		s.rbp = bp;
		s.nbp = bp + 1;
		s.nud = nud || function () {
			this.node = node;
			this.args = [expression(s.rbp)];
			return this;
		};
		return s;
	};

	var suffix = function (id, bp, led, node) {
		var s = nilfix(id, bp);
		//s.lbp = bp;
		s.rbp = MIN_BP;
		s.nbp = bp + 1;
		s.led = led || function (left) {
			this.node = node;
			this.args = [left];
			return this;
		};
		return s;
	};

	var infixL = function (id, bp, led, node) {
		var s = nilfix(id, bp);
		//s.lbp = bp;
		s.rbp = bp;
		s.nbp = bp + 1;
		s.led = led || function (left) {
			this.node = node;
			this.args = [left, expression(s.rbp)];
			return this;
		};
		return s;
	};

	var infixR = function (id, bp, led, node) {
		var s = nilfix(id, bp);
		//s.lbp = bp;
		s.rbp = bp - 1;
		s.nbp = bp + 1;
		s.led = led || function (left) {
			this.node = node;
			this.args = [left, expression(s.rbp)];
			return this;
		};
		return s;
	};

	var infixRP = function (id, bp, led, node) {
		var s = nilfix(id, bp + 1);
		//s.lbp = bp;
		s.rbp = bp;
		s.nbp = bp + 2;
		s.led = led || function (left) {
			this.node = node;
			this.args = [left, expression(s.rbp)];
			return this;
		};
		return s;
	};

	var infixN = function (id, bp, led, node) {
		var s = nilfix(id, bp);
		//s.lbp = bp;
		s.rbp = bp;
		s.nbp = bp;
		s.led = led || function (left) {
			this.node = node;
			this.args = [left, expression(s.rbp)];
			return this;
		};
		return s;
	};

	var relation = function (id, node) {
		return infixN(id, 70, function (left) {
			this.node = node;
			this.args = [left, expression(70)];
			return this;
		});
	};

	var assignment = function (id, node) {
		return infixN(id, 20, function (left) {
			//if (left.id !== "." && left.id !== "[" && left.node !== "Symbol") {
			//    left.error("Bad lvalue.");
			//}
			this.node = node;
			this.args = [left, expression(20)];
			this.assignment = true;
			return this;
		});
	};

	nilfix("(end)", 0);
	nilfix(",", 0);

	nilfix("(number)", 150).nud = nud_itself;
	nilfix("(string)", 150).nud = nud_itself;
	nilfix("(symbol)", 150).nud = nud_itself;

	infixL("<@", 300, null, "Left");
	infixRP("@>", 300, null, "Right");

	prefix("[", 220, function () { // array definition
		var a = [];
		brack_depth++;
		if (token.id !== "]") {
			while (true) {
				a.push(expression(0));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		brack_depth--;
		advance("]");
		this.node = "ArrayExpression";
		this.args = a;
		return this;
	});

	nilfix("]", 0);
	infixL("[", 220, function (left) { // array access by index
		this.node = "ArrayAccessByIndex";
		brack_depth++;
		this.args = [left, expression(0)];
		brack_depth--;
		advance("]");
		return this;
	});

	prefix("(", 220, function () { // parentheses for grouping
		paren_depth++;
		var right = expression(0);
		paren_depth--;
		advance(")");
		return right;
	});

	nilfix(")", 0);
	infixL("(", 220, function (left) { // function call
		if ((left.node !== "prefix" || left.id !== "function") &&
			left.node !== "Symbol" && left.id !== "(" &&
			left.id !== "&&" && left.id !== "||" && left.id !== "?") {
			left.error("Expected a variable name.");
		}
		var a = [];
		paren_depth++;
		if (token.id !== ")") {
			while (true) {
				a.push(expression(0));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		paren_depth--;
		advance(")");
		this.node = "FunctionCall";
		this.value = left;
		this.args = a;
		return this;
	});

	prefix("++", 200, null, "PreIncrement"); // pre increment
	prefix("--", 200, null, "PreDecrement"); // pre decrement

	suffix("++", 200, null, "PostIncrement"); // post increment
	suffix("--", 200, null, "PostDecrement"); // post decrement

	suffix("!", 180, null, "Factorial"); // factorial

	infixR("^", 170, null, "Exponentiation"); // exponentiation

	prefix("+", 130, function () { // + sign
		if (pptoken) {
			if (["+", "-", "++", "--"].indexOf(pptoken.value) !== -1) {
				ptoken.error("Unary + not allowed after +, -, ++ or --.");
			}
		}
		var right = expression(130);
		return right;
	});

	prefix("-", 130, function () { // - sign
		if (pptoken) {
			if (["+", "-", "++", "--"].indexOf(pptoken.value) !== -1) {
				ptoken.error("Unary - not allowed after +, -, ++ or --.");
			}
		}
		var right = expression(130);
		if (right.value === "*") {
			right.args = [minus_one].concat(right.args);
			return right;
		} else
			if (right.value !== "*") {
				this.value = "*";
				this.node = "Multiplication";
				this.args = [minus_one, right];
				return this;
			}
	});

	infixL("*", 150, led_multiplication);

	infixL("/", 150, function (left) { // division
		var right = expression(150);
		var result = {};
		result.value = "^";
		result.node = "Exponentiation";
		result.args = [right, minus_one];
		if (left.value === "*") {
			left.args.push(result);
			return left;
		} else
			if (left.value !== "*") {
				this.value = "*";
				this.node = "Multiplication";
				this.args = [left, result];
				return this;
			}
	});

	infixL("%", 140, null, "Modulo"); // modulo

	infixL("+", 130, function (left) { // addition
		var right = expression(130);
		if ((left.value === "+") && (right.value === "+")) {
			left.args = left.args.concat(right.args);
			return left;
		} else
			if ((left.value === "+") && (right.value !== "+")) {
				left.args.push(right);
				return left;
			} else
				if ((left.value !== "+") && (right.value === "+")) {
					right.args = [left].concat(right.args);
					return right;
				} else
					if ((left.value !== "+") && (right.value !== "+")) {
						this.value = "+";
						this.node = "Addition";
						this.args = [left, right];
						return this;
					}
	});

	infixL("-", 130, function (left) { // subtraction
		var right = expression(130);
		var result = {};
		if (right.value === "*") {
			right.args = [minus_one].concat(right.args);
			result = right;
		} else
			if (right.value !== "*") {
				result.value = "*";
				result.node = "Multiplication";
				result.args = [minus_one, right];
			}
		if (left.value === "+") {
			left.args.push(result);
			return left;
		} else
			if (left.value !== "+") {
				this.value = "+";
				this.node = "Addition";
				this.args = [left, result];
				return this;
			}
	});

	nilfix(":");
	infixR("?", 30, function (left) { // conditional
		this.node = "ConditionalExpression";
		this.args = [left];
		this.args.push(expression(0));
		advance(":");
		this.args.push(expression(29)); // right associative, for left assoc use rbp = 30 here
		return this;
	});

	relation("<", "Less");
	relation("<=", "LessEqual");
	relation(">", "Greater");
	relation(">=", "GreaterEqual");
	relation("==", "Equal");
	relation("!=", "NotEqual");

	assignment("=", "Assignment");
	assignment("+=", "AssignmentAdd");
	assignment("-=", "AssignmentSubtract");

	infixL(";", 10, function (left) { // compound
		var right = expression(10);
		if ((left.value === ";") && (right.value === ";")) {
			left.args = left.args.concat(right.args);
			return left;
		} else
			if ((left.value === ";") && (right.value !== ";")) {
				left.args.push(right);
				return left;
			} else
				if ((left.value !== ";") && (right.value === ";")) {
					right.args = [left].concat(right.args);
					return right;
				} else
					if ((left.value !== ";") && (right.value !== ";")) {
						this.value = ";";
						this.node = "CompoundExpression";
						this.args = [left, right];
						return this;
					}
	});

	return function (source) {
		var result = [];
		tokens = source.math_tokens("!#%&*+-/<=>^|@", "@&+-<=>|");
		token_nr = 0;
		if (tokens) {
			advance();
			do {
				if (token.id !== "(end)")
					result.push(expression(0));
				else
					break;
			} while (newline_flag === 1);
			advance("(end)");
		}
		return result;
	};
};
