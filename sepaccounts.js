// so sometimes shit fucks up.
// you don't edit the damn accountstores.js and well... something ends up somewhere that is a duplicare


const fs = require('fs')
const path = require('path')

var accounts = JSON.parse(fs.readFileSync('accountstores.json'));


		
var srcid ="105357010768781030927"; 
var destid = "115473458188357073643";
var srcdir = "";
var destdir ="";

for (var i in accounts)
{
    var acc = accounts[i];
    
    if (acc.userid == srcid)
    {
        srcdir = acc.destdir;
    }

    if (acc.userid == destid)
    {
        destdir = acc.destdir;
    }
}


var items = JSON.parse(fs.readFileSync('itemstore.json'));

for (var i in items)
{
    var item = items[i];

    if (item.userid == destid &&  fs.existsSync(path.join(srcdir,item.filename)))
    {
        console.log('moving: '+ item.filename);
        fs.renameSync(path.join(srcdir,item.filename), path.join(destdir, item.filename));
    }

}