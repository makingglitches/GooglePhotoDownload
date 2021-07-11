const fs = require('fs')


var accs = []
var accnames = accs.map(function (i) { accs[i].name});


var items = JSON.parse(fs.readFileSync('itemstore.json'));


for (var i in items)
{
    var item = items[i];
    var user = accnames.indexOf(item.userid)
    
    if (user==-1)
    {
        accs.push({
                    name:item.userid, 
                    count:1, 
                    finished: item.finished?1:0,
                    sizedef: item.size ? 1:0,
                    oridef: item.original ? 1 :0,
                    finishedef: item.finishedsize ? 1:0
                    });

        accnames = accs.map(
            function (v) 
            { 
                return v.name
            });
    }
    else
    {
        accs[user].count++;
        accs[user].oridef += item.original? 1:0;
        accs[user].sizedef+= item.size ? 1 :0;
        accs[user].finished += item.finished ? 1:0;
        accs[user].finishedef += item.finishedsize ?1:0;
    }
}


for (var a in accs)
{
    var acc = accs[a];
    console.log("UserId: "+acc.name + " Count: "+acc.count+' Finished: '+acc.finished+' finished size: '+acc.finishedef+' size def: '+acc.sizedef)
}


