const fs = require('fs');

var sti = JSON.parse( fs.readFileSync('itemstore.json'));

var count=0;

for (var i in sti)
{
    console.log(sti[i].userinstance);
   delete sti[i].userinstance;
   console.log(sti[i].userinstance);
}

fs.writeFileSync("itemstore.json",JSON.stringify(sti));

console.log("there were "+count+" items.");