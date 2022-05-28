const queryResult = require("./queryresult");


async function getrows(db, sql, params = null, debug = false) {
	if (params == null) {
		params = [];
	}

	var rows = await new Promise((resolve, reject) => {
		db.all(sql, params, (err, rows) => {
			if (err) {
				resolve(new queryResult(false, rows, err));
			}

			if (debug) {
				rows.forEach((row) => {
					console.log(row);
				});
			}

			resolve(new queryResult(true, rows, err));
		});
	});

	return rows;
}

module.exports = getrows
