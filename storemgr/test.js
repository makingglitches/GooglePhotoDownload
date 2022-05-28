const getrows = require("./getRows");
const GoogleAccount = require("./googleaccount");
const queryResult = require("./queryresult");
const sql = require('sqlite3').verbose();


(async() =>
{

    
var db = new sql.Database('./storemgr/test.sqlite');

var g = new GoogleAccount(87,1,1,1,1,1,1)

var res = await g.InsertInDb(db)


db.close();
})();