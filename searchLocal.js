
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
const GoogleAccount = require("./storemgr/googleaccount");
const filetree = require('./bintree/filetree');
const fs = require('fs')
const sql = require('sqlite3').verbose();
const itemstore = require('./storemgr/itemstore');
const getrows = require("./storemgr/getRows");

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
	console.log("Item Store database doesn't exist, creating.");

	if (!fs.existsSync('./ItemStore.sqlite')) {
		fs.copyFileSync('EmptyStoreDB.sqlite', 'ItemStore.sqlite');
	}

	var db = new sql.Database('ItemStore.sqlite');
	return db;
}


async function main()
{

	/// #################### Main #######################
	var universaldb = OpenDatabase();
	itemstore.InitDB(universaldb);

	var users = await GoogleAccount.GetAll(universaldb)


	for (var i in users)
	{
		var ft = {};
		var curruser = users[i]


		console.log("Processing User: "+curruser.username)

	//	await users[i].getDirectories(universaldb);

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

				var files = recursepath(dir.Directory);

				console.log("Found:  "+ files.length);

				for (var fi in files)
				{
					filetree.addFile(ft,files[fi])
				}
				
				console.log("Updated FileTree")
			}
			
		}

		// todo: maybe consider leaving downloadmissinglocal out and 
		// and reprocessing the whole tree ?
		// and prompting here  instead for what the user wants to do ?
		// here is where the new table indicating file locations should be included
		// as well as hash processing for matches that have a local or original hash
		// for sha256 set !
		var sql = `select * from  StoreItem 
		WHERE userid = ?
		and SizeOnServer is not null
		and SizeOnServer > 0
		and DownLoadMissingLocal = 1
		limit 100 offset ?
		`

		var res = {}
		var offset = 0

		// no items in tree to match.
		// should probably update some things.
		// also what if the mount point is disconnected during this session ?
		// TODO: check index.js for reset of downloadmissinglocal = 1 when mount point is
		// is disconnected.
		// this could be a bit of an issue and should be configurable !
		// probably shouldn't be able to be reset so easily without a prompt !
		// for now just skipping.
		// and only looking at missing ones. seemingly.
		// TODO: SHOULD ADD MESSAGE "Mount point: '' seems to be disconnected, mark downloads as missing ?"
		if (!ft.categories)
		{
			continue;
		}

		do 
		{
			res = await getrows (universaldb, sql, [curruser.userid, offset])

			offset+=100

			for (var r in res.rows)
			{
				var currrow = res.rows[r];

				var f = filetree.findFile(ft, currrow.FileNameOnServer);

				if (f.Found)
				{
					console.log('Found');
				}
			}

		}
		while (res.rows && res.rows.length > 0)
		
	}


};


main();

