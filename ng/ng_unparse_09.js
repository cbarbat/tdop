// Unparser for Mathematical Expressions 
// by Calin Barbat

var make_unparse = function () {

	var unparse_add = function (element) {
		var result, hasA, hasT, i;
		result = "";
		hasA = (element.args  && (element.args.length > 0));
		hasT = (element.list && (element.list.length > 0));
		result += unparse(element.args[0]);
		for (i=1; i<element.args.length; i++)
			if ((element.args[i].node === "Operator" && element.args[i].value === "*" && 
		         element.args[i].args[0].node === "Number" && element.args[i].args[0].value < 0) || 
				(element.args[i].node === "Number" && element.args[i].value < 0))
				result += " " + unparse(element.args[i]);
			else
				result += " + " + unparse(element.args[i]);
		if (hasT)
			for (i=0; i<element.list.length; i++)
				result += " " + unparse(element.list[i]);
		return result;
	}

	var unparse_mul = function (element) {
		var result, hasA, hasT, hasS, i;
		result = "";
		hasA = (element.args  && (element.args.length > 0));
		hasT = (element.list && (element.list.length > 0));
		hasS = (element.args[0].value === -1);
		if (hasS)	
			result += "- ";
		else
			result += unparse(element.args[0]);
			for (i=1; i<element.args.length; i++) 
				if (element.args[i].node === "Operator" && element.args[i].value === "^" && 
			       (element.args[i].right.node === "Number" && element.args[i].right.value === -1)) {
					if (hasS)
						result += "1";
					hasS = false;
					result += " / " + unparse(element.args[i].left);
				} else {
					if (!hasS)
						result += " * ";
					hasS = false;
					result += unparse(element.args[i]);
				}
			if (hasT)
				for (i=0; i<element.list.length; i++)
					result += " " + unparse(element.list[i]);
		return result;
	}

	var unparse_com = function (element) {
		var result, hasA, hasT, i;
		result = "";
		hasA = (element.args  && (element.args.length > 0));
		hasT = (element.list && (element.list.length > 0));
		result += unparse(element.args[0]);
			for (i=1; i<element.args.length; i++)
				result += " ; " + unparse(element.args[i]);
			if (hasT)
				for (i=0; i<element.list.length; i++)
					result += " " + unparse(element.list[i]);
		return result;
	}

	var unparse_arr = function (element) {
		var result, hasL, hasA, hasT, i;
		result = "";
		hasL = element.left;
		hasA = (element.args  && (element.args.length > 0));
		hasT = (element.list && (element.list.length > 0));
		if (hasL) 
			result += unparse(element.left) + " ";
		result += element.value + " ";
		if (hasA) {
			result += unparse(element.args[0]);
			for (i=1; i<element.args.length; i++)
				result += " , " + unparse(element.args[i]);
		}
		if (hasT)
			for (i=0; i<element.list.length; i++)
				result += " " + unparse(element.list[i]);
		return result;
	}

	var unparse = function (element) {
		var result, hasA, hasL, hasR, hasT, i;
		result = "";
		hasL = element.left;
		hasR = element.right;
		hasA = (element.args  && (element.args.length > 0));
		hasT = (element.list && (element.list.length > 0));
		if ((element.node === "Operator") || (element.node === "Reserved")) {
			if ((element.node === "Operator") && (element.value === "+") && hasA) { 
				result = unparse_add(element);
			} else 
			if ((element.node === "Operator") && (element.value === "*") && hasA) { 
				result = unparse_mul(element);
			} else 
			if ((element.node === "Operator") && (element.value === ";") && hasA) { 
				result = unparse_com(element);
			} else 
			if ((element.node === "Operator") && (element.value === "[") && hasA) { 
				result = unparse_arr(element);
			} else 
			if ((element.node === "Operator") && (element.value === "(") && hasA) { 
				result = unparse_arr(element);
			} else {
				if (hasL) 
					result += unparse(element.left) + " ";
				result += element.value;
				if (hasR) 
					result += " " + unparse(element.right);				
				if (hasT)
					for (i=0; i<element.list.length; i++)
						result += " " + unparse(element.list[i]);
			}
		} else {
			if (element.value < 0)
				result += "- " + -element.value;
			else	
				result += element.value;
		}			
		return result;
	} 
	
	return function (tree) {
		var result, elem, str;
		result = "";
		while (tree.length > 0) {
			result += " " + unparse(tree.shift()) + " \n";
		}
		return result;
	}
}