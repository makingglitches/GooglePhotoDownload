'use strict';

const readline = require('readline');
const https = require('https');
const path = require('path');
const fs = require('fs');
const async = require('async');
const bodyParser = require('body-parser');
const config = require('./config.js');
const express = require('express');
const http = require('http');
const persist = require('node-persist');
const request = require('request-promise');
const session = require('express-session');
const sessionFileStore = require('session-file-store');
const uuid = require('uuid');
const req = require('request');
const querystring = require('querystring');
const lodash = require('lodash');
const mime = require('mime-types');

const nodownload = false;

var atoken = {};


var processedstats = {
	userid:'',
	missinglocal:0,
	missingonline:0,
	sizemismatch:0,
	finnotequaltosize:0,
	finnotequaltostat:0,
	finished:0,
	total:0,
	sizeretry:0,
	size:0,
	itemretry:0,
	item:0

}

loadandsortStored();
loadUserStore();
backupFile('itemstore.json');
backupFile('accountstores.json');


// on occasion the sessions directory will interfere with oauth 2, and for some reason
// this will cause the wrong authentication token to be passed into the express stack.
// which of course causes all network transactions with the photos api to fail.
console.log('deleting sessions subdirectory');
fs.rmSync('./sessions', { recursive: true, force: true });

const app = express();

const fileStore = sessionFileStore(session);

const server = http.Server(app);

// Use the EJS template engine
app.set('view engine', 'ejs');

// Set up a cache for media items that expires after 55 minutes.
const mediaItemCache = persist.create({
	dir: 'persist-mediaitemcache/',
	ttl: 3300000 // 55 minutes
});
mediaItemCache.init();

// Temporarily cache a list of the albums owned by the user.
const albumCache = persist.create({
	dir: 'persist-albumcache/',
	ttl: 600000 // 10 minutes
});
albumCache.init();

// For each user, the app stores the last search parameters or album
const storage = persist.create({ dir: 'persist-storage/' });
storage.init();

// this is absolutely necessary
// Set up OAuth 2.0 authentication through the passport.js library.
const passport = require('passport');
const auth = require('./auth');
const { match } = require('assert');
const { waitForDebugger } = require('inspector');
const { json } = require('express');
const { WSAENOTSOCK } = require('constants');
const { exception } = require('console');
const { CONNREFUSED } = require('dns');

auth(passport);

// Set up a session middleware to handle user sessions.
const sessionMiddleware = session({
	resave: true,
	saveUninitialized: true,
	store: new fileStore({}),
	secret: 'photo frame sample'
});

