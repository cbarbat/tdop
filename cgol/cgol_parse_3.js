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
	var MIN_BP = 0; // minimal binding power
	var MUL_BP = 150; // multiplication binding power
	var MAX_BP = 10000; // maximal binding power
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

	var parse = function (rbp) {
		var newline_at_top_level;
		var left;
		var lbp;

		left = nul_type();
		while (left) {
			if (symbol_table[token.id].lef_typ)
				lbp = symbol_table[token.id].lbp;
			else if (symbol_table[token.id].nul_typ && implicit)
				lbp = MUL_BP;
			else
				lbp = MIN_BP;
			if (!(rbp < lbp))
				break;
			newline_at_top_level = ((newline_flag === 1) && (paren_depth === 0) && (brack_depth === 0)); // Eigenmath lacks && (paren_depth === 0) && (brack_depth === 0);
			if ((!newline_at_top_level || !(symbol_table[token.id].nul_typ)) && symbol_table[token.id].lef_typ) { // Mathematica lacks t.nud === null
				left = lef_type(left);
			} else if (!newline_at_top_level && symbol_table[token.id].nul_typ && !(symbol_table[token.id].lef_typ) && implicit) {
				left = impl_mul(left, symbol_table["*"], symbol_table["*"].lef_rbp, symbol_table["*"].lef_pat);
			} else
				break;
		}
		return left;
	}

	var nul_type = function () {
		if (ptoken && (["-", "+"].indexOf(ptoken.id) !== -1) && (["-", "+"].indexOf(token.id) !== -1))
			return token.error("nul_type: sign +/- not allowed after +/-");
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].nul_typ === "NILFIX")
			return nilfix(token, symbol_table[token.id].nul_rbp, symbol_table[token.id].nul_pat);
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].nul_typ === "PREFIX")
			return prefix(token, symbol_table[token.id].nul_rbp, symbol_table[token.id].nul_pat);
		return token.error("nul_type: undefined prefix/nilfix operator");
	}

	var nilfix = function (operator, rbp, pat) {
		advance();
		var result = find([], pat);
		return [operator].concat(result);
	}

	var prefix = function (operator, rbp, pat) {
		advance();
		var p = parse(rbp);
		var result = find([], pat);
		return [operator].concat([["RIGHT", p]]).concat(result);
	}

	var lef_type = function (left) {
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].lef_typ === "POSTFIX")
			return postfix(left, token, symbol_table[token.id].lef_rbp, symbol_table[token.id].lef_pat);
		if (token && token.id && symbol_table[token.id] && symbol_table[token.id].lef_typ === "INFIX")
			return infix(left, token, symbol_table[token.id].lef_rbp, symbol_table[token.id].lef_pat);
		return token.error("lef_type: undefined postfix/infix operator");
	}

	var postfix = function (lval, operator, rbp, pat) {
		advance();
		var result = find([], pat);
		return [operator].concat([["LEFT", lval]]).concat(result);
	}

	var infix = function (lval, operator, rbp, pat) {
		advance();
		var p = parse(rbp);
		var result = find([], pat);
		return [operator].concat([["LEFT", lval]]).concat([["RIGHT", p]]).concat(result);
	}

	var impl_mul = function (lval, operator, rbp, pat) {
		var p = parse(rbp);
		var result = find([], pat);
		return [operator].concat([["LEFT", lval]]).concat([["RIGHT", p]]).concat(result);
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
			p = parse(pat[1]); // pat[1] === rbp
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
			s.lbp = 0;
		}
		return s;
	}

	var register_nul = function (id, nul_typ, nul_rbp, nul_pat) {
		var s = symbol(id);
		s.nul_typ = nul_typ;
		s.nul_rbp = nul_rbp;
		s.nul_pat = nul_pat;
		return s;
	}

	var register_lef = function (id, lef_typ, lbp, lef_rbp, lef_pat) {
		var s = symbol(id);
		s.lef_typ = lef_typ;
		s.lbp = lbp;
		s.lef_rbp = lef_rbp;
		s.lef_pat = lef_pat;
		return s;
	}

	var do_nilfix = function (id, pat) {
		return register_nul(id, "NILFIX", 0, pat);
	}

	var do_prefix = function (id, rbp, pat) {
		return register_nul(id, "PREFIX", rbp, pat);
	}

	var do_suffix = function (id, bp, pat) {
		return register_lef(id, "POSTFIX", bp, 0, pat);
	}

	var do_infixL = function (id, bp, pat) {
		return register_lef(id, "INFIX", bp, bp, pat);
	}

	var do_infixR = function (id, bp, pat) {
		return register_lef(id, "INFIX", bp, bp - 1, pat);
	}

	symbol("(end)");
	do_nilfix("(number)", ["LAMB"]);
	do_nilfix("(string)", ["LAMB"]);
	do_nilfix("(symbol)", ["LAMB"]);
	do_prefix("+", 130, ["LAMB"]);
	do_prefix("-", 130, ["LAMB"]);
	do_infixL("+", 130, ["LAMB"]);
	do_infixL("-", 130, ["LAMB"]);
	do_infixL("*", 150, ["LAMB"]);
	symbol_table["*"].node = "Operator";
	do_infixL("/", 150, ["LAMB"]);
	do_infixR("^", 160, ["LAMB"]);
	do_suffix("!", 170, ["LAMB"]);
	symbol(")");
	do_prefix("(", 0, [")"]);
	symbol("then");
	symbol("else");
	do_prefix("if", 0, ["CONC", ["then", 0], ["UNIO", ["else", 0], ["LAMB"]]]);
	symbol("case");
	do_nilfix("switch", ["STAR", ["case"]]);

	return function (source) {
		var result = [];
		tokens = source.math_tokens("!#%&*+-/<=>^|", "&+-<=>|");
		token_nr = 0;
		if (tokens) {
			pptoken = null;
			ptoken = null;
			advance();
			do {
				if (token.id !== "(end)") {
					result.push(parse(0));
				} else {
					break;
				}
			} while (newline_flag === 1);
			advance("(end)");
		}
		return result;
	}
}
