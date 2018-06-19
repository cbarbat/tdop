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
	var MIN_BP = 0; // minimal binding power
	var MUL_BP = 150; // multiplication binding power
	var MAX_BP = 10000; // maximal binding power

	var minus_one = { // -1 literal constant
		node: "Number",
		value: -1
	};

	var nud_itself = function () { // used as nud
		return this;
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
		var t;
		var nbp;
		var left;
		var lbp;
		var newline_at_top_level;
		t = token;
		advance();
		nbp = t.nud_nbp;
		if (t.nud === null) {
			t.error("Undefined nud.");
		}
		left = t.nud();
		if (token.led_lbp) {
			lbp = token.led_lbp;
		} else if (token.nud_lbp) {
			lbp = token.nud_lbp;
		} else {
			lbp = MIN_BP;
		}
		while (rbp < lbp && lbp < nbp) {
			t = token;
			newline_at_top_level = ((newline_flag === 1) && (paren_depth === 0) && (brack_depth === 0));
			if (newline_at_top_level && (t.led === null || t.nud !== null)) {
				break;
			} else if (t.led === null && !newline_at_top_level) {
				t.led = led_multiplication;
				nbp = t.nud_nbp;
			} else if (t.led !== null && (!newline_at_top_level || t.nud === null)) {
				advance();
				nbp = t.led_nbp;
			}
			left = t.led(left);
			if (token.led_lbp) {
				lbp = token.led_lbp;
			} else if (token.nud_lbp) {
				lbp = token.nud_lbp;
			} else {
				lbp = MIN_BP;
			}
		}
		return left;
	};

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

	var register_nud = function (id, lbp, rbp, nbp, nud) {
		var s = symbol(id);
		s.nud_lbp = lbp; // left binding power
		s.nud_rbp = rbp; // right binding power
		s.nud_nbp = nbp; // next binding power (for non-associative operators)
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

	var nilfix = function (id, bp, nud) {
		return register_nud(id, bp, bp, MAX_BP, nud || nud_itself);
	};

	var prefix = function (id, bp, nud, node) {
		return register_nud(id, MIN_BP, bp, bp + 1, nud || function () {
			this.node = node;
			this.args = [expression(bp)]; // nud_rbp
			return this;
		});
	};

	var suffix = function (id, bp, led, node) {
		return register_led(id, bp, MIN_BP, bp + 1, led || function (left) {
			this.node = node;
			this.args = [left];
			return this;
		});
	};

	var infixL = function (id, bp, led, node) {
		return register_led(id, bp, bp, bp + 1, led || function (left) {
			this.node = node;
			this.args = [left, expression(bp)]; // led_rbp
			return this;
		});
	};

	var infixR = function (id, bp, led, node) {
		return register_led(id, bp, bp - 1, bp + 1, led || function (left) {
			this.node = node;
			this.args = [left, expression(bp - 1)]; // led_rbp
			return this;
		});
	};

	var infixN = function (id, bp, led, node) {
		return register_led(id, bp, bp, bp, led || function (left) {
			this.node = node;
			this.args = [left, expression(bp)]; // led_rbp
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

	nilfix("(number)", MUL_BP);
	nilfix("(string)", MUL_BP);
	nilfix("(symbol)", MUL_BP);

	prefix("[", 220, function () { // array definition
		var a = [];
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
		var right = expression(0);
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
		} else if (right.value !== "*") {
			this.value = "*";
			this.node = "Multiplication";
			this.args = [minus_one, right];
			return this;
		}
	});

	infixL("*", MUL_BP, led_multiplication);

	infixL("/", MUL_BP, function (left) { // division
		var right = expression(MUL_BP);
		var result = {};
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
		var right = expression(130);
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
		var right = expression(130);
		var result = {};
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
