var fs = require('fs');
var ist= require('./storemgr/itemstore');
var sql = require('sqlite3').verbose();
const { param } = require('jquery');



(async () => {

var db = new sql.Database('ItemStore.sqlite');

var items = JSON.parse( fs.readFileSync('itemstore.json'));


var insstmt = `INSERT INTO StoreItem (
    Id,
    FileNameLocal,
    FileNameOnServer,
    UserId,
    SizeOnServer,
    FinishedSize,
    UserInstance,
    Finished,
    vOption,
    MissingLocal,
    Online,
    OriginalSize
)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`


var del = await ist.getrows(db, 'delete from storeitem',[]);

for (var i in items)
{
    var item = items[i];


    console.log(item.id);

    var params = [ item.id, 
        item.filename, 
        item.filename, 
        item.userid, 
        item.size, 
        item.finishedsize, 
        JSON.stringify( item.userinstance), 
        item.finished, 
        item.voption,
        item.missinglocal,
        item.online,
        item.originalsize];

    var r = await ist.getrows(db,insstmt, params );


    if (!r)
    {
        console.log('Error');
    }
}

db.close();

})()