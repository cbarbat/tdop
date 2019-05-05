// Parser for Mathematical Expressions 
// by Calin Barbat

var make_parse = function () {
	var symbol_table = {};
	var pptoken; // previous previous token
	var ptoken; // previous token
	var token; // current token
	var tokens; // lexed tokens
	var token_nr; // index of next token
	var newline_flag = 0;
	var paren_depth = 0;
	var brack_depth = 0;
	var MAX_PREC = 1; // highest precedence!
	var MUL_PREC = 80; // multiplication precedence 
	var MIN_PREC = 1200; // minimal precedence
	var implicit = true; // implicit multiplication allowed?

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

	var parse = function (op1, take_lef) {
		var newline_at_top_level;
		var pre1, lbp1, rbp1, pre2, lbp2, rbp2;
		var left;
		if (take_lef) {
			pre1 = op1.lef_pre;
			lbp1 = op1.lef_lbp;
			rbp1 = op1.lef_rbp;
		} else {
			pre1 = op1.nul_pre;
			lbp1 = op1.nul_lbp;
			rbp1 = op1.nul_rbp;
		}
		left = nul_type();
		while (left) {
			if (token.lef_typ) {
				pre2 = token.lef_pre;
				lbp2 = token.lef_lbp;
				rbp2 = token.lef_rbp;
			} else if (token.nul_typ && implicit) { // implicit multiplication
				pre2 = symbol_table["*"].lef_pre;
				lbp2 = symbol_table["*"].lef_lbp;
				rbp2 = symbol_table["*"].lef_rbp;
			} else 
				break; // exit because current token is of neither legal type 
			if (rbp1 < lbp2)
				break; // reduce
			if (rbp1 === lbp2) {
				if (pre1 < pre2) 
					break; // reduce
				if (pre1 === pre2) {
					if (rbp1 < pre1)
						op1.error("parse: two non-associative operators at same precedence!");
					if (rbp1 === pre1) {
						op1.error("parse: ambiguity - two associative operators at same precedence!");
					}
				}
			}
			// shift
			newline_at_top_level = ((newline_flag === 1) && (paren_depth === 0) && (brack_depth === 0));
			if ((!newline_at_top_level || !(token.nul_typ)) && token.lef_typ) {
				left = lef_type(left);
			} else if (!newline_at_top_level && token.nul_typ && !(token.lef_typ) && implicit) {
				left = impl_mul(left);
			} else
				break;
		}
		return left;
	}

	var nul_type = function () {
		if (ptoken && (["-", "+"].indexOf(ptoken.id) !== -1) && (["-", "+"].indexOf(token.id) !== -1))
			return token.error("nul_type: sign +/- not allowed after +/-");
		if (token.nul_typ === "NILFIX") {
			if (token.nul_den)
				return token.nul_den();
			else
				return nilfix();
		}
		if (token.nul_typ === "PREFIX") {
			if (token.nul_den)
				return token.nul_den();
			else
				return prefix();
		}
		return token.error("nul_type: undefined prefix/nilfix operator");
	}

	var nilfix = function () {
		var operator = token;
		advance();
		var result = find([], operator.nul_pat);
		operator.pre = operator.nul_pre;
		operator.list = result;
		return operator;
	}

	var prefix = function () {
		var operator = token;
		var p;
		advance();
		p = parse(operator, false);
		var result = find([], operator.nul_pat);
		operator.pre = operator.nul_pre;
		operator.rbp = operator.nul_rbp;
		operator.list = result;
		operator.right = p;
		if (p.pre <= operator.rbp)
			return operator;
		else
			operator.error("prefix: precedence error!");
	}

	var lef_type = function (left) {
		if (token.lef_typ === "SUFFIX") {
			if (token.lef_den)
				return token.lef_den(left)
			else
				return suffix(left);		
		}
		if (token.lef_typ === "INFIX") {
			if (token.lef_den)
				return token.lef_den(left)
			else
				return infix(left);		
		}
		return token.error("lef_type: undefined suffix/infix operator");
	}

	var suffix = function (lval) {
		var operator = token;
		advance();
		var result = find([], operator.lef_pat);
		operator.pre = operator.lef_pre;
		operator.lbp = operator.lef_lbp;
		operator.list = result;
		operator.left = lval;
		if (lval.pre <= operator.lbp)
			return operator;
		else	  
			operator.error("suffix: precedence error!");
	}

	var infix = function (lval) {
		var operator = token;
		advance();
		var p = parse(operator, true);
		var result = find([], operator.lef_pat);
		operator.pre = operator.lef_pre;
		operator.lbp = operator.lef_lbp;
		operator.rbp = operator.lef_rbp;
		operator.list = result;
		operator.left = lval;
		operator.right = p;  
		if (lval.pre <= operator.lbp && p.pre <= operator.rbp)
			return operator;
		else
			operator.error("infix: precedence error!");
	}

	var impl_mul = function (left) { // implicit multiplication
		var right, result;
		right = parse(symbol_table["*"], true);
		if (left.value === "*" && left.args) {
			left.args.push(right);
			return left;
		} else {
			result = Object.create(symbol_table["*"]);
			result.node = "Operator";
			result.pre = result.lef_pre;
			result.lbp = result.lef_lbp;
			result.rbp = result.lef_rbp;
			result.args = [left, right];
			if (left.pre <= result.lbp && right.pre <= result.rbp)
				return result;
			else
				result.error("impl_mul: precedence error!");
		}
	} 

	var find = function (left, pat) {
		var t;
		var p;
		if (pat[0] === "LAMB")
			return left;
		if (pat[0] === "CONC")
			return find(find(left, pat[1]), pat[2]);
		if (pat[0] === "UNIO") {
			if (member(token.value, first(pat[1])).length > 0)
				return find(left, pat[1]);
			if (member(token.value, first(pat[2])).length > 0)
				return find(left, pat[2]);
			if (lambda_p(pat))
				return left;
			return token.error("find: bad UNION");
		}
		if (pat[0] === "STAR") {
			if (member(token.value, first(pat[1])).length > 0)
				return find(find(left, pat[1]), pat);
			return left;
		}
		if (pat.length === 1 && pat[0] === token.value) {
			t = token;
			advance();
			return left.concat(t);
		}
		if (pat.length > 1 && pat[0] === token.value) {
			t = token;
			advance();
			p = parse(pat[1], true); // pat[1] === rbp
			return left.concat(t).concat([p]);
		}
		return token.error("find: at end");
	}

	var member = function (elem, list) {
		for (i = 0; i < list.length; i++)
			if (elem === list[i])
				return list.slice(i);
		return [];
	}

	var lambda_p = function (p) {
		if (p[0] === "LAMB")
			return true;
		if (p[0] === "STAR")
			return true;
		if (p[0] === "CONC")
			return (lambda_p(p[1]) && lambda_p(p[2]));
		if (p[0] === "UNIO")
			return (lambda_p(p[1]) || lambda_p(p[2]));
		return false;
	}

	var first = function (p) {
		if (p[0] === "LAMB")
			return [];
		if (p[0] === "STAR")
			return first(p[1]);
		if (p[0] === "CONC")
			return first(p[1]).concat(lambda_p(p[1]) ? first(p[2]) : []);
		if (p[0] === "UNIO")
			return first(p[1]).concat(first(p[2]));
		return [p[0]];
	}

	var original_symbol = {}

	var symbol = function (id) {
		var s = symbol_table[id];
		if (!s) {
			s = Object.create(original_symbol);
			s.id = id;
			s.value = id;
			symbol_table[id] = s;
		}
		return s;
	}

	var register_op = function (id, p, spec, pat, den) { // highest priority 0
		var s = symbol(id);
		switch (spec) {
			case "f"  : { s.nul_typ = "NILFIX"; s.nul_pre = p; s.nul_lbp = 0  ; s.nul_rbp = 0  ; s.nul_pat = pat; }; if (den) s.nul_den = den; break;
			case "fx" : { s.nul_typ = "PREFIX"; s.nul_pre = p; s.nul_lbp = 0  ; s.nul_rbp = p-1; s.nul_pat = pat; }; if (den) s.nul_den = den; break;
			case "fy" : { s.nul_typ = "PREFIX"; s.nul_pre = p; s.nul_lbp = 0  ; s.nul_rbp = p  ; s.nul_pat = pat; }; if (den) s.nul_den = den; break;
			case "xf" : { s.lef_typ = "SUFFIX"; s.lef_pre = p; s.lef_lbp = p-1; s.lef_rbp = 0  ; s.lef_pat = pat; }; if (den) s.lef_den = den; break;
			case "yf" : { s.lef_typ = "SUFFIX"; s.lef_pre = p; s.lef_lbp = p  ; s.lef_rbp = 0  ; s.lef_pat = pat; }; if (den) s.lef_den = den; break;
			case "xfx": { s.lef_typ = "INFIX" ; s.lef_pre = p; s.lef_lbp = p-1; s.lef_rbp = p-1; s.lef_pat = pat; }; if (den) s.lef_den = den; break;
			case "xfy": { s.lef_typ = "INFIX" ; s.lef_pre = p; s.lef_lbp = p-1; s.lef_rbp = p  ; s.lef_pat = pat; }; if (den) s.lef_den = den; break;
			case "yfx": { s.lef_typ = "INFIX" ; s.lef_pre = p; s.lef_lbp = p  ; s.lef_rbp = p-1; s.lef_pat = pat; }; if (den) s.lef_den = den; break;
			default   : spec.error("register_op: invalid specification!"); break;
		}
		return s;
	}

	var do_nilfix = function (id, p, pat, den) { return register_op(id, p, "f"  , pat, den); }
	var do_prefiN = function (id, p, pat, den) { return register_op(id, p, "fx" , pat, den); }
	var do_prefix = function (id, p, pat, den) { return register_op(id, p, "fy" , pat, den); }
	var do_suffiN = function (id, p, pat, den) { return register_op(id, p, "xf" , pat, den); }
	var do_suffix = function (id, p, pat, den) { return register_op(id, p, "yf" , pat, den); }
	var do_infixN = function (id, p, pat, den) { return register_op(id, p, "xfx", pat, den); }
	var do_infixR = function (id, p, pat, den) { return register_op(id, p, "xfy", pat, den); }
	var do_infixL = function (id, p, pat, den) { return register_op(id, p, "yfx", pat, den); }

	var minus_one = { // -1 literal constant
		node: "Number",
		pre: 0,
		id: "(number)",
		value: -1
	};

	// special symbols
	symbol("(end)");
	do_infixL("(start)", MIN_PREC + 1, ["LAMB"]); symbol_table["(start)"].lef_rbp = MIN_PREC + 1;
	
	// highest precedence symbols
	do_nilfix("(number)", 0, ["LAMB"]);
	do_nilfix("(string)", 0, ["LAMB"]);
	do_nilfix("(symbol)", 0, ["LAMB"]);
	
	do_prefix("(", MIN_PREC + 1, [")"], function () { // parentheses for grouping
		var right, result;
		advance();
		right = parse(symbol_table["(start)"], true);
		result = find([], this.nul_pat);
		this.pre = this.nul_pre;
		this.rbp = this.nul_rbp;
		this.list = result;
		this.right = right;
		if (right.pre <= this.rbp)
			return this;
		else
			this.error("'(': precedence error!");
	}); symbol(")"); symbol_table["("].nul_pre = 0;

	do_prefix("[", MIN_PREC + 1, ["]"], function () { // array definition
		var a = [];
		if (token.id !== "]") {
			advance();
			while (true) {
				a.push(parse(symbol_table["(start)"], true));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		result = find([], this.nul_pat);
		this.pre = this.nul_pre;
		this.rbp = this.nul_rbp;
		this.list = result;
		this.args = a;
		return this;
	}); symbol(","); symbol("]"); symbol_table["["].nul_pre = 0;

	do_infixL("[", 10, ["]"], function (left) { // array access
		var a = [];
		if (token.id !== "]") {
			advance();
			while (true) {
				a.push(parse(symbol_table["(start)"], true));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		result = find([], this.nul_pat);
		this.pre = this.nul_pre;
		this.rbp = this.nul_rbp;
		this.list = result;
		this.left = left;
		this.args = a;
		return this;
	});

	do_infixL("(", 20, [")"], function (left) { // function call
		var a = [];
		if (token.id !== ")") {
			advance();
			while (true) {
				a.push(parse(symbol_table["(start)"], true));
				if (token.id !== ",") {
					break;
				}
				advance(",");
			}
		}
		result = find([], this.nul_pat);
		this.pre = this.nul_pre;
		this.rbp = this.nul_rbp;
		this.list = result;
		this.left = left;
		this.args = a;
		return this;
	});
	
	do_suffix("++", 30, ["LAMB"]);
	do_suffix("--", 30, ["LAMB"]);
	
	do_prefix("++", 40, ["LAMB"]);
	do_prefix("--", 40, ["LAMB"]);
	
	do_suffix("!", 50, ["LAMB"]); // factorial symbol_table["!"].lef_pre = 0;

	do_infixR("^", 60, ["LAMB"]);
	
	do_prefix("+", 70, ["LAMB"]); //symbol_table["+"].nul_pre = 0;
	do_prefix("-", 70, ["LAMB"]); //symbol_table["-"].nul_pre = 0;
	
	do_infixL("*", MUL_PREC, ["LAMB"], function (left) { // multiplication
		var right, result;
		advance();
		right = parse(this, true);
		if (left.value === "*" && left.args) {
			left.args.push(right);
			return left;
		} else {
			result = Object.create(symbol_table["*"]);
			result.node = "Operator";
			result.pre = result.lef_pre;
			result.lbp = result.lef_lbp;
			result.rbp = result.lef_rbp;
			result.args = [left, right];
			if (left.pre <= result.lbp && right.pre <= result.rbp)
				return result;
			else
				result.error("'*': precedence error!");
		}
	});
	
	do_infixL("/", MUL_PREC, ["LAMB"], function (left) { // division
		var p, right, result;
		advance();
		p = parse(this, true);
		/*
		if ((q.node === "Operator" && q.value !== "(")|| q.node === "Reserved") {
			p = Object.create(symbol_table["("]);
			p.node = "Operator";
			p.pre = p.nul_pre;
			p.lbp = p.nul_lbp;
			p.rbp = p.nul_rbp;
			p.right = q;
			p.list = [{node:"Operator", value:")"}];
		} else
			p = q;
		*/		
		right = Object.create(symbol_table["^"]);
		right.node = "Operator";
		right.pre = right.lef_pre;
		right.lbp = right.lef_lbp;
		right.rbp = right.lef_rbp;
		right.left = p;
		right.right = minus_one;
		if (left.value === "*") {
			left.args.push(right);
			return left;
		} else if (left.value !== "*") {
			result = Object.create(symbol_table["*"]);
			result.node = "Operator";
			result.pre = result.lef_pre;
			result.lbp = result.lef_lbp;
			result.rbp = result.lef_rbp;
			result.args = [left, right];
			if (left.pre <= result.lbp && right.pre <= result.rbp)
				return result;
			else
				result.error("'/': precedence error!");
		}
	});
	
	do_infixL("%", 90, ["LAMB"]); // modulo
	
	do_infixL("+", 100, ["LAMB"], function (left) { // addition
		var right, result;
		advance();
		right = parse(this, true);
		if (left.value === "+" && left.args) {
			left.args.push(right);
			return left;
		} else {
			result = Object.create(symbol_table["+"]);
			result.node = "Operator";
			result.pre = result.lef_pre;
			result.lbp = result.lef_lbp;
			result.rbp = result.lef_rbp;
			result.args = [left, right];
			if (left.pre <= result.lbp && right.pre <= result.rbp)
				return result;
			else
				result.error("'+': precedence error!");
		}
	}); 

	do_infixL("-", 100, ["LAMB"], function (left) { // subtraction
		var p, right, result;
		advance();
		p = parse(this, true);
		right = {};
		if (p.node === "Number") {
			right = Object.create(symbol_table["-"]);
			right.node = "Operator";
			right.pre = right.nul_pre;
			right.rbp = right.nul_rbp;
			right.right = p;
			right.list = [];
		} else if (p.value === "*") {
			p.args = [minus_one].concat(p.args);
			right = p;
		} else if (p.value !== "*") {
			right.node = "Operator";
			right.pre = MUL_PREC;
			right.id = "*";
			right.value = "*";
			right.args = [minus_one, p];
		} 
		if (left.value === "+" && left.args) {
			left.args.push(right);
			return left;
		} else {
			result = Object.create(symbol_table["+"]);
			result.node = "Operator";
			result.pre = result.lef_pre;
			result.lbp = result.lef_lbp;
			result.rbp = result.lef_rbp;
			result.args = [left, right];
			if (left.pre <= result.lbp && right.pre <= result.rbp)
				return result;
			else
				result.error("'-': precedence error!");
		}
	});
		
	do_prefix("~", 110, ["LAMB"]); // bit not
	
	do_infixL("<<", 120, ["LAMB"]);
	do_infixL(">>", 120, ["LAMB"]);
	do_infixL(">>>", 120, ["LAMB"]); // right shift unsigned
	
	do_infixL("&", 130, ["LAMB"]);
	do_infixL("#", 140, ["LAMB"]); // bit xor
	do_infixL("|", 150, ["LAMB"]); // bit or
	
	do_infixN("<", 160, ["LAMB"]);
	do_infixN("<=", 160, ["LAMB"]);
	do_infixN(">", 160, ["LAMB"]);
	do_infixN(">=", 160, ["LAMB"]);
	do_infixN("==", 160, ["LAMB"]);
	do_infixN("!=", 160, ["LAMB"]);

	do_prefix("!", 170, ["LAMB"]) // logical not
	do_infixL("&&", 180, ["LAMB"]);
	do_infixL("||", 190, ["LAMB"]);
	
	do_infixL("(:)", 200, ["LAMB"]); symbol_table["(:)"].lef_rbp = 200;
	do_infixR("?", 200, [":", symbol_table["(:)"]]); symbol(":"); symbol_table["?"].lef_rbp = MIN_PREC + 1;
	
	do_infixR("=", 210, ["LAMB"]);
	do_infixR("^=", 210, ["LAMB"]);
	do_infixR("*=", 210, ["LAMB"]);
	do_infixR("/=", 210, ["LAMB"]);
	do_infixR("%=", 210, ["LAMB"]);
	do_infixR("+=", 210, ["LAMB"]);
	do_infixR("-=", 210, ["LAMB"]);
	do_infixR("<<=", 210, ["LAMB"]);
	do_infixR(">>=", 210, ["LAMB"]);
	do_infixR(">>>=", 210, ["LAMB"]); // right shift unsigned
	do_infixR("&=", 210, ["LAMB"]);
	do_infixR("#=", 210, ["LAMB"]); // bit xor
	do_infixR("|=", 210, ["LAMB"]);
	
	do_infixL(";", 220, ["LAMB"], function (left) { // compound expression - a;b;c ok, a;; not ok
		var right, result;
		advance();
		right = parse(this, true);
		if (left.value === ";" && left.args) {
			left.args.push(right);
			return left;
		} else {
			result = Object.create(symbol_table[";"]);
			result.node = "Operator";
			result.pre = result.lef_pre;
			result.lbp = result.lef_lbp;
			result.rbp = result.lef_rbp;
			result.args = [left, right];
			if (left.pre <= result.lbp && right.pre <= result.rbp)
				return result;
			else
				result.error("';': precedence error!");
		}
	});
	
	return function (source) {
		var result = [];
		tokens = source.math_tokens(["++","--","<<",">>",">>>","<=",">=","==","!=","&&","||","^=","*=","/=","%=","+=","-=","<<=",">>=",">>>=","&=","#=","|="]);
		token_nr = 0;
		if (tokens) {
			pptoken = null;
			ptoken = null;
			advance();
			do {
				if (token.id !== "(end)") {
					result.push(parse(symbol_table["(start)"], true));
				} else {
					break;
				}
			} while (newline_flag === 1);
			advance("(end)");
		}
		return result;
	}
}