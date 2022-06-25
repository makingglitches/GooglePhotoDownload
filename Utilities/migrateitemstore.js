var fs = require('fs');
var getrows = require('./storemgr/getRows')
var ist= require('./storemgr/itemstore');
var sql = require('sqlite3').verbose();
const { param } = require('jquery');
const term = require('terminal-kit').terminal;



(async () => {

var db = new sql.Database('ItemStore.sqlite');

var items = JSON.parse( fs.readFileSync('itemstore.json'));



var selstmt = 'select id, originalsize from storeitem where id = ?';

var updatestmt = 'update storeitem set OriginalSize=? where Id = ?';

var insstmt = `INSERT INTO StoreItem (
    Id,
    FileNameOnServer,
    UserId,
    SizeOnServer,
    FinishedSize,
    Finished,
    VideoOption,
    Online,
    OriginalSize
)
VALUES (?,?,?,?,?,?,?,?,?)`



term.clear();
// var del = await ist.getrows(db, 'delete from storeitem',[]);

// if (del)
// {
//     console.log("Emptied table.");
// }

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

var inserted = 0
var updated = 0
var notupdated = 0
var existcount = 0;

for (var i in items)
{
    var item = items[i];

    var exists = await getrows(db,selstmt,[item.id]);

    // row exists
    if (exists.success && exists.rows.length > 0)
    {
        existcount++;
        if (!exists.rows[0]['OriginalSize'] && item.originalsize)
        {   
            var update = await getrows(db,updatestmt, [item.originalsize,item.id]);
            updated++;
        }
        else
        {
            notupdated++;
        }

    }
    else
    {

        //console.log(item.id);

        var params = [ item.id, 
            item.filename, 
            item.userid, 
            item.size, 
            item.finishedsize, 
            item.finished, 
            item.VideoOption,
            item.online,
            item.originalsize];

        var r = await getrows(db,insstmt, params );

        if (r.success) { inserted++;}
        
    }

    count++;

    pb.update(count/items.length);


   term.moveTo(1,1);
   term.green().eraseLineAfter('At Item '+count+ ' of '+ items.length+" Found: "+existcount+" Inserted: "+inserted+" Updated: "+updated);

   
}


term.moveTo(1,4);

console.log("wrote "+count+' items');

db.close();

})()