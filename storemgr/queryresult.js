class queryResult {
	constructor(s, r, e) {
		this.success = s;
		this.rows = r;
		this.err = e;
	}
}


module.exports = queryResult;