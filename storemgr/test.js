const getrows = require("./getRows");
const GoogleAccount = require("./googleaccount");
const itemstore = require("./itemstore");
const queryResult = require("./queryresult");
const sql = require('sqlite3').verbose();

// FINISHED
function recursepath(path) {
	var files = [];

	var dir = fs.readdirSync(path, { withFileTypes: true });

	for (var i in dir) {
		if (dir[i].isFile()) {
			files.push(path + '/' + dir[i].name.toString());
		} else {
			files = files.concat(recursepath(path + '/' + dir[i].name));
		}
	}

	return files;
}




(async() =>
{

    //var dbfile = './storemgr/test.sqlite'
    var dbfile = './ItemStore.sqlite'
    var db = new sql.Database(dbfile);
    itemstore.InitDB(db);

	

// var accs = await GoogleAccount.GetAll(db);

// var g = new GoogleAccount(87,1,1,1,1,1,1)

// var res = await g.InsertInDb(db)

    var dirs = await itemstore.getStoreFolders();


db.close();
})();