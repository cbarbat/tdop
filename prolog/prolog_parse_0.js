// parse.js
// Parser for Mathematical Expressions

var make_parse = function () {
	var symbol_table = {};
	var tokens; // lexed tokens

	var parse = function (rbp, string) {
		return assoc(rbp, nul_type(string));
	}

	var assoc = function (rbp, state) {
		if (state.length > 1 && state[1].value && symbol_table[state[1].value] && rbp > symbol_table[state[1].value].lef_lbp)
			return assoc(rbp, lef_type(state));
		return state;
	}

	var nul_type = function (string) {
		if (string.slice(0).length === 0)
			return string[0].error("nul_type: length === 0");
		if (symbol_table[string[0].value] && symbol_table[string[0].value].nul_typ === "NILFIX")
			return nilfix(string[0], string.slice(1), symbol_table[string[0].value].nul_rbp);
		if (symbol_table[string[0].value] && symbol_table[string[0].value].nul_typ === "PREFIX")
			return prefix(string[0], string.slice(1), symbol_table[string[0].value].nul_rbp);
		return nilfix(string[0], string.slice(1), 1000);
	}

	var nilfix = function (operator, rest, rbp) {
		return [[operator]].concat(rest);
	}

	var prefix = function (operator, rest, rbp) {
		var p = parse(rbp, rest);
		return [[operator].concat([["RIGHT", p[0]]])].concat(p.slice(1));
	}
	
	var lef_type = function (state) {
		if (state.slice(1).length === 0)
			return state[0].error("lef_type: length === 0");
		if (state[1].value && symbol_table[state[1].value].lef_typ === "POSTFIX")
			return postfix(state[0], state[1], state.slice(2), symbol_table[state[1].value].lef_rbp);
		if (state[1].value && symbol_table[state[1].value].lef_typ === "INFIX")
			return infix(state[0], state[1], state.slice(2), symbol_table[state[1].value].lef_rbp);
		return string[0].error("lef_type: undefined infix operator");
	}
	
	var postfix = function (lval, operator, rest, rbp) {
		return [[operator].concat([["LEFT", lval]])].concat(rest);
	}

	var infix = function (lval, operator, rest, rbp) {
		var p = parse(rbp, rest);
		return [[operator].concat([["LEFT", lval]]).concat([["RIGHT", p[0]]])].concat(p.slice(1));
	}

	var original_symbol = {};

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

	var register_op = function (id, p, spec) {
		var s = symbol(id);
		switch (spec) {
			case "f"  : { s.nul_typ = "NILFIX" ; s.nul_prec = p; s.nul_lbp = 0  ; s.nul_rbp = 0  ; }; break;
			case "fx" : { s.nul_typ = "PREFIX" ; s.nul_prec = p; s.nul_lbp = 0  ; s.nul_rbp = p-1; }; break;
			case "fy" : { s.nul_typ = "PREFIX" ; s.nul_prec = p; s.nul_lbp = 0  ; s.nul_rbp = p  ; }; break;
			case "xf" : { s.lef_typ = "POSTFIX"; s.lef_prec = p; s.lef_lbp = p-1; s.lef_rbp = 0  ; }; break;
			case "yf" : { s.lef_typ = "POSTFIX"; s.lef_prec = p; s.lef_lbp = p  ; s.lef_rbp = 0  ; }; break;
			case "xfx": { s.lef_typ = "INFIX"  ; s.lef_prec = p; s.lef_lbp = p-1; s.lef_rbp = p-1; }; break;
			case "xfy": { s.lef_typ = "INFIX"  ; s.lef_prec = p; s.lef_lbp = p-1; s.lef_rbp = p  ; }; break;
			case "yfx": { s.lef_typ = "INFIX"  ; s.lef_prec = p; s.lef_lbp = p  ; s.lef_rbp = p-1; }; break;
			default   : spec.error("Invalid specification in register_op!"); break;
		}
		return s;
	}

	var do_nilfix = function (id) {
		return register_op(id, 0, "f");
	};

	var do_prefix = function (id, rbp) {
		return register_op(id, rbp, "fy");
	};

	var do_suffix = function (id, lbp) {
		return register_op(id, lbp, "yf");
	};

	var do_infixL = function (id, lbp) {
		return register_op(id, lbp, "yfx");
	};

	var do_infixR = function (id, rbp) {
		return register_op(id, rbp, "xfy");
	};

	var do_infixN = function (id, p) {
		return register_op(id, p, "xfx");
	};

	do_infixN("=", 190);
	do_infixR("<", 180);
	do_infixL(">", 180);
	do_prefix("+", 170);
	do_prefix("-", 170);
	do_infixL("+", 170);
	do_infixL("-", 170);
	do_infixL("*", 160);
	do_infixL("/", 160); 
	do_infixR("^", 150);
	do_suffix("!", 140);

	return function (source) {
		var result = [];
		tokens = source.math_tokens("!#%&*+-/<=>^|", "&+-<=>|");
		token_nr = 0;
		if (tokens) {
			result = parse(1201, tokens);
		}
		return result;
	};
};
