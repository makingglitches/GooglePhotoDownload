const sqlite3 = require('sqlite3').verbose();
const { any } = require('async');
const { create } = require('lodash');
const path = require('path');
const queryResult = require('./queryresult')
const GoogleAccount = require('./googleaccount')

var db = null;

function InitDB(_db) {
	db = _db;
}


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




// accepts an argument of type GoogleAccount
async function AddAccount(account)
{
    var sql = account.getInsertSql()
    var res = await getrows(db,sql,account.getInsertParamArray())
    
    return res.success;

}



module.exports = 
{
    InitDB: InitDB,
    AddAccount:AddAccount
}