// get the most frequent element in an array, and the count that r
exports.getMode = function getMode(array) {
    var histo = {}, best = {mode: null, count: 0};
    array.forEach(function (elem) {
	if(elem) {
	    if(elem in histo) {
		histo[elem]++;
	    } else {
		histo[elem]=1;
	    }
	    if (histo[elem] > best.count) {
		best.count = histo[elem];
		best.mode = elem;
	    }
	}
    });
    return best;
}

