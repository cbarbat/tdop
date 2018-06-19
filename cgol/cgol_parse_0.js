// Parser for Mathematical Expressions
// by Calin Barbat

var make_parse = function () {
	var symbol_table = {};
	var tokens; // lexed tokens

	var parse = function (rbp, string) {
		return assoc(rbp, nul_type(string));
	}

	var assoc = function (rbp, state) {
		if (state.length > 1 && state[1].value && symbol_table[state[1].value] && rbp < symbol_table[state[1].value].lbp)
			return assoc(rbp, lef_type(state));
		return state;
	}

	var nul_type = function (string) {
		if (string.slice(0).length === 0)
			return string[0].error("nul_type: length === 0");
		if (symbol_table[string[0].value] && symbol_table[string[0].value].nul_typ === "NILFIX")
			return nilfix(string[0], string.slice(1), symbol_table[string[0].value].nul_rbp, symbol_table[string[0].value].nul_pat);
		if (symbol_table[string[0].value] && symbol_table[string[0].value].nul_typ === "PREFIX")
			return prefix(string[0], string.slice(1), symbol_table[string[0].value].nul_rbp, symbol_table[string[0].value].nul_pat);
		return nilfix(string[0], string.slice(1), 0, ["LAMB"]);
	}

	var nilfix = function (operator, rest, rbp, pat) {
		var result = find([[]].concat(rest), pat);
		return [[operator].concat(result[0])].concat(result.slice(1));
	}

	var prefix = function (operator, rest, rbp, pat) {
		var p = parse(rbp, rest);
		var result = find([[]].concat(p.slice(1)), pat);
		return [[operator].concat([["RIGHT", p[0]]]).concat(result[0])].concat(result.slice(1));
	}
	
	var lef_type = function (state) {
		if (state.slice(1).length === 0)
			return state[0].error("lef_type: length === 0");
		if (state[1].value && symbol_table[state[1].value].lef_typ === "POSTFIX")
			return postfix(state[0], state[1], state.slice(2), symbol_table[state[1].value].lef_rbp, symbol_table[state[1].value].lef_pat);
		if (state[1].value && symbol_table[state[1].value].lef_typ === "INFIX")
			return infix(state[0], state[1], state.slice(2), symbol_table[state[1].value].lef_rbp, symbol_table[state[1].value].lef_pat);
		return string[0].error("lef_type: undefined infix operator");
	}
	var postfix = function (lval, operator, rest, rbp, pat) {
		var result = find([[]].concat(rest), pat);
		return [[operator].concat([["LEFT", lval]]).concat(result[0])].concat(result.slice(1));
	}

	var infix = function (lval, operator, rest, rbp, pat) {
		var p = parse(rbp, rest);
		var result = find([[]].concat(p.slice(1)), pat);
		return [[operator].concat([["LEFT", lval]]).concat([["RIGHT", p[0]]]).concat(result[0])].concat(result.slice(1));
	}

	var find = function (state, pat) {
		if (pat[0] === "LAMB")
			return state;
		if (pat[0] === "CONC")
			return find(find(state, pat[1]), pat[2]);
		if (pat[0] === "UNIO") {
			if (state.length > 1 && member(state[1].value, first(pat[1])).length > 0)
				return find(state, pat[1]);
			if (state.length > 1 && member(state[1].value, first(pat[2])).length > 0)
				return find(state, pat[2]);
			if (lambda_p(pat))
				return state;
			return state[0].error("find: bad UNION");
		};
		if (pat[0] === "STAR") {
			if (state.length > 1 && member(state[1].value, first(pat[1])).length > 0)
				return find(find(state, pat[1]), pat);
			return state;
		};
		if (pat.length === 1 && state.length > 1 && pat[0] === state[1].value)
			return [state[0].concat(state[1])].concat(state.slice(2));
		if (state.length > 1 && pat[0] === state[1].value) {
			var result = parse(pat[1], state.slice(2)); // pat[1] === rbp
			return [state[0].concat(state[1]).concat([result[0]])].concat(result.slice(1));
		};
		return state[0].error("find: at end");
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

	var original_symbol = {};

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
	};

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
	};

	var do_prefix = function (id, rbp, pat) {
		return register_nul(id, "PREFIX", rbp, pat);
	};

	var do_suffix = function (id, bp, pat) {
		return register_lef(id, "POSTFIX", bp, 0, pat);
	};

	var do_infixL = function (id, bp, pat) {
		return register_lef(id, "INFIX", bp, bp, pat);
	};

	var do_infixR = function (id, bp, pat) {
		return register_lef(id, "INFIX", bp, bp - 1, pat);
	};

	do_prefix("+", 130, ["LAMB"]);
	do_prefix("-", 130, ["LAMB"]);
	do_infixL("+", 130, ["LAMB"]);
	do_infixL("-", 130, ["LAMB"]);
	do_infixL("*", 150, ["LAMB"]);
	do_infixL("/", 150, ["LAMB"]);
	do_infixR("^", 160, ["LAMB"]);
	do_suffix("!", 170, ["LAMB"]);
	do_prefix("if",  0, ["CONC", ["then", 0], ["UNIO", ["else", 0], ["LAMB"]]]);
	do_nilfix("switch", ["STAR", ["case"]]);

	return function (source) {
		var result = [];
		tokens = source.math_tokens("!#%&*+-/<=>^|", "&+-<=>|");
		token_nr = 0;
		if (tokens) {
			result = parse(0, tokens);
		}
		return result;
	};
};
