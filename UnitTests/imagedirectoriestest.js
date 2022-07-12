var MountInfo = require ('../mountinfoparser').MountInfo;
var IL = require('../storemgr/imagelocations');
var path = require('path');
var fs = require('fs')
var sql = require('sqlite3').verbose();

//TODO: MOVE THIS TO BEGINNING
function OpenDatabase() {

	var db = new sql.Database('UnitTests/tests.sqlite');
	return db;
}


var db = OpenDatabase();

IL.InitDB(db);

function test(module, successmessage, errormessage, passed)
{
    if (passed)
    {
        console.log(module+": "+successmessage);
    }
    else
    {
        console.log(module+": "+errormessage);
        process.exit(1);
    }
}


// with test files.

var f = [
    'UnitTests/testmount/1.txt',
    'UnitTests/testmount/test1/2.txt',
    'UnitTests/testmount/test1/test2/3.txt',
    'UnitTests/testmount/test1/test2/vol1/1.txt',
    'UnitTests/testmount/test1/test2/vol2/2.txt'];


var d = [];
var u = [];
var t = [];
var m = [];

for (var i in f)
{
    var p = path.resolve(f[i]);
    var d1 = path.dirname(p);
    
    u.push(i % 2 ==0 ? null: 1);

    if (i % 2 == 0 )
    {
        t.push(IL.EStoreType.ServerOnly);
    }
    else if (i % 3 == 0 )
    {
        t.push(IL.EStoreType.Originals);
    }
    else 
    {
        t.push(IL.EStoreType.Trusted);
    }

    m.push(i % 2 ==0);
    d.push(d1);
}

console.log(d);

var iraw = fs.readFileSync('UnitTests/testcase.txt').toString();
var info = iraw.trim().split(',');

var dev = info[0];
var p1uid = info[1];
var p2uid = info[2];
var p3uid = info[3];
var p4uid = info[4];

var res =[]; 

for (var i in d)
{
    res.push(IL.ImageLocation.CreateNew(d[i],t[i],m[i],u[i]));
    
    res[res.length-1].Write().then(function(value)
    {
        console.log(value);

        // if the write is successful, passes.
        test("Write Location", "written successfully",`write failure: ${value.err} `, value.success);
    }, 
    function(reason)
    {   
        console.log("Error" + reason);
    }
    );
}


var p1 = IL.ImageLocation.CreateNew('/',IL.EStoreType.Originals,true,1);
var p2 = IL.ImageLocation.CreateNew('/',IL.EStoreType.Originals,true,1);

test("Equals", "Equality correct", "Equality failed", p2.Equals(p1) && p1.Equals(p2));


console.log("Getall");
var ils = IL.ImageLocation.GetAll().then(o=>console.log(o));