// Set up static routes for hosted libraries.
app.use(express.static('static'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist/'));

// Parse application/json request data.
app.use(bodyParser.json({ extended: true, limit: '50mb' }));

// Parse application/xwww-form-urlencoded request data.
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Enable user session handling.
app.use(sessionMiddleware);

// Set up passport and session handling.
app.use(passport.initialize());
app.use(passport.session());

// Middleware that adds the user of this session as a local variable
app.use((req, res, next) => {
	res.locals.name = '-';
	if (req.user && req.user.profile && req.user.profile.name) {
		res.locals.name = req.user.profile.name.givenName || req.user.profile.displayName;
	}

	res.locals.avatarUrl = '';
	if (req.user && req.user.profile && req.user.profile.photos) {
		res.locals.avatarUrl = req.user.profile.photos[0].value;
	}
	next();
});

app.get('/', (req, res) => {
	if (!req.user || !req.isAuthenticated()) {
		console.log('sending user to authenticate page.');
		res.redirect('/auth/google');
	} else {
		console.log('sending user to sucess page');

		res.sendFile(__dirname + '/success.html');
	}
});

app.post('/redownloadstart', async (req, res) => {

	processedstats.userid = config.userid;

	var online = true;

	if (!pairs || !pairs.gitems) {
		console.log('skipping online refresh getting stored items');
		pairs = await getpairedlist(false,  [
			config.curraccount.localdirectory,
			config.curraccount.onserverdirectory
		]);
		processPairedList();

		online =false;
	}

	if (pairs) {
		endtimer = false;

		timecall();
	} else {
		res.status(500).send('Problem, need to load a list of photo api mediaitems first.');
	}

	for (var i in pairs.gitems) {

		processedstats.total++;

		console.log('At index ' + i + ' of ' + pairs.gitems.length);

		var item = pairs.gitems[i];

		var storeitem = null;

		if (item.storeindex)
		{
			storeitem = stored[item.storeindex];
		}
		else
		{
			var storeindex = searchstore(item.id);
			storeitem = stored[storeindex];
		}

		// indicate item is most definately online.
		// because this flag means that this data was loaded from the server prior to run.
		if (online)
		{
			// only update this if the list was pulled online.
			storeitem.online = online;
		}


		if (storeitem.missingonline && storeitem.finished)
		{
			processedstats.missingonline++;
			console.log("Marked missing online.")
			continue;
		}

		// if the userinstance field hasnt been defined, define it.
		if (!storeitem.userinstance)
		{
			storeitem.userinstance = [];
			writeStored();
		}

		// if the online flag is sent that means the download list has been 
		// sampled from the current online account.
		if (online && storeitem.userinstance.indexOf(config.userid)==-1)
		{
			// add the current user to the list.
			storeitem.userinstance.push(config.userid);
		}


		// this is a carry over.
		if (storeitem.userid != config.userid)
		{
			// if we have drawn the list from online
			// set the existing userid which is from the itemstore
			// into the userinstance field for future code updates.
			if (online)
			{
				if (online && storeitem.userinstance.indexOf(storeitem.userid)==-1)
				{
					storeitem.userinstance.push(storeitem.userid);
					storeitem.userid = config.userid;
					writeStored();
				}
			}
			else
			{
				// this is the new way.
				// if the item has been updated as it should have 
				// because there is a possibility it could be shared across multiple accounts
				// this indicates google is hashing images if they are deemed duplicates
				// creating ids that exist between different accounts
				// that indicates the possibility of media duplicate detection
				// should later generate a list of items to delete.
				if (config.userinstance.indexOf(storeitem.userid)==-1)
				{
					console.log('Item is from different user account');
					continue;
				}
			}
		}

		// download headers have not been pulled back if expected size is -1
		if (!storeitem.size || storeitem.size == -1) {
			if (nodownload)
			{
				updateSize(storeitem, 5);
			}
			else
			{
				await updateSize(storeitem, 5);
			}
		}

		if (!nodownload) {
			var destfilename = config.curraccount.destdir + '/' + item.filename;

			// check if the download appears to be done.
			if (fs.existsSync(destfilename)) {

				storeitem.missinglocal = true;
				writeStored();
				var stat = fs.statSync(destfilename);

				processedstats.sizemismatch+= stat.size != storeitem.size;

				if (storeitem.finishedsize)
				{
					processedstats.finnotequaltosize += storeitem.size != storeitem.finishedsize;
					processedstats.finnotequaltostat += storeitem.finishedsize != stat.size;
				}

				var downloadedCorrectly =  (storeitem.finished && storeitem.finishedsize &&  
							  stat.size == storeitem.finishedsize) ||
							  (stat.size == storeitem.size);
			
							  // the expected size exists.
				// mark to be skipped.
				if (downloadedCorrectly ) {
					storeitem.finished = true;
					storeitem.finishedsize = stat.size;
					processedstats.finished++;
					writeStored();

					console.log('File ' + item.filename + ' already finished');
				} else {

					if (storeitem.finished)
					{
						// because of some issues that have been occurring with server sizes not being
						// consistent, update to see if this fixes the problem.
						await updateSize(storeitem);

						if (storeitem.size == stat.size)
						{
							console.log("For file: "+storeitem.filename);
							console.log("Size Update Fixed Issue. Skipping.");
							continue;
						}
						else
						{
							// remove the file and start again
							storeitem.finished = false;
							writeStored();
						}

					}

					console.log('File ' + item.filename + ' marked for redownload');

					if (stat.size == 0) {
						console.log('Has size 0, deleteing');
					} else {
						console.log('Has unmatched sizes, deleting');
					}

					fs.rmSync(destfilename);
				}
			}
			else
			{
				storeitem.finished = false;
				storeitem.missinglocal = true;
				processedstats.missinglocal++;
				writeStored();
			}

			if (!storeitem.finished) pushtoQueue(destfilename, storeitem, config.atoken.access_token);
		}
	}

	endtimer = true;
});

app.get('/getlist', async (req, res) => {
	if (checkauth(req)) {
		// less than optimal is where it doesnt check length.
		// unfortunately how can it without downloading every item if fucking google doesnt expose that field ?

		pairs = await getpairedlist(true,  [
			config.curraccount.localdirectory,
			config.curraccount.onserverdirectory
		]);

		processPairedList();

		res.status(200).send({ message: 'completed', server: pairs.onserver.length, local: pairs.localonly.length });

		console.log('sent item info to client');
	}
	else
	{
		res.status(400).send('user not authenticated')
	}
});

app.get('/logout', (req, res) => {
	req.logout();
	req.session.destroy();
	res.redirect('/');
});

function acallback(arg1, arg2, arg3, arg4) {
	console.log('reached auth callback');
}

app.get('/upload',async(req,res)=>{
	testUpload();

});

// Start the OAuth login process for Google.
app.get(
	'/auth/google',
	passport.authenticate(
		'google',
		{
			scope: config.scopes,
			failureFlash: true, // Display errors to the user.
			session: true
		},
		acallback
	)
);

app.get('/jquery.js', (req, res) => {
	res.send(fs.readFileSync('./node_modules/jquery/dist/jquery.js'));
});

app.get('/albums', async (req, res) => {
	if (checkauth(req)) {
		var a = await libraryApiGetAlbums(config.atoken.access_token);
		res.status(200).send({ data: a });
	} else {
		res.redirect('/auth/google');
	}
});

app.get(
	'/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/', failureFlash: true, session: true }),
	(req, res) => {
		// User has logged in.
		console.log('User has logged in.');

		refreshtimerrestart();

		config.userid = req.user.profile.id;

		loadUserStore();
		loadandsortStored();

		res.redirect('/');
	}
);

