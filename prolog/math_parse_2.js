// Parser for Mathematical Expressions

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
	var MAX_BP = 1200; // maximal binding power
	var implicit = true; // implicit multiplication allowed?

	var minus_one = { // -1 literal constant
		node: "Number",
		pre: MAX_BP,
		id: "(number)",
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
			a = "Reserved";
			o = symbol_table[v];
			if (!o) {
				a = "Symbol";
				o = symbol_table["(symbol)"];
				if (!o) {
					t.error("Unknown symbol.");
				}
			}
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
		if (ptoken)
			switch (ptoken.id) {
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
	}
	
	var expression = function (rbp) { // Pratt's parse routine: parse from left to right until token.lbp <= rbp or nbp <= token.lbp
		var newline_at_top_level;
		var t;
		var nud;
		var led;
		var left;
		var lbp;

		t = token;
		advance();
		left = t.nud();
		while (left) {
			if (token.led) {
				lbp = token.led_lbp;
			} else if (token.nud && implicit) {
				lbp = MUL_BP; // implicit multiplication: space between operands
			} else {
				lbp = MIN_BP;
			}
			if (!(rbp < lbp))
				break;
			t = token;
			newline_at_top_level = ((newline_flag === 1) && (paren_depth === 0) && (brack_depth === 0));
			if ((!newline_at_top_level || token.nud === null) && token.led !== null) {
				advance();
			} else if (!newline_at_top_level && token.nud !== null && token.led === null && implicit) {
				t.led = led_multiplication;
			} else
				break;
			left = t.led(left);
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
			result.pre = MUL_BP;
			result.id = "*";
			result.value = "*";
			result.args = [left, right];
			if (left.pre >= symbol_table["*"].led_lbp && right.pre >= symbol_table["*"].led_rbp)
				return result;
			else
				return left.error("led_multiplication: precedence error!");
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

	var register_nud = function (id, p, lbp, rbp, nud) {
		var s = symbol(id);
		s.nud_pre = p;
		s.nud_lbp = lbp;
		s.nud_rbp = rbp;
		s.nud = nud;
		return s;
	}

	var register_led = function (id, p, lbp, rbp, led) {
		var s = symbol(id);
		s.led_pre = p;
		s.led_lbp = lbp;
		s.led_rbp = rbp;
		s.led = led;
		return s;
	}

	var register_op = function (id, p, spec, den) { // highest precedence MAX_BP
		switch (spec) {
		case "f"  : return register_nud(id, p, MAX_BP, MAX_BP, den); break;
		case "fx" : return register_nud(id, p, MAX_BP, p+1   , den); break;
		case "fy" : return register_nud(id, p, MAX_BP, p     , den); break;
		case "xf" : return register_led(id, p, p+1   , MAX_BP, den); break;
		case "yf" : return register_led(id, p, p     , MAX_BP, den); break;
		case "xfy": return register_led(id, p, p+1   , p     , den); break;
		case "xfx": return register_led(id, p, p+1   , p+1   , den); break;
		case "yfx": return register_led(id, p, p     , p+1   , den); break;
		default   : return spec.error("register_op: invalid specification!");
		}
	}

	var nilfix = function (id, p, nud) {
		return register_op(id, p, "f", nud || function () {
			this.pre = p;
			return this;
		});
	};

	var prefix = function (id, p, nud, node) {
		return register_op(id, p, "fy", nud || function () {
			var right = expression(p);
			this.node = node;
			this.pre = p;
			this.args = [right];
			if (right.pre >= this.nud_pre)
				return this;
			else
				return this.error("prefix: precedence error!");
		});
	};

	var suffix = function (id, p, led, node) {
		return register_op(id, p, "yf", led || function (left) {
			this.node = node;
			this.pre = p;
			this.args = [left];
			if (left.pre >= this.nud_pre)
				return this;
			else
				return this.error("suffix: precedence error!");
		});
	};

	var infixL = function (id, p, led, node) {
		return register_op(id, p, "yfx", led || function (left) {
			var right = expression(p + 1);
			this.node = node;
			this.pre = p;
			this.args = [left, right];
			if (left.pre >= this.led_lbp && right.pre >= this.led_rbp)
				return this;
			else
				return this.error("infixL: precedence error!");
		});
	};

	var infixR = function (id, p, led, node) {
		return register_op(id, p, "xfy", led || function (left) {
			var right = expression(p);
			this.node = node;
			this.pre = p;
			this.args = [left, right];
			if (left.pre >= this.led_lbp && right.pre >= this.led_rbp)
				return this;
			else
				return this.error("infixR: precedence error!");
		});
	};

	var infixN = function (id, p, led, node) {
		return register_op(id, p, "xfx", led || function (left) {
			var right = expression(p + 1);
			this.node = node;
			this.pre = p;
			this.args = [left, right];
			if (left.pre >= this.led_lbp && right.pre >= this.led_rbp)
				return this;
			else
				return this.error("infixN: precedence error!");
		});
	};

	var relation = function (id, node) {
		return infixN(id, 70, null, node);
	};

	var assignment = function (id, node) {
		return infixN(id, 20, function (left) {
			var right = expression(21)
			this.node = node;
			this.pre = 20;
			this.args = [left, right];
			this.assignment = true;
			if (left.pre >= this.led_lbp && right.pre >= this.led_rbp)
				return this;
			else
				return this.error("assignment: precedence error!");
		});
	};

	symbol("(end)");
	symbol(",");

	nilfix("(number)", MAX_BP);
	nilfix("(string)", MAX_BP);
	nilfix("(symbol)", MAX_BP);

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
		this.pre = 220;
		this.args = a;
		return this;
	});

	symbol("]");
	infixL("[", 220, function (left) { // array access by index
		var a = [];
		while (true) {
			a.push(expression(0));
			if (token.id !== ",") {
				break;
			}
			advance(",");
		}
		advance("]");
		this.node = "ArrayAccessByIndex";
		this.pre = 220;
		this.value = left;
		this.args = a;
		return this;
	});

	prefix("(", 220, function () { // parentheses for grouping
		var right;
		right = expression(0);
		advance(")");
		this.pre = 220;
		this.args = [right];
		return this;
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
		this.pre = 220;
		this.value = left;
		this.args = a;
		return this;
	});

	suffix("++", 200, null, "PostIncrement"); // post increment
	suffix("--", 200, null, "PostDecrement"); // post decrement
	prefix("++", 190, null, "PreIncrement"); // pre increment
	prefix("--", 190, null, "PreDecrement"); // pre decrement
	suffix("!" , 180, null, "Factorial"); // factorial

	infixR("^" , 170, null, "Exponentiation"); // exponentiation

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
			this.node = "Multiplication";
			this.pre = MUL_BP;
			this.id = "*";
			this.value = "*";
			this.args = [minus_one, right];
			return this;
		}
	});

	infixL("*", MUL_BP, function (left) { // used as led
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
			result.pre = MUL_BP;
			result.id = "*";
			result.value = "*";
			result.args = [left, right];
			if (left.pre >= symbol_table["*"].led_lbp && right.pre >= symbol_table["*"].led_rbp)
				return result;
			else
				return left.error("led_multiplication: precedence error!");
		}		
	});

	infixL("/", MUL_BP, function (left) { // division
		var right;
		var result = {};
		right = expression(MUL_BP);
		result.value = "^";
		result.pre = 170;
		result.node = "Exponentiation";
		result.args = [right, minus_one];
		if (left.value === "*") {
			left.args.push(result);
			return left;
		} else if (left.value !== "*") {
			this.node = "Multiplication";
			this.pre = MUL_BP;
			this.id = "*";
			this.value = "*";
			this.args = [left, result];
			if (left.pre >= symbol_table["/"].led_lbp && result.pre >= symbol_table["/"].led_rbp)
				return this;
			else
				return this.error("'/': precedence error!");
		}
	});

	infixL("%", 140, null, "Modulo"); // modulo

	infixL("+", 130, function (left) { // addition
		var right;
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
			this.node = "Addition";
			this.pre = 130;
			this.id = "+";
			this.value = "+";
			this.args = [left, right];
			if (left.pre >= symbol_table["+"].led_lbp && right.pre >= symbol_table["+"].led_rbp)
				return this;
			else
				return this.error("'+': precedence error!");
		}
	});

	infixL("-", 130, function (left) { // subtraction
		var right;
		var result;
		right = expression(130);
		result = {};
		if (right.value === "*") {
			right.args = [minus_one].concat(right.args);
			result = right;
		} else if (right.value !== "*") {
			result.node = "Multiplication";
			result.pre = MUL_BP;
			result.id = "*";
			result.value = "*";
			result.args = [minus_one, right];
		}
		if (left.value === "+") {
			left.args.push(result);
			return left;
		} else if (left.value !== "+") {
			this.node = "Addition";
			this.pre = 130;
			this.id = "+";
			this.value = "+";
			this.args = [left, result];
			if (left.pre >= symbol_table["+"].led_lbp && result.pre >= symbol_table["+"].led_rbp)
				return this;
			else
				return this.error("'-': precedence error!");
		}
	});

	symbol(":");
	infixR("?", 30, function (left) { // conditional
		this.node = "ConditionalExpression";
		this.pre = this.led_pre;
		this.args = [left];
		this.args.push(expression(0));
		advance(":");
		this.args.push(expression(30)); // right associative, for left assoc use rbp = 31 here
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
			this.node = "CompoundExpression";
			this.pre = 10;
			this.id = ";";
			this.value = ";";
			this.args = [left, right];
			if (left.pre >= symbol_table[";"].led_lbp && right.pre >= symbol_table[";"].led_rbp)
				return this;
			else
				return this.error("';': precedence error!");
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
