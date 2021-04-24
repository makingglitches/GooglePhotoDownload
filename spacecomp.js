
const fs = require('fs')

var items = JSON.parse(fs.readFileSync("itemstore.json"))

var totalDL=0;
var origsize=0;
var newsize=0;
var nosize =0;
var alreadydl =0;
var countdl = 0;
var countorig = 0;


function toGB(val)
{
    return val.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
    })+" Gb";
    
}

function toPerc(val)
{
    return val.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })+"%";
}


for (var i in items)
{
    if (items[i].size)
    {
        totalDL+=items[i].size*1;
        
        if (items[i].finished)
        {
            alreadydl+=items[i].size*1;
            countdl++;
        }
    }

    

    if (items[i].originalsize && items[i].size)
    {
        newsize += items[i].size*1;
      
        origsize += items[i].originalsize*1;
     
        countorig++;
    }
    else if (!items[i].size)
    {
        nosize++;
    }
    
    
}

totalDL = totalDL / 1024/1024/1024;
alreadydl= alreadydl /  1024/1024/1024;
origsize =  origsize / 1024 / 1024/ 1024;
newsize= newsize / 1024/1024/1024;
percdiff = newsize/origsize*100;

console.log("There are "+items.length+" items in the google photos store.")
console.log("There are "+countorig+" items which are tracking their original size.")
console.log("There are "+nosize+" items which do not have their server size info updated.");
console.log();
console.log( "Original Size: "+toGB( origsize)+" New Size: "+ toGB(newsize));
console.log(" Total To Download: "+  toGB(totalDL)+"  Already Downloaded:"+toGB(alreadydl));
console.log("Of the items being tracked transcoding saved "+toGB(origsize-newsize));
console.log("There are still yet "+ (items.length-countdl)+" at " +toGB(totalDL-alreadydl) +" to download of items reporting server size.");
console.log("The "+countdl+" items downloaded already are occupying "+toGB(alreadydl));
console.log("Of the tracked items the new items take up "+ toPerc(percdiff)+" of the original space");