// Unparser for Mathematical Expressions 
// by Calin Barbat

var make_unparse = function () {

	var unparse = function (element) {
		var result, hasL, hasR, hasT, i;
		result = "";
		hasL = element.left;
		hasR = element.right;
		hasT = (element.list && (element.list.length > 0));
		if ((element.node === "Operator") || (element.node === "Reserved")) {
			if (hasL) 
				result += unparse(element.left) + " ";
			result += element.value;
			if (hasR) 
				result += " " + unparse(element.right);
			if (hasT)
				for (i=0; i<element.list.length; i++)
					result += " " + unparse(element.list[i]);
		} else
			result += element.value;		
		return result;
	} 
	
	return function (tree) {
		var result, elem, str;
		result = "";
		while (tree.length > 0) {
			result = unparse(tree.pop()) + "\n" + result;
		}
		return result;
	}
}
