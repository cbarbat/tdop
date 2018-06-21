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
	var MIN_BP = 1; // minimal binding power (highest precedence!)
	var MUL_BP = 150; // multiplication binding power
	var MAX_BP = 1200; // maximal binding power
	var implicit = true; // implicit multiplication allowed?
	var assoc_to_left = false; // at same precedence associate to the left-associative operator or to the right-associative operator?

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

	var isN = function (pre, lbp, rbp) {
		return ((pre === lbp + 1 && pre > rbp) || (pre === rbp + 1 && pre > lbp))
	}
	
	var isL = function (pre, lbp, rbp) {
		return (pre === lbp && pre > rbp)
	}
	
	var isR = function (pre, lbp, rbp) {
		return (pre === rbp && pre > lbp)
	}
	
	var parse = function (op1, take_lef) {
		var newline_at_top_level;
		var pre1, lbp1, rbp1, pre2, lbp2, rbp2;
		var left;
		if (take_lef) {
			pre1 = symbol_table[op1.id].lef_pre;
			lbp1 = symbol_table[op1.id].lef_lbp;
			rbp1 = symbol_table[op1.id].lef_rbp;
		} else {
			pre1 = symbol_table[op1.id].nul_pre;
			lbp1 = symbol_table[op1.id].nul_lbp;
			rbp1 = symbol_table[op1.id].nul_rbp;
		}
		left = nul_type();
		while (left) {
			if (symbol_table[token.id].lef_typ) {
				pre2 = symbol_table[token.id].lef_pre;
				lbp2 = symbol_table[token.id].lef_lbp;
				rbp2 = symbol_table[token.id].lef_rbp;
			} else if (symbol_table[token.id].nul_typ && implicit) { // implicit multiplication
				pre2 = symbol_table["*"].lef_pre;
				lbp2 = symbol_table["*"].lef_lbp;
				rbp2 = symbol_table["*"].lef_rbp;
			} else {
				pre2 = MAX_BP + 1;
				lbp2 = MAX_BP + 1;
				rbp2 = MAX_BP + 1;
			}
			if (pre1 < pre2) // op1 has higher precedence than op2
				break;
			if (pre1 === pre2) { // op1 has same precedence as op2
				if (isN(pre1, lbp1, rbp1))
					return op1.error("parse: non-associative operator!");
				if (isN(pre2, lbp2, rbp2))
					return token.error("parse: non-associative operator!");
				if (isL(pre1, lbp1, rbp1) && isR(pre2, lbp2, rbp2))
					if (assoc_to_left)
						break;
				if (isR(pre1, lbp1, rbp1) && isL(pre2, lbp2, rbp2))
					if (!assoc_to_left)
						break;
				if (isL(pre1, lbp1, rbp1) && isL(pre2, lbp2, rbp2))
					break;
/*			
				if ((rbp1 <= lbp2) &&
					!(rbp1 === lbp2 && !assoc_to_left && symbol_table[token.id].lef_typ && lbp2 < rbp2) && // at same precedence associate to the right-associative operator
				    !(rbp1 === lbp2 &&  assoc_to_left && symbol_table[token.id].lef_typ && lbp1 <= rbp1)) // at same precedence associate to the left-associative operator
					break;
*/
			}
			newline_at_top_level = ((newline_flag === 1) && (paren_depth === 0) && (brack_depth === 0));
			if ((!newline_at_top_level || !(symbol_table[token.id].nul_typ)) && symbol_table[token.id].lef_typ) {
				left = lef_type(left);
			} else if (!newline_at_top_level && symbol_table[token.id].nul_typ && !(symbol_table[token.id].lef_typ) && implicit) {
				left = impl_mul(left, symbol_table["*"]);
			} else
				break;
		}
		return left;
	}

	var nul_type = function () {
		if (ptoken && (["-", "+"].indexOf(ptoken.id) !== -1) && (["-", "+"].indexOf(token.id) !== -1))
			return token.error("nul_type: sign +/- not allowed after +/-");
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].nul_typ === "NILFIX")
			return nilfix(token);
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].nul_typ === "PREFIX")
			return prefix(token);
		return token.error("nul_type: undefined prefix/nilfix operator");
	}

	var nilfix = function (operator) {
		advance();
		var result = find([], symbol_table[operator.id].nul_pat);
		operator.pre = symbol_table[operator.id].nul_pre;
		operator.list = result;
		return operator;
	}

	var prefix = function (operator) {
		var p;
		advance();
		if (operator.id === "(")
			p = parse(symbol_table["(start)"], true);
		else
			p = parse(operator, false);
		var result = find([], symbol_table[operator.id].nul_pat);
		operator.pre = symbol_table[operator.id].nul_pre;
		operator.rbp = symbol_table[operator.id].nul_rbp;
		operator.list = result;
		operator.right = p;
		if (p.pre <= operator.rbp)
			return operator;
		else
			operator.error("prefix: precedence error!");
	}

	var lef_type = function (left) {
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].lef_typ === "SUFFIX")
			return suffix(left, token);
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].lef_typ === "INFIX")
			return infix(left, token);
		return token.error("lef_type: undefined suffix/infix operator");
	}

	var suffix = function (lval, operator) {
		advance();
		var result = find([], symbol_table[operator.id].lef_pat);
		operator.pre = symbol_table[operator.id].lef_pre;
		operator.lbp = symbol_table[operator.id].lef_lbp;
		operator.list = result;
		operator.left = lval;
		if (lval.pre <= operator.lbp)
			return operator;
		else	  
			operator.error("suffix: precedence error!");
	}

	var infix = function (lval, operator) {
		advance();
		var p = parse(operator, true);
		var result = find([], symbol_table[operator.id].lef_pat);
		operator.pre = symbol_table[operator.id].lef_pre;
		operator.lbp = symbol_table[operator.id].lef_lbp;
		operator.rbp = symbol_table[operator.id].lef_rbp;
		operator.list = result;
		operator.left = lval;
		operator.right = p;  
		//if (lval[0].pre <= operator.lbp && p[0].pre <= operator.rbp)
			return operator;
		//else
		//	operator.error("infix: precedence error!");
	}

	var impl_mul = function (lval, operator) {
		var p = parse(operator, true);
		var result = find([], symbol_table[operator.id].lef_pat);
		operator.pre = symbol_table[operator.id].lef_pre;
		operator.lbp = symbol_table[operator.id].lef_lbp;
		operator.rbp = symbol_table[operator.id].lef_rbp;
		operator.list = result;
		operator.left = lval;
		operator.right = p;
		if (lval.pre <= operator.lbp && p.pre <= operator.rbp)
			return operator;
		else
			operator.error("impl_mul: precedence error!");
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

	var register_op = function (id, p, spec, pat) { // highest priority 0
		var s = symbol(id);
		switch (spec) {
			case "f"  : { s.nul_typ = "NILFIX"; s.nul_pre = p; s.nul_lbp = 0  ; s.nul_rbp = 0  ; s.nul_pat = pat; }; break;
			case "fx" : { s.nul_typ = "PREFIX"; s.nul_pre = p; s.nul_lbp = 0  ; s.nul_rbp = p-1; s.nul_pat = pat; }; break;
			case "fy" : { s.nul_typ = "PREFIX"; s.nul_pre = p; s.nul_lbp = 0  ; s.nul_rbp = p  ; s.nul_pat = pat; }; break;
			case "xf" : { s.lef_typ = "SUFFIX"; s.lef_pre = p; s.lef_lbp = p-1; s.lef_rbp = 0  ; s.lef_pat = pat; }; break;
			case "yf" : { s.lef_typ = "SUFFIX"; s.lef_pre = p; s.lef_lbp = p  ; s.lef_rbp = 0  ; s.lef_pat = pat; }; break;
			case "xfx": { s.lef_typ = "INFIX" ; s.lef_pre = p; s.lef_lbp = p-1; s.lef_rbp = p-1; s.lef_pat = pat; }; break;
			case "xfy": { s.lef_typ = "INFIX" ; s.lef_pre = p; s.lef_lbp = p-1; s.lef_rbp = p  ; s.lef_pat = pat; }; break;
			case "yfx": { s.lef_typ = "INFIX" ; s.lef_pre = p; s.lef_lbp = p  ; s.lef_rbp = p-1; s.lef_pat = pat; }; break;
			default   : spec.error("register_op: invalid specification!"); break;
		}
		return s;
	}

	var do_nilfix = function (id, pat) {
		return register_op(id, 0, "f", pat);
	}

	var do_prefiN = function (id, p, pat) {
		return register_op(id, p, "fx", pat);
	}

	var do_prefix = function (id, rbp, pat) {
		return register_op(id, rbp, "fy", pat);
	}

	var do_suffiN = function (id, p, pat) {
		return register_op(id, p, "xf", pat);
	}

	var do_suffix = function (id, lbp, pat) {
		return register_op(id, lbp, "yf", pat);
	}

	var do_infixN = function (id, p, pat) {
		return register_op(id, p, "xfx", pat);
	}

	var do_infixR = function (id, rbp, pat) {
		return register_op(id, rbp, "xfy", pat);
	}

	var do_infixL = function (id, lbp, pat) {
		return register_op(id, lbp, "yfx", pat);
	}
	
	// special symbols
	symbol("(end)");
	do_infixL("(start)", MAX_BP + 1, ["LAMB"]); 
	symbol_table["(start)"].lef_rbp = MAX_BP + 1;
	
	// normal symbols
	do_nilfix("(number)", ["LAMB"]);
	do_nilfix("(string)", ["LAMB"]);
	do_nilfix("(symbol)", ["LAMB"]);
	do_infixN("=", 190, ["LAMB"]);
	do_infixR("?", 185, [":", 185]); symbol(":"); symbol_table["?"].lef_rbp = MAX_BP + 1;
	
	do_infixN("@@", 180, ["LAMB"]);
	do_infixL("<@", 180, ["LAMB"]);
	do_infixR("@>", 180, ["LAMB"]);
	do_prefix("@!", 180, ["LAMB"]);
	do_prefiN("@#", 180, ["LAMB"]);
	do_suffix("!@", 180, ["LAMB"]);
	do_suffiN("#@", 180, ["LAMB"]);
	
	do_infixL("+", 170, ["LAMB"]);
	do_infixL("-", 170, ["LAMB"]);
	do_prefix("+", 160, ["LAMB"]);
	do_prefix("-", 160, ["LAMB"]);
	do_infixL("*", MUL_BP, ["LAMB"]); symbol_table["*"].node = "Operator";
	do_infixL("/", MUL_BP, ["LAMB"]);
	do_infixR("^", 140, ["LAMB"]);
	do_suffix("!", 130, ["LAMB"]);
	do_prefix("(", MAX_BP + 1, [")"]); symbol(")"); symbol_table["("].nul_pre = 0;
	do_prefix("if", MAX_BP + 1, ["CONC", ["then", symbol_table["(start)"]], ["UNIO", ["else", symbol_table["(start)"]], ["LAMB"]]]); symbol("then"); symbol("else");
	do_nilfix("switch", ["STAR", ["case"]]); symbol("case");

	return function (source) {
		var result = [];
		tokens = source.math_tokens("!#%&*+-/<=>^|@", "@&+-<=>|#!");
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
