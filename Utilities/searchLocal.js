
// see i finished this before
// and yes presently i have a way of using the software as intended
// as i can just fill an account and download its contents reencoded to a smaller size
// instead of taking hours and hours to transcode it locally
// but i hate these creatures.
// and this has been reached before.
// stop rolling everything back
// stop trying to kill off slowly and quietly the only decent members of the real generation
// starting in the 1980s.
// mother fucking child molester garbage slave handling cunts.
// and stop infesting this world.
// by now if i was one of these people i'd kill myself.
// maybe they should start considering this option.
const GoogleAccount = require("../storemgr/googleaccount");
const filetree = require('../bintree/filetree');
const fs = require('fs')
const sql = require('sqlite3').verbose();
const itemstore = require('../storemgr/itemstore');
const getrows = require("../storemgr/getRows");
const { MountInfo } = require("../mountinfoparser");
const path = require("path");

function recursepath(path) {
	var files = [];

	var dir = fs.readdirSync(path, { withFileTypes: true });

	for (var i in dir) {
		if (dir[i].isFile()) {
			files.push(path + '/' + dir[i].name.toString());
		} else {
			files = files.concat(recursepath(path + '/' + dir[i].name));
		}
	}

	return files;
}

function OpenDatabase() {

	if (!fs.existsSync('../ItemStore.sqlite')) {
		console.log("Item Store database doesn't exist, creating.");
		fs.copyFileSync('../EmptyStoreDB.sqlite', '../ItemStore.sqlite');
	}

	var db = new sql.Database('ItemStore.sqlite');
	return db;
}


async function main()
{

	// populate mountinfo structure
	MountInfo.ParseMounts();

	/// #################### Main #######################
	var universaldb = OpenDatabase();
	itemstore.InitDB(universaldb);

	var users = await GoogleAccount.GetAll(universaldb)

	// build a tree from ALL user files on disks
	for (var i in users)
	{	
		var ft = {};
		var curruser = users[i];

		for (var f in curruser.directories)
		{
			var dir = curruser.directories[f];
		
			// consider only files that were downloaded from google photos
			// if the db has been deleted we can't determine which were the originals, as there is currently
			// no way of telling for sure.
			// however we should have accurate size information stored in the db regarding.
			//  this way we can ensure no files are downloaded all over again. 
			if (dir.TrustedStore)
			{
				console.log("Trusted Store: "+dir.Directory)

				
				var files = recursepath( MountInfo.ExpandPath(dir.MountPointUUID,  dir.Directory));

				console.log("Found:  "+ files.length);

				for (var fi in files)
				{
					filetree.addFile(ft,files[fi])
				}
				
				console.log("Updated FileTree")
			}
			
		}
	}

	// use file tree to compare against database contents.


	for (var i in users)
	{
		var curruser = users[i]


		console.log("Processing User: "+curruser.username)

		var sql = `select * from  StoreItem 
		WHERE userid = ?
		and SizeOnServer is not null
		and SizeOnServer > 0
		limit 100 offset ?
		`



		var res = {}
		var offset = 0

		do 
		{
			// this will be empty when all rows are found.
			res = await getrows (universaldb, sql, [curruser.userid, offset])

			offset+=100

			for (var r in res.rows)
			{
				var currrow = res.rows[r];

				var f = filetree.findFile(ft, currrow.FileNameOnServer);

				if (f.Found)
				{
					console.log('Found a file of the same name.');
					
					var mismatch = []
					var match =[]

					for (var d in f.Obj)
					{
						var f = path.join(f.Obj[d],f.Key)
						var s = fs.statSync(f);
						var len = s.size;
						
						if ( currrow.FileNameOnServer == len)
						{
							match.append(f)
						}
						else
						{
							mismatch.append(f)
						}
					}

					console.log(`Matches ${match.length} files`);
					console.log(`Record mismatched with ${mismatch.length}`);

					for (var m in match)	
					{
						var dev = MountInfo.WhichDevice(match[m]);
						
					}		

				}
			}

		}
		while (res.rows && res.rows.length > 0)
		
	}


};


main();