app.get('/forcerefresh', async (req, res) => {
	var result = await refreshAccessToken();
	res.status(200).send(result);
});

server.listen(config.port, () => {
	console.log(`App listening on port ${config.port}`);
	console.log('Press Ctrl+C to quit.');
});

function pushtoQueue(destfilename, storeitem) {
	console.log('sent to queue.');
	waiting.push({ filename: destfilename, item: storeitem });
}

function processPairedList() {
	var onserver = [];
	var localonly = [];

	loadandsortStored();

	/*
	var itemnames = pairs.gitems.map(function(v) {
		return v.filename;
	});
	*/

	// supporting multiple users now, reduce extra uploading etc.
	var itemnames = stored.map(function(v) { return v.filename;});

	console.log('Comparing.');

	for (var i in pairs.localfiles) {
		var f = itemnames.indexOf(path.basename(pairs.localfiles[i].toString()));

		if (f > -1) {
			onserver.push(pairs.localfiles[i].toString());
		} else {
			localonly.push(pairs.localfiles[i].toString());
		}
	}

	pairs.onserver = onserver;
	pairs.localonly = localonly;

	moveItems(pairs.onserver, config.curraccount.onserverdirectory);
	moveItems(pairs.localonly, config.curraccount.localdirectory);
}

async function updateSize(storeitem, maxretries) {

	processedstats.size++;

	var url = await refreshStoredUrl(storeitem);

	var retry = true;
	var retries = 0;

	while (retry && retries < maxretries) {
		retry = false;

		if (retries > 0) {
			console.log('Retry Get Header #' + retries + ' of 5');
		}

		try {
			var h = await request.head(url + '=d' + storeitem.voption, {}, (req, res) => {
				if (!res) {
					// returns blank response it seems.
					retry = true;
					retries++;
					console.log('Get header failed for ' + storeitem.filename);
				} else {
					storeitem.size = res.headers['content-length'];
					writeStored();
				}
			});
		} catch (err) {
			if (retries > maxretries) {
				throw err;
			}

			retry = true;
			retries++;
			processedstats.sizeretry++;
		}
	}

	if ( retries >= maxretries)
	{
		console.log('Failed to Update Size.');
	}
	else
	{
		console.log('Updated size.');
	}
}

function searchstore(id) {
	for (var i in stored) {
		if (stored[i].id == id) {
			return i;
		}
	}

	return -1;
}

