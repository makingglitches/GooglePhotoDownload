var fs = require('fs');
var ist= require('./storemgr/itemstore');
var sql = require('sqlite3').verbose();
const { param } = require('jquery');
const term = require('terminal-kit').terminal;



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
    Finished,
    vOption,
    MissingLocal,
    Online,
    OriginalSize
)
VALUES (?,?,?,?,?,?,?,?,?,?,?)`



term.clear();
var del = await ist.getrows(db, 'delete from storeitem',[]);

if (del)
{
    console.log("Emptied table.");
}

var count = 0;

var pbops = 
{
    percent: true,
    width:50,
    eta:true,
    items:items.length,
    percentStyle: term.brightGreen,
    x: 1,
    y:3
}

// testing 1 2 3 
var pb = term.progressBar(pbops);
pb.startItem('Copying Items');


for (var i in items)
{
    var item = items[i];


    //console.log(item.id);

    var params = [ item.id, 
        item.filename, 
        item.filename, 
        item.userid, 
        item.size, 
        item.finishedsize, 
        item.finished, 
        item.voption,
        item.missinglocal,
        item.online,
        item.originalsize];

    var r = await ist.getrows(db,insstmt, params );

    if (r.success) { count++;}
    pb.update(count/items.length);


   term.moveTo(1,1);
   term.green().eraseLineAfter('At Item '+count+ ' of '+ items.length);

   
}


term.moveTo(1,4);

console.log("wrote "+count+' items');

var dbc = await  ist.getItemCount(db);

if (dbc == count) { console.log('counts match');}
else 
{
    console.log('db returned: '+dbc);
    console.log('counts differ');
}

console.log('close database');
db.close();

})()