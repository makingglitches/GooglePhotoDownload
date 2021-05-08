
const fs = require('fs');

var count =0


function recursepath(path) {
	var files = [];

	var dir = fs.readdirSync(path, { withFileTypes: true });

	for (var i in dir) {

		var name = dir[i].name.toString();

		if (dir[i].isFile() && name!=".gitignore'") {
			files.push(path + '\\' + dir[i].name.toString());
		}
		else {
            if (name!=".git" && name !='bin' && name !='obj' && name!="node_modules" )
            {
		    	files = files.concat(recursepath(path + '\\' + dir[i].name));
            }
		}
	}

	return files;
}

var txt = fs.readFileSync("m.txt").toString();

var words = txt.split(/\s/);

var files = recursepath("C:\\Users\\John\\Documents\\CensusProject\\QrCode");
var pcfiles = [];
var oldfiles =[];
for (var i in files)
{
    pcfiles.push ('git mv \"'+files[i]+'\" \"'+files[i]+'bs\"');
	oldfiles.push ('git mv \"'+files[i]+'bs\" \"'+files[i]+'\"');

}

var s="";

for (var p in pcfiles)
{
    s+=pcfiles[p]+"\n";
}

fs.writeFileSync('remscript.txt',s);

 s="";

for (var o in oldfiles)
{
    s+=oldfiles[o]+"\n";
}

fs.writeFileSync('oldscript.txt',s);