async function refreshStoredUrl(storeitem) {

	var result = await getitem(storeitem.id);

	if (!result)
	{
		// didn't find this online.
		storeitem.online = false;
		// item is missing from online.
		storeitem.missingonline = true;

		storeitem.finished = true;

		processedstats.missingonline++;

		return null;
	}

	delete storeitem.baseUrl;
	delete storeitem.lastdate;

	if ( !result )
	{
		// apparently being super aggressive this way works.
		// in short don't accept a failure just keep trying.
		result = refreshStoredUrl(storeitem);
		return result.baseUrl;
	}
	else
	{

	storeitem.voption = result.mediaMetadata.video ? 'v' : '';

	writeStored();

	console.log('Updated URL');

	return result.baseUrl;
	}
}

async function startJob(destfilename, storeitem) {
	var url = await refreshStoredUrl(storeitem);

	if (!url)
	{
		console.log(storeitem.filename);
		console.log("JOB Canceled. Item is missing from online.");
		storeitem.finished = true;
		storeitem.missingonline = true;
		writeStored();
		return null;
	}

	var ostream = fs.createWriteStream(destfilename);

	ostream.on('finish', function() {
		console.log(' PIPE FINISHED !: ' + this.filename);

		var size = fs.statSync(this.destination);
		
		processedstats.finished++;

		this.storeitem.finished = true;
		this.storeitem.finishedsize = size.size;
		console.log("finished size: "+this.storeitem.finishedsize);
		console.log("===>Id:"+storeitem.id);
		writeStored();

		pipes.splice(pipes.indexOf(this), 1);
	});

	ostream.on('error', function(err) {
		console.log(' PIPE ERROR LOADING ! : ' + this.filename);
		console.log(err);
	});

	var pipe = request.get(url + '=d' + storeitem.voption);

	pipe.on('error', function(err) {
		console.log('error with ' + this.filename);
		console.log('placing job back in queue.');
		var id = this.path.replace('/', '');

		var pipeindex = -1;

		for (var i in pipes) {
			if (pipes[i].storeitem.id == id) {
				pipeindex = i;
				break;
			}
		}

		if (pipes[i].close) pipes[i].close();

		if (fs.existsSync(pipes[i].destination)) {
			console.log('deleting partial file.');
			fs.rmSync(pipes[i].destination);
		}

		var p = pipes[i];

		pipes.splice(i, 1);

		pushtoQueue(p.destination, p.storeitem);
	});

	pipe.catch(function(err) {
		var issue = err;
	});

	pipe = pipe.pipe(ostream);

	pipe.storeitem = storeitem;
	pipe.filename = storeitem.filename;
	pipe.expectedSize = storeitem.size;
	pipe.destination = destfilename;

	pipes.push(pipe);

	console.log('Active pipes: ' + pipes.length);
	console.log('Started Job For ' + storeitem.filename);

	return pipe;
}

// this function starts the queue timer and starts jobs as queue slots become available.
async function timecall() {
	var googlegayasslimit = 4;
	var started = 0;

	while (waiting.length > 0 && pipes.length < maxpipes) {
		if (started == googlegayasslimit) break;

		var i = waiting.shift();
		var job = await startJob(i.filename, i.item);

		if (!job)
		{
			console.log("Job Canceled.");
		}
	}

	var message = '';

	message += 'Active: ' + pipes.length + '  Waiting: ' + waiting.length + '\n';

	for (var i in pipes) {
		var rate = 0;

		if (pipes[i].lastbytes) {
			rate = (pipes[i].bytesWritten - pipes[i].lastbytes) / (Date.now() - pipes[i].lastdate) / 1024 * 1000;
		}

		if (pipes[i].bytesWritten > pipes[i].storeitem.size && !pipes[i].wrote) {
			fs.appendFileSync('mismatched.txt', pipes[i].filename + '\n');
			pipes[i].wrote = true;
		}

		var perc = pipes[i].bytesWritten / pipes[i].storeitem.size * 100;

		message +=
			i +
			') ' +
			pipes[i].filename +
			'    ' +
			pipes[i].bytesWritten +
			'/' +
			pipes[i].storeitem.size +
			'  (' +
			perc.toLocaleString(undefined, {
				minimumFractionDigits: 1,
				maximumFractionDigits: 1
			}) +
			'%)  ' +
			rate.toLocaleString(undefined, {
				minimumFractionDigits: 3,
				maximumFractionDigits: 3
			}) +
			' kb/s\n';

		pipes[i].lastbytes = pipes[i].bytesWritten;
		pipes[i].lastdate = Date.now();
	}

	console.log(message);

	if (endtimer && waiting.length == 0 && pipes.length == 0) {
		// have to fix the requestpromise crap so that retry logic can be handled
		console.log('stopping timer');
	} else {
		setTimeout(() => {
			timecall();
		}, 5000);
	}

	console.log(processedstats);
}

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

