const { reject } = require('lodash');

const sqlite3 = require('sqlite3').verbose();
const items = require('./storemgr/itemstore')

var key = '1111111';

async function main() {
	// open the database
	let db = new sqlite3.Database('ItemStore.sqlite');

    var ids = await items.GetIds(db);
    var count = await items.getItemCount(db);
    var exist = await items.CheckExists(db,key);

    var add = await items.AddStoreItem(db,key,'111.txt','11211211');
   // var check = await items.CheckExists(db,key);
    await items.MarkFinished(db,key,true);
    await items.MarkMissingLocal(db,key);
    await items.SetVOption(db,key,true);
    await items.markOnline(db,key,true);
    await items.UpdateSize(db,key,22222);
    var item = await items.GetById(db,key);


    var ya = await items.FileInStore(db,'1.png');

    var itemsr = await items.GetItems(db, null,10,11);
    var unfitems = await items.GetUnfinishedItems(db,null,10,11);

	console.log('closing');

	// close the database connection
	db.close();
}

main();
