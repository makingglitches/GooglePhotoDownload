const fs = require('fs')

var f = fs.readFileSync('/proc/self/mounts').toString()

var p = f.split("\n");

// so what if there is a goddamn space in the mountpoint name ?
var mounts = [];

for (var i in p)
{
    var toentry = []

    var entry = p[i].split(" ")

    for (var r in entry)
    {
        toentry.push(entry[r].replace("\\040"," "))
    } 

    mounts.push(toentry);
}