async function getitem(id, maxretries = 5) {
	var retry = true;
	var retries = 0;
	processedstats.item++;

	while (retry && retries < maxretries + 1) {
		retry = false;

		if (retries > 0) {
			console.log('GetItem failed, Retry ' + retries + ' of ' + maxretries);
		}

		try
		{
		var result = await request
			.get(config.apiEndpoint + '/v1/mediaItems/' + id, {
				headers: { 'Content-Type': 'application/json' },
				qs: {},
				json: true,
				auth: { bearer: config.atoken.access_token }
			})
			.on('error', function(err) {
				console.log('reached promise block error');
				retry = true;
				retries++;
			});
		}
		catch(err)
		{
			console.log('reached catch-block error');
		
			if (err.statusCode == 400)
			{
				
				console.log('media item not found !!');
				console.log(id);
				retry = false;
				return null;

			}
			else
			{
				retry = true;
				retries++;
				processedstats.itemretry++;
			}
		}
	}

	return result;
}

var maxpipes = 11;
var pipes = [];
var waiting = [];
//var canbeskipped = [];

var endtimer = false;

// will limit the number of items from a server refresh to 100
const fasttest = false;
const localdir = '/Data/Desktop/Combined Photos etc/mp4locals';
//'C:\\Users\\John\\Desktop\\Combined Photos etc\\mp4locals';
const onserverdir = '/Data/Desktop/Combined Photos etc/mp4sonserver';
//'C:\\Users\\John\\Desktop\\Combined Photos etc\\mp4sonserver';
const othersourcedir = '';
const pulldir = '/Data/Desktop/Combined Photos etc/techguyalpha';
//'C:\\Users\\John\\Desktop\\Combined Photos etc\\mp4spulled';

var pairs = {};
var stored = [];

function moveItems(files, dest) {
	for (var i in files) {
		var newname = dest + '/' + path.basename(files[i]);

		if (files[i] == newname) {
			continue;
		}

		fs.renameSync(files[i], newname);
		files[i] = newname;
		console.log('Moved ' + path.basename(files[i]));
	}
}


function loadandsortStored() {
	if (!fs.existsSync('itemstore.json')) {
		fs.writeFileSync('itemstore.json', '[]');
	}

	stored = JSON.parse(fs.readFileSync('itemstore.json'));

	stored.sort(function(a, b) {
		if (a.userid == config.userid && b.userid != config.userid) return -1;
		else if (a.finished && !b.finished) return 1;
		else if (!a.finished && b.finished) return -1;
		else if (a.id > b.id) return 1;
		else if (a.id < b.id) return -1;
		else return 0;
	});

	writeStored();
}

function writeStored() {
	fs.writeFileSync('itemstore.json', JSON.stringify(stored));
}


async function getpairedlist(online, paths) {
	loadandsortStored();

	var files = [];

	console.log('recursing local store');

	// retrieve a list of local files.
	for (var i in paths) {
		files = files.concat(recursepath(paths[i]));
	}

	console.log('requesting items en masse.');

	var result = [];

	// get a list from online to see if there are anymore items, these get added to store automatically.
	if (online) {
		result = await listItems();
	} else {
		for (var i in stored) {
			result.push(lodash.cloneDeep(stored[i]));
		}
	}

	console.log('got info on ' + result.length + ' items.');

	console.log('extracting basenames of files on disk.');
	// these will only be used here
	// retrieve a list filenames from the list of local files.
	var namesonly = files.map(function(val) {
		return path.basename(val.toString());
	});


	for (var f in namesonly)
	{
		var fname = namesonly[f];
		// search the store for filename here.
	}

	if (!nodownload) {
		console.log('search by undownloaded and original file on disk.');
		// sort the gitems array in pairs.
		// if originals are on server already, to save disk space download these first.
		// so they can be compared and deleted.
		result.sort(function(a, b) {

			var sta = null;

			// marking should reduce search time with each sort.
			if (!a.storeindex)
			{
				sta = searchstore(a.id);
				a.storeindex = sta;
			
			}
			else
			{
				sta = a.storeindex;
			}
			
			var stb = null;
			
			if ( !b.storeindex)
			{
				stb = stb = searchstore(b.id);
				b.storeindex = stb;
 
			}
			else
			{
				stb =b.storeindex;
			}

			
			if (online)
			{

				if (stored[sta].userid != config.userid)
				{
					
				}

			}

			
			// sort items that are alredy on the harddrive to the top.

			var contai = null;
			var contbi = null;

			if (!a.fileindex)
			{
				contai = namesonly.indexOf(a.filename);
				a.fileindex = contai;
			}
			else
			{
				contai = a.fileindex;
			}

			if (!b.fileindex)
			{
				contbi = namesonly.indexOf(b.filename);
				b.fileindex = contbi;
			}
			else
			{
				contbi = b.fileindex;
			}


			var sizechange = false;
			// this is costly, if the files original size is not tracked but the file exists
			// store this size for space savings comparison later.
			if (contai > -1) {
			
				var stat = fs.statSync(files[contai]);
				
		
				if (!stored[sta].originalsize) {
					sizechange = sizechange || true;
					stored[sta].originalsize = stat.size;
				}
			}

			if (contbi > -1) {

				var stat = fs.statSync(files[contbi]);

				if (!stored[stb].originalsize || stored[stb].originalsize != stat) 
				{
					sizechange = sizechange || true;
					stored[stb].originalsize = stat.size;
				}

			}

			// mark results items as local
			a.islocal = contai > -1;
			b.islocal = contbi > -1;

			var isusera = stored[sta].userid == config.userid;
			var isuserb = stored[stb].userid == config.userid;

			// now sort matches for download.

			// if the first file is contained and the second is not, it gets sorted up
			if ( isusera != isuserb)
			{
				if (isusera) return -1;
				if (isuserb) return 1;
			}

			if (stored[sta].finished != stored[stb].finishedsize)
			{
				if (stored[sta].finished) return 1;
				return -1;
			}

			if (a.islocal && !b.islocal) {
				return -1;
			} else if (!a.islocal && b.islocal) {
				// if the first file is not contained in local files and second file is, sort down
				return 1;
			} else if (a.islocal == b.islocal) {
				// if both are either on the harddisk or not on the hardisk, sort by filename.
				if (sta > -1 && stb > -1) {
					// if the size field is set in the first sort it upwards...
					if (stored[sta].size > -1 && stored[stb].size == -1) {
						return -1;
					} else if (stored[sta].size == -1 && stored[stb].size > -1) {
						// if the size field is not set in the first sort it downwards..
						return 1;
					} else if (stored[sta].size < stored[stb].size) {
						return -1;
					} else if (stored[sta].size > stored[stb].size) {
						return 1;
					}
				} else if (a.filename < b.filename) {
					return -1;
				} else if (a.filename > b.filename) {
					return 1;
				} else {
					return 0;
				}
			}
		});
	}

	writeStored();
			

	return { gitems: result, localfiles: files };
}




function checkauth(req) {
	return config.atoken.access_token;
}

async function listItems() {
	var result = await request.get(config.apiEndpoint + '/v1/mediaItems', {
		headers: { 'Content-Type': 'application/json' },
		qs: { pageSize: 100 },
		json: true,
		auth: { bearer: config.atoken.access_token }
	});

	var matches = [];

	matches = matches.concat(result.mediaItems);

	while (result && result.nextPageToken && !fasttest) {
		console.log('requesting another 100 items.');
		result = await request
			.get(config.apiEndpoint + '/v1/mediaItems', {
				headers: { 'Content-Type': 'application/json' },
				qs: { pageSize: 100, pageToken: result.nextPageToken },
				json: true,
				auth: { bearer: config.atoken.access_token }
			})
			.catch(function(error) {
				console.log(error);
				var ops = error.options;
			});

		if (result && result.mediaItems) {
			matches = matches.concat(result.mediaItems);
		}
	}

	for (var i in matches) {
		var found = false;

		for (var j in stored) {
			if (matches[i].id == stored[j].id) {
				found = true;
				stored[j].userid = config.userid;
				break;
			}
		}

		if (!found) {
			stored.push({
				id: matches[i].id,
				filename: matches[i].filename,
				size: -1,
				finished: false,
				userid: config.userid
			});
		}
	}

	writeStored();

	loadandsortStored();

	console.log('returning items.');
	return matches;
}

// Returns a list of all albums owner by the logged in user from the Library
// API.
async function libraryApiGetAlbums() {
	let albums = [];
	let nextPageToken = null;
	let error = null;
	let parameters = { pageSize: config.albumPageSize };

	try {
		// Loop while there is a nextpageToken property in the response until all
		// albums have been listed.
		do {
			console.log('loading albumns');

			// Make a GET request to load the albums with optional parameters (the
			// pageToken if set).
			const result = await request.get(config.apiEndpoint + '/v1/albums', {
				headers: { 'Content-Type': 'application/json' },
				qs: parameters,
				json: true,
				auth: { bearer: config.atoken.access_token }
			});

			console.log(`Response: ${result}`);

			if (result && result.albums) {
				console.log(`Number of albums received: ${result.albums.length}`);
				// Parse albums and add them to the list, skipping empty entries.
				const items = result.albums.filter((x) => !!x);

				albums = albums.concat(items);
			}
			parameters.pageToken = result.nextPageToken;
			// Loop until all albums have been listed and no new nextPageToken is
			// returned.
		} while (parameters.pageToken != null);
	} catch (err) {
		error = err.error.error || { name: err.name, code: err.statusCode, message: err.message };
		console.log(error);
	}

	console.log('Albums loaded.');
	return { albums, error };
}

//https://developers.google.com/identity/protocols/oauth2/web-server#httprest_1

async function refreshAccessToken() {
	console.log('Updating Access Token.');

	var parameters = {
		client_id: config.oAuthClientID,
		client_secret: config.oAuthclientSecret,
		refresh_token: fs.readFileSync('rtoken.txt').toString(),
		grant_type: 'refresh_token'
	};

	const result = await request.post(config.refreshAcessApiEndpoint, {
		//	headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		form: querystring.stringify(parameters)
		//	json: true,

	});

	// this needs to be where we store the f-ing auth token, fuck passport past the initial crap
	config.atoken = JSON.parse(result);
	config.atoken.expiretime = Date.now() + atoken.expires_in * 1000;

	refreshtimerrestart();

	return result;
}

function refreshtimerrestart() {
	if (config.refreshHandle > -1) {
		console.log('Shutting down refresh timer.');
		clearTimeout(config.refreshHandle);
		config.refreshHandle = -1;
	}

	config.refreshHandle = setTimeout(() => {
		refreshAccessToken();
	}, config.atoken.expires_in * 1000);

	console.log('Started refresh timer.');
}

var accounts = [];

function findUser() {
	var userfound = false;

	if (config.userid) {
		for (var i in accounts) {
			if (accounts[i].userid == config.userid) {
				config.curraccount = accounts[i];
				userfound = true;
				break;
			}
		}
	}

	return userfound;
}

function createUser() {
	if (config.userid) {
		var userfound = findUser();

		if (!userfound) {
			var acc = {
				userid: config.userid,
				title: 'Google User',
				localdirectory: localdir,
				onserverdirectory: onserverdir,
				destdir: pulldir
			};

			accounts.push(acc);
			config.curraccount = acc;

			return acc;
		}
	}

	return null;
}

function writeUserStore() {
	createUser();
	fs.writeFileSync('accountstores.json', JSON.stringify(accounts));
}

function loadUserStore() {
	if (!fs.existsSync('accountstores.json')) {
		writeUserStore();
	} else {
		accounts = JSON.parse(fs.readFileSync('accountstores.json'));
		writeUserStore();
	}
}


function testUpload(filename)
{

	var req = https.request('https://www.google.com',{method:"get"});
	
	var mt = mime.lookup(filename);
	var options =
	{
		headers: { 
					'Content-Type': 'application/octet-stream',
					'X-Goog-Upload-Content-Type': mt,
					'X-Goog-Upload-Protocol' : 'raw'
				 },

		auth: { 
			bearer: config.atoken.access_token
			}

	};

	request.post('https://photoslibrary.googleapis.com/v1/uploads',options)
}


function backupFile(filename)
{
	var dir = path.dirname(filename);
	var fn = path.basename(filename);
	var ext = path.extname(filename);
	var ds = Date.now();

	var d1 = dir+ path.sep+fn+'-backup-'+ds+ext;

	fs.copyFileSync('itemstore.json', d1);



	console.log("Backed up: "+filename+" to backup file: " +d1)
}

function statswrite()
{
	fs.writeFileSync('stats.json');
}