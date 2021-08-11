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
const kt = require('./bintree/keytree');
const keytree = kt.keytree;
const KeyResult = kt.KeyResult;
const sizeof = require('object-sizeof');
const items = require('./storemgr/itemstore');
const sql = require('sqlite3').verbose();

const nodownload = false;

config.startService = refreshtimerrestart;

var storetree = {};

var processedstats = {
	userid: '',
	missinglocal: 0,
	missingonline: 0,
	notfinished: 0,
	//	finnotequaltostat: 0,
	finished: 0,
	total: 0,
	sizeretry: 0,
	size: 0,
	itemretry: 0,
	item: 0,
	mediaerror404: 0
};

//loadandsortStored();
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
const { debounce, size } = require('lodash');
const itemstore = require('./storemgr/itemstore');
const { UpdateSize } = require('./storemgr/itemstore');

itemstore.InitDB(OpenDatabase());

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
	if (!checkauth()) {
		console.log('sending user to authenticate page.');
		res.redirect('/auth/google');
	} else {
		console.log('sending user to sucess page');

		res.sendFile(__dirname + '/success.html');
	}
});

//TODO: UPDATE THIS TO USE SQLITE.
app.post('/redownloadstart', async (req, res) => {
	processedstats.userid = config.userid;
	var res1 = await CheckDownloads();
	var totals = await MoveOriginalsUpdateStore();
			// resolve the problem where original size is less than that on server but the original is missing
		var res2 = await itemstore.resolveMissingLocalSizeandDownload(config.curraccount.userid);


	endtimer = false;

	// kick off the queue timer.
	// in redesign queue timer will begin querying the database for items to run.

	timecall();
});

app.get('/getlist', async (req, res) => {
	if (checkauth()) {
		// less than optimal is where it doesnt check length.
		// unfortunately how can it without downloading every item if fucking google doesnt expose that field ?

		var total = await FillInitialQueueFromServer();
		var dls = await CheckDownloads();
		var locals = await MoveOriginalsUpdateStore();
		// resolve the problem where original size is less than that on server but the original is missing
		var res2 = await itemstore.resolveMissingLocalSizeandDownload(config.curraccount.userid);


		res.status(200).send({ message: 'completed', totals: total, local: locals });

		console.log('sent item info to client');
	} else {
		// user isn't authenticated. send to login.
		res.redirect('/auth/google');
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

app.get('/upload', async (req, res) => {
	testUpload('./images.jpeg');
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

app.get(
	'/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/', failureFlash: true, session: true }),
	(req, res) => {
		// User has logged in.

		console.log('User has logged in.');

		// moved this to be called by authenbticate callback.
		//	refreshtimerrestart();

		config.userid = req.user.profile.id;

		loadUserStore();

		//loadandsortStored();

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

//FINISHED
function pushtoQueue(destfilename, storeitem) {
	console.log('sent to queue.');
	waiting.push({ filename: destfilename, item: storeitem });
}


async function CheckDownloads()
{
	// fuck them i did this before.
	var files= recursepath(config.curraccount.destdir).map(function(v){ return path.basename(v)});

	await itemstore.UpdateMissingDownloadsByNames(files,config.curraccount.userid);

}


//FINISHED
async function MoveOriginalsUpdateStore() {

	// get the files locally stored, and recurse through these paths finding all video files
	var paths = [ config.curraccount.onserverdirectory, config.curraccount.localdirectory ];
	var files = [];

	console.log('recursing local store');

	// retrieve a list of local files.
	for (var i in paths) {
		files = files.concat(recursepath(paths[i]));
	}

	var onservercount = 0;
	var localonlycount = 0;

	// just in case we're processing a lot of files this offsets the performance hit to follow !
	var serverfiletree = {};

	// supporting multiple users now, reduce extra uploading etc.
	var itemnames = files.map(function(v) {
		return path.basename(v);
	});

	console.log('Comparing.');

	// get a list by filename from the itemstore
	var items = await itemstore.CheckExistsFileByNames(itemnames, config.curraccount.userid);
	// update the originalmissing field.
	var res4 = await itemstore.UpdateMissingLocalByNames(itemnames, config.curraccount.userid);

	for (var i in items) {
		keytree.addToTree(serverfiletree, items[i].FileNameOnServer, items[i]);
	}

	// empty results list
	items = null;

	//	var updatelist = [];

	for (var i in files) {
		// decide what to do with local files in the processing directories

		var found = keytree.findInTree(serverfiletree, path.basename(files[i]));

		if (found.Found) {
			// get the basename of the file.
			var bname = path.basename(files[i]);

			// move item to the onserver directory
			moveItems(files[i], config.curraccount.onserverdirectory);
			onservercount++;

			// update the file entry for the changed location
			files[i] = path.join(config.curraccount.onserverdirectory, bname);

			// get the original's size
			var stat = fs.statSync(files[i]);

			//		updatelist.push([ files[i], stat.size ]);

			// the downloads filename.
			var localdl = path.join(config.curraccount.destdir, bname);

			// update the original size field if necessary
			if (found.Obj.OriginalSize == null) {
				itemstore.UpdateOriginalSizeIf(found.Obj.Id, stat.size);
			}

			var szupdated = false;

			if (found.Obj.SizeOnServer == -1) {
				szupdated= true;
				var res = await updateSize(found.Obj, 5);
				if (!res.Success) {
					console.log('Could not update size. Deletion could be accidental, skipping.');
					continue;
				}
			}

			if (fs.existsSync(localdl)) {
				var statdl = fs.statSync(localdl);

				if (statdl.size != found.Obj.SizeOnServer && !szupdated)
				{
						var res = await updateSize(found.Obj, 5);
						if (!res.Success) {
							console.log('Could not update size. Deletion could be accidental, skipping.');
							continue;
						}
				}
				
				// google occasionally reports values less than it should
				// size wise and then these can be viewed and are of quality just the same.
				if (statdl.size < found.Obj.SizeOnServer) {
					fs.rmSync(localdl);
					processedstats.notfinished++;
					itemstore.MarkFinished(found.Obj.Id, false, 0, true);
				} else {
					itemstore.MarkFinished(found.Obj.Id, true, statdl.size, false);
				}
			} else {
				processedstats.missinglocal++;

				itemstore.MarkFinished(found.Obj.Id, false, 0, true);
			}
		} else {
			moveItems(files[i], config.curraccount.localdirectory);
			localonlycount++;
		}
	}

	console.log("LocalOnly: "+localonlycount+" OnServer: "+onservercount);

	return { local: localonlycount, server: onservercount };
}

//FINISHED
async function updateSize(storeitem, maxretries=5) {

	if (maxretries <=0 )
	{
		throw "Maxtries in updateSize CANNOT BE <=0 ! This will cause a fatal error.";
	}

	processedstats.size++;

	// we do this because this is a temporary url.
	var url = await refreshStoredUrl(storeitem);

	if (!url) {
		console.log("Size Update Canceled, couldn't retrieve url.");
		await itemstore.UpdateSize(storeitem.Id, -1);
		return {Success:false, item:storeitem};
	}

	console.log('Found URL: ' + url);

	var retry = true;
	var retries = 0;

	while (retry && retries < maxretries) {
		retry = false;

		if (retries > 0) {
			console.log('Retry Get Header #' + retries + ' of 5');
		}

		try {
			var h = await request.head(url + '=d' + (storeitem.VideoOption ? 'v' : ''), {}, (req, res) => {
				if (!res) {
					// returns blank response it seems.
					retry = true;
					retries++;
					console.log('Get header failed for ' + storeitem.FileNameOnServer);
				} else {
					// size update happens here.
					storeitem.SizeOnServer = res.headers['content-length'];
				}
			});
		} catch (err) {
			console.log('Head request failed.');
			retry = true;
			retries++;
			processedstats.sizeretry++;
		}

		if (!retry) {
			await itemstore.UpdateSize(storeitem.Id, storeitem.SizeOnServer);
		}
	}

	if (retries >= maxretries) {
		console.log('Failed to Update Size.');
		return {Success:false, item:storeitem};
	} else {
		console.log('Updated size.');
		return {Success:true, item:storeitem};
	}
}

//TODO: TEST THIS
async function refreshStoredUrl(storeitem) {
	var result = await getPhotoItem(storeitem.Id, 5);

	if (!result) {
		console.log('Could not retrieve item url');
		return null;
	} else {
		storeitem.VideoOption = result.mediaMetadata.video ? true : false;

		await itemstore.SetVideoOption(storeitem.Id, storeitem.VideoOption);

		console.log('Updated URL');

		return result.baseUrl;
	}
}

//TODO: MOVE THIS TO BEGINNING
function OpenDatabase() {
	var db = new sql.Database('ItemStore.sqlite');
	return db;
}

//TODO: TEST THIS
async function startJob(destfilename, storeitem) {
	//	var db = OpenDatabase();

	if (fs.existsSync(destfilename))
	{
		var stat = fs.statSync(destfilename)
		{
			if (storeitem.SizeOnServer <= stat.size)
			{
				console.log("Check file: "+storeitem.FileNameOnServer);
				console.log("Had no size defined ahead of download call, but file exists and is larger to or equal to size on server.");
				return null;
			}
		}

	}

	var url = await refreshStoredUrl(storeitem);

	if (!url) {
		console.log(storeitem.FileNameOnServer);
		console.log('JOB Canceled. Item is missing from online.');

		await itemstore.MarkFinished(storeitem.Id, true);

		storeitem.Finished = true;
		storeitem.missingonline = true;
		writeStored();

		//	db.close();
		return null;
	}

	var ostream = fs.createWriteStream(destfilename);

	ostream.on('finish', async function() {
		console.log(' PIPE FINISHED !: ' + this.filename);

		if (!this.storeitem.error) {
			var size = fs.statSync(this.destination);

			processedstats.finished++;

			this.storeitem.Finished = true;
			this.storeitem.Finishedsize = size.size;

			console.log('finished size: ' + this.storeitem.Finishedsize);

			await itemstore.MarkFinished(this.storeitem.Id, true);
			await itemstore.SetFinishedSize(this.storeitem.Id, size.size);

			// clear from queue.
			await itemstore.MarkWaitTillNext(this.storeitem.Id, false);
		} else {
			console.log('Request promise sent error.');
		}

		console.log('===>Id:' + this.storeitem.Id);

		pipes.splice(pipes.indexOf(this), 1);
	});

	ostream.on('error', function(err) {
		console.log(' PIPE ERROR LOADING ! : ' + this.filename);
		console.log(err);
	});

	var req = request.get(url + '=d' + (storeitem.VideoOption ? 'v' : ''));

	req.on('error', async function(err) {
		console.log('error with ' + this.filename);
		console.log('placing job back in queue.');

		var id = this.storeitem.Id;
		// this.path.replace('/', '');

		var pipeindex = -1;

		for (var i in pipes) {
			if (pipes[i].storeitem.Id == id) {
				pipeindex = i;
				break;
			}
		}

		if (pipeindex > -1) {
			//var db = OpenDatabase();

			var p = pipes[pipeindex];

			p.close();

			if (fs.existsSync(p.destination)) {
				console.log('deleting partial file.');
				fs.rmSync(p.destination);
			}

			pipes.splice(pipeindex, 1);

			p.storeitem.Finished = false;
			p.storeitem.error = true;

			await itemstore.MarkFinished(p.storeitem.Id, false);

			///	db.close();
		}

		pushtoQueue(this.destination, this.storeitem);
	});

	req.catch(function(err) {
		var issue = err;
		console.log('Default error handler for request reached.');
	});

	// this is still the request promise.
	req.storeitem = storeitem;
	req.filename = storeitem.FileNameOnServer;
	req.destination = destfilename;
	req.expectedSize = storeitem.SizeOnServer;

	// this is the ouput stream, maybe rename some shit ? LOL
	req.pipe(ostream);

	ostream.storeitem = storeitem;
	ostream.filename = storeitem.FileNameOnServer;
	ostream.expectedSize = storeitem.SizeOnServer;
	ostream.destination = destfilename;
	// tag the stream with the request object just in case we need to reference this.
	ostream.req = req;

	pipes.push(ostream);

	console.log('Active pipes: ' + pipes.length);
	console.log('Started Job For ' + storeitem.FileNameOnServer);

	return ostream;
}

var sizequeue=[];
var sizerunning = false;

async function sizecall(overide=false)
{
	if (sizerunning && !overide)
	{
		// like a fork. sort of. if true this method should already be running or waiting for a timer call.
		// override should only be set from inside this call.
		return;
	}

	sizerunning = true;
	var queueswap = [];

	while (sizequeue.length > 0)
	{
		var item = sizequeue.shift();

		// we should never encounter this if either the updatesize is not running or we already have a size.
		// so add back into queue and/or start the updatesize job.
		if (item.SizeOnServer == -1)
		{
			queueswap.push(item);
		
			if (!item.running)
			{			
				item.running = true;

				updateSize(item).then( (v)=>
				{
					if (v.Success)
					{
						console.log("Adding item to waiting download queue. Size Updated.");
						console.log(v.item.SizeOnServer);
						waiting.push(v.item);
					}
					else
					{
						console.log("Update size failed. Leaving out of queue. ")
					}
				}).catch((err)=>
				{
					console.log("updateSize failed: "+err);
				});
			}
		}
	}

	sizequeue = queueswap;

	if (sizequeue.length > 0)
	{
		// continue processing.
		setTimeout(() => {
			sizecall(true);	
		}, 5000);
	}
	else
	{
		sizerunning = false;
	}
}

// TODO: TEST THIS
// this function starts the queue timer and starts jobs as queue slots become available.
async function timecall() {
	endtimer = true;
	var googlegayasslimit = 4;
	var started = 0;
	var queueswap = [];

	// try to grab another 100 items waiting.
	if (waiting.length + sizequeue.length == 0) {
		waiting = await itemstore.getNext100Waiting(config.curraccount.userid);

		for (var i in waiting) {

			if (waiting[i].SizeOnServer == -1) {

				sizequeue.push(waiting[i]);
				sizecall();	
			} 
			else 
			{
				// if size is defined, download is ready to go.
				queueswap.push(waiting[i]);
			}
		}

		// put the altered queue in place of the original waiting queue.
		waiting = queueswap;
	}

	while (waiting.length > 0 && pipes.length < maxpipes) {
		endtimer = false;
		if (started == googlegayasslimit) break;

		var i = waiting.shift();
		var job = await startJob(path.join(config.curraccount.destdir, i.FileNameOnServer), i);

		if (!job) {
			console.log('Job Canceled.');
		}
	}

	var message = '';

	var waitingcount = await itemstore.getCountWaiting(config.curraccount.userid);
	var inmemqueue = waiting.length;
	var inmemsize = sizequeue.length;

	message += 'Active Pipes: ' + pipes.length + '  In DB Waiting: ' + waitingcount + '\n';
	message += 'Waiting in Mem: '+inmemqueue+"  Size Queue Size: "+inmemsize+'\n';

	for (var i in pipes) {
		var rate = 0;

		if (pipes[i].lastbytes) {
			rate = (pipes[i].bytesWritten - pipes[i].lastbytes) / (Date.now() - pipes[i].lastdate) / 1024 * 1000;
		}

		var perc = pipes[i].bytesWritten / pipes[i].storeitem.SizeOnServer * 100;

		message +=
			i +
			') ' +
			pipes[i].filename +
			'    ' +
			pipes[i].bytesWritten +
			'/' +
			pipes[i].storeitem.SizeOnServer +
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

	if (waiting.length == 0 && pipes.length == 0 && sizequeue.length ==0) {
		console.log('stopping timer');
	} else {
		setTimeout(() => {
			timecall();
		}, 5000);
	}

	console.log(processedstats);
}

// FINISHED
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

//FINISHED
async function getPhotoItem(id, maxretries = 5) {
	var retry = true;
	var retries = 0;
	processedstats.item++;
	var result = null;

	while (retry && retries < maxretries + 1) {
		retry = false;

		if (retries > 0) {
			console.log('GetItem failed, Retry ' + retries + ' of ' + maxretries);
		}

		try {
			result = await request
				.get(config.apiEndpoint + '/v1/mediaItems/' + id, {
					headers: { 'Content-Type': 'application/json' },
					qs: {},
					json: true,
					auth: { bearer: config.atoken.access_token }
				})
				.on('error', function(err) {
					console.log('MediaItem OnError');
					console.log(err.message);
					retry = true;
					retries++;
				});
		} catch (err) {
			console.log('reached catch-block error');
			console.log(err.message);

			// these only happen when there is something wrong with google
			// meaning the getlist returns the ids but the actual request returns nothing
			// however often these end up downloading anyway with a null size.
			// these sometimes tend to be encounetred also when google is undereporting the download size
			// something eventually fixes these.
			if (err.statusCode == 404) {
				console.log('item not found !');
				console.log(id);
				processedstats.mediaerror404++;
				await itemstore.setMediaErrorFlag(id, true);
				return null;
			}
			if (err.statusCode == 400) {
				console.log('media item not found !!');
				console.log(id);
				return null;
			} else {
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

var endtimer = false;

var pairs = {};
var stored = [];

//finished
function moveItems(file, dest) {
	var newname = path.join(dest, path.basename(file));

	if (file == newname) {
		return;
	}

	fs.renameSync(file, newname);

	console.log('Moved ' + path.basename(file));
}

// FINISHED
function checkauth() {
	return config.atoken && config.atoken.access_token && config.atoken.expiretime > Date.now();
}

//FINISHED
async function FillInitialQueueFromServer() {
	var totalitemcount = 0;

	var result = await request.get(config.apiEndpoint + '/v1/mediaItems', {
		headers: { 'Content-Type': 'application/json' },
		qs: { pageSize: 100 },
		json: true,
		auth: { bearer: config.atoken.access_token }
	});

	await itemstore.deleteQueue();

	var matches = [];

	matches = matches.concat(result.mediaItems);

	if (result && result.mediaItems) {
		await itemstore.addqueueitems(result.mediaItems);
		totalitemcount += result.mediaItems.length;
	}

	while (result && result.nextPageToken && !config.fasttest) {
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
			//	matches = matches.concat(result.mediaItems);
			await itemstore.addqueueitems(result.mediaItems);
			totalitemcount += result.mediaItems.length;
		}
	}

	var totals = await itemstore.getNewItems(config.curraccount.userid);

	if (totals > 0) {
		console.log('New Items found: ' + totals);
	}

	var res3 = await itemstore.setOnlineStatusFromQueue(config.curraccount.userid);

	var res2 = await itemstore.createNewStoreItemsFromQueue(config.curraccount.userid);

	var res = await itemstore.setWaitTillNextFromQueue(config.curraccount.userid);

	

	console.log('Found ' + totalitemcount + ' Items.');
	return totalitemcount;
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
	config.atoken.expiretime = Date.now() + config.atoken.expires_in * 1000;

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

		console.log("ADDED NEW USER TO ACCOUNTS ! UPDATE THE DIRECTORIES ACCORDINGLY AND RELOAD THIS PROGRAM !");

		if (!userfound) {
			var acc = {
				userid: config.userid,
				title: 'Google User',
				localdirectory: config.defaultlocaldir,
				onserverdirectory: config.defaultonserverdir,
				destdir: config.defaultpulldir
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

// this doesn't seem possible without verifying the stupid app
// the authorization scopes are set and PROBLEMO
function testUpload(filename) {
	//	var req = https.request('https://www.google.com', { method: 'get' });

	console.log('Uploading file: ' + filename);

	var mt = mime.lookup(filename);

	var options = {
		method: 'POST',
		port: 443,
		// if authorization is set in an 'auth' field or not set it fucks up the whole request
		// node itself throws a buried deep exception.
		headers: {
			'Content-Type': 'application/octet-stream',
			'X-Goog-Upload-Content-Type': mt,
			'X-Goog-Upload-Protocol': 'raw',
			Authorization: 'Bearer ' + config.atoken.access_token
		}
	};

	var bytesreq = https.request('https://photoslibrary.googleapis.com/v1/uploads', options, function(res) {
		console.log('reached response.');
		res.on('data', function(d) {
			console.log('upload result data:');
			console.log(d.toString());
		});
	});

	var buf = Buffer.alloc(10 * 1024 * 1024);

	var infile = fs.openSync(filename, 'r');

	var bread = fs.readSync(infile, buf, 0, 10 * 1024 * 1024);

	while (bread > 0) {
		if (bread < 10 * 1024 * 1024) {
			var destbuff = Buffer.alloc(bread);
			buf.copy(destbuff, 0, 0, bread);
			bytesreq.write(destbuff);
		} else {
			bytesreq.write(buf);
		}

		bread = fs.readSync(infile, buf, 0, 10 * 1024 * 1024);
	}

	bytesreq.end();
}

function backupFile(filename) {
	var dir = path.dirname(filename);
	var fn = path.basename(filename);
	var ext = path.extname(filename);
	var ds = Date.now();

	var d1 = dir + path.sep + fn + '-backup-' + ds + ext;

	fs.copyFileSync(filename, d1);

	console.log('Backed up: ' + filename + ' to backup file: ' + d1);
}

function statswrite() {
	fs.writeFileSync('stats.json');
}
