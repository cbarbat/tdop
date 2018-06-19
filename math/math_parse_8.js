// parse.js
// Parser for Mathematical Expressions written in Simplified JavaScript
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
	var MIN_BP = 0; // minimal binding power
	var MUL_BP = 150; // multiplication binding power
	var MAX_BP = 10000; // maximal binding power
	var implicit = true; // implicit multiplication allowed?

	var minus_one = { // -1 literal constant
		node: "Number",
		value: -1
	};

	var advance = function (id) { // get next token
		var t;
		var v;
		var a;
		var o;
		if (id && token.id !== id) {
			token.error("Expected '" + id + "'.");
		}
		newline_flag = 0;
		while (token_nr < tokens.length && tokens[token_nr].type === "newline") {
			newline_flag = 1;
			token_nr += 1;
		}
		if (token_nr >= tokens.length) {
			pptoken = ptoken;
			ptoken = token;
			token = symbol_table["(end)"];
			return token;
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
		switch (token.id) {
		case "(":
			paren_depth++;
			break;
		case ")":
			paren_depth--;
			break;
		case "[":
			brack_depth++;
			break;
		case "]":
			brack_depth--;
			break;
		}
		return token;
	};

	var expression = function (rbp) { // Pratt's parse routine: parse from left to right until token.lbp <= rbp or nbp <= token.lbp
		var newline_at_top_level;
		var nbp;
		var nud;
		var led;
		var left;
		var lbp;

		nbp = MAX_BP;
		left = token.nud();
		while (left) {
			if (token.led) {
				lbp = token.led_lbp;
			} else if (token.nud && implicit) {
				lbp = MUL_BP; // implicit multiplication: space between operands
			} else {
				lbp = MIN_BP;
			}
			if (!(rbp < lbp && lbp < nbp))
				break;
			newline_at_top_level = ((newline_flag === 1) && (paren_depth === 0) && (brack_depth === 0)); // Eigenmath lacks && (paren_depth === 0) && (brack_depth === 0);
			if ((!newline_at_top_level || token.nud === null) && token.led !== null) { // Mathematica lacks t.nud === null
				nbp = token.led_nbp;
			} else if (!newline_at_top_level && token.nud !== null && token.led === null && implicit) {
				nbp = MAX_BP; // implicit multiplication: space between operands
				token.led = led_multiplication;
			} else
				break;
			left = token.led(left);
		}
		return left;
	};

	var led_multiplication = function (left) { // used as led
		var right = expression(MUL_BP);
		if ((left.value === "*") && (right.value === "*")) {
			left.args = left.args.concat(right.args);
			return left;
		} else if ((left.value === "*") && (right.value !== "*")) {
			left.args.push(right);
			return left;
		} else if ((left.value !== "*") && (right.value === "*")) {
			right.args = [left].concat(right.args);
			return right;
		} else if ((left.value !== "*") && (right.value !== "*")) {
			var result = Object.create(this);
			result.node = "Multiplication";
			result.value = "*";
			result.args = [left, right];
			return result;
		}
	}

	var original_symbol = {
		nud: null,
		led: null
	};

	var symbol = function (id) {
		var s = symbol_table[id];
		if (!s) {
			s = Object.create(original_symbol);
			s.id = id;
			s.value = id;
			symbol_table[id] = s;
		}
		return s;
	};

	var register_nud = function (id, nud) {
		var s = symbol(id);
		s.nud = nud;
		return s;
	}

	var register_led = function (id, lbp, rbp, nbp, led) {
		var s = symbol(id);
		s.led_lbp = lbp; // left binding power
		s.led_rbp = rbp; // right binding power
		s.led_nbp = nbp; // next binding power (for non-associative operators)
		s.led = led;
		return s;
	}

	var nilfix = function (id, nud) {
		return register_nud(id, nud || function () {
			advance();
			return this;
		});
	};

	var prefix = function (id, bp, nud, node) {
		return register_nud(id, nud || function () {
			advance();
			this.node = node;
			this.args = [expression(bp)];
			return this;
		});
	};

	var suffix = function (id, bp, led, node) {
		return register_led(id, bp, MIN_BP, bp + 1, led || function (left) {
			advance();
			this.node = node;
			this.args = [left];
			return this;
		});
	};

	var infixL = function (id, bp, led, node) {
		return register_led(id, bp, bp, bp + 1, led || function (left) {
			advance();
			this.node = node;
			this.args = [left, expression(this.led_rbp)];
			return this;
		});
	};

	var infixR = function (id, bp, led, node) {
		return register_led(id, bp, bp - 1, bp + 1, led || function (left) {
			advance();
			this.node = node;
			this.args = [left, expression(this.led_rbp)];
			return this;
		});
	};

	var infixN = function (id, bp, led, node) {
		return register_led(id, bp, bp, bp, led || function (left) {
			advance();
			this.node = node;
			this.args = [left, expression(this.led_rbp)];
			return this;
		});
	};

	var relation = function (id, node) {
		return infixN(id, 70, null, node);
	};

	var assignment = function (id, node) {
		return infixN(id, 20, null, node);
	};

	symbol("(end)");
	symbol(",");

	nilfix("(number)");
	nilfix("(string)");
	nilfix("(symbol)");

	prefix("[", 220, function () { // array definition
		var a = [];
		advance();
		if (token.id !== "]") {
			while (true) {
				a.push(expression(0));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance("]");
		this.node = "ArrayExpression";
		this.args = a;
		return this;
	});

	symbol("]");
	infixL("[", 220, function (left) { // array access by index
		var a = [];
		//if (token.id !== "]") {
		advance();
		while (true) {
			a.push(expression(0));
			if (token.id !== ",") {
				break;
			}
			advance(",");
		}
		//}
		advance("]");
		this.node = "ArrayAccessByIndex";
		this.value = left;
		this.args = a;
		return this;
	});

	prefix("(", 220, function () { // parentheses for grouping
		var right;
		advance();
		right = expression(0);
		advance(")");
		return right;
	});

	symbol(")");
	infixL("(", 220, function (left) { // function call
		if ((left.node !== "prefix" || left.id !== "function") &&
			left.node !== "Symbol" && left.id !== "(" &&
			left.id !== "&&" && left.id !== "||" && left.id !== "?") {
			left.error("Expected a variable name.");
		}
		var a = [];
		advance();
		if (token.id !== ")") {
			while (true) {
				a.push(expression(0));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		advance(")");
		this.node = "FunctionCall";
		this.value = left;
		this.args = a;
		return this;
	});

	suffix("++", 200, null, "PostIncrement"); // post increment
	suffix("--", 200, null, "PostDecrement"); // post decrement
	prefix("++", 190, null, "PreIncrement"); // pre increment
	prefix("--", 190, null, "PreDecrement"); // pre decrement
	suffix("!", 180, null, "Factorial"); // factorial

	infixR("^", 170, null, "Exponentiation"); // exponentiation

	prefix("+", 130, function () { // + sign
		advance();
		if (pptoken) {
			if (["+", "-", "++", "--"].indexOf(pptoken.value) !== -1) {
				ptoken.error("Unary + not allowed after +, -, ++ or --.");
			}
		}
		var right = expression(130);
		return right;
	});

	prefix("-", 130, function () { // - sign
		advance();
		if (pptoken) {
			if (["+", "-", "++", "--"].indexOf(pptoken.value) !== -1) {
				ptoken.error("Unary - not allowed after +, -, ++ or --.");
			}
		}
		var right = expression(130);
		if (right.value === "*") {
			right.args = [minus_one].concat(right.args);
			return right;
		} else if (right.value !== "*") {
			this.value = "*";
			this.node = "Multiplication";
			this.args = [minus_one, right];
			return this;
		}
	});

	infixL("*", MUL_BP, function (left) { // used as led
		advance();
		var right = expression(MUL_BP);
		if ((left.value === "*") && (right.value === "*")) {
			left.args = left.args.concat(right.args);
			return left;
		} else if ((left.value === "*") && (right.value !== "*")) {
			left.args.push(right);
			return left;
		} else if ((left.value !== "*") && (right.value === "*")) {
			right.args = [left].concat(right.args);
			return right;
		} else if ((left.value !== "*") && (right.value !== "*")) {
			var result = Object.create(this);
			result.node = "Multiplication";
			result.value = "*";
			result.args = [left, right];
			return result;
		}
	});

	infixL("/", MUL_BP, function (left) { // division
		var right;
		var result = {};
		advance();
		right = expression(MUL_BP);
		result.value = "^";
		result.node = "Exponentiation";
		result.args = [right, minus_one];
		if (left.value === "*") {
			left.args.push(result);
			return left;
		} else if (left.value !== "*") {
			this.value = "*";
			this.node = "Multiplication";
			this.args = [left, result];
			return this;
		}
	});

	infixL("%", 140, null, "Modulo"); // modulo

	infixL("+", 130, function (left) { // addition
		var right;
		advance();
		right = expression(130);
		if ((left.value === "+") && (right.value === "+")) {
			left.args = left.args.concat(right.args);
			return left;
		} else if ((left.value === "+") && (right.value !== "+")) {
			left.args.push(right);
			return left;
		} else if ((left.value !== "+") && (right.value === "+")) {
			right.args = [left].concat(right.args);
			return right;
		} else if ((left.value !== "+") && (right.value !== "+")) {
			this.value = "+";
			this.node = "Addition";
			this.args = [left, right];
			return this;
		}
	});

	infixL("-", 130, function (left) { // subtraction
		var right;
		var result;
		advance();
		right = expression(130);
		result = {};
		if (right.value === "*") {
			right.args = [minus_one].concat(right.args);
			result = right;
		} else if (right.value !== "*") {
			result.value = "*";
			result.node = "Multiplication";
			result.args = [minus_one, right];
		}
		if (left.value === "+") {
			left.args.push(result);
			return left;
		} else if (left.value !== "+") {
			this.value = "+";
			this.node = "Addition";
			this.args = [left, result];
			return this;
		}
	});

	symbol(":");
	infixR("?", 30, function (left) { // conditional
		advance();
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
		var right;
		advance();
		right = expression(10);
		if ((left.value === ";") && (right.value === ";")) {
			left.args = left.args.concat(right.args);
			return left;
		} else if ((left.value === ";") && (right.value !== ";")) {
			left.args.push(right);
			return left;
		} else if ((left.value !== ";") && (right.value === ";")) {
			right.args = [left].concat(right.args);
			return right;
		} else if ((left.value !== ";") && (right.value !== ";")) {
			this.value = ";";
			this.node = "CompoundExpression";
			this.args = [left, right];
			return this;
		}
	});

	return function (source) {
		var result = [];
		tokens = source.math_tokens("!#%&*+-/<=>^|", "&+-<=>|");
		token_nr = 0;
		if (tokens) {
			advance();
			do {
				if (token.id !== "(end)") {
					result.push(expression(0));
				} else {
					break;
				}
			} while (newline_flag === 1);
			advance("(end)");
		}
		return result;
	};
};
