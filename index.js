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
	}
	else {
		console.log('sending user to sucess page');

		res.sendFile(__dirname + '/success.html');
	}
});

app.post('/redownloadstart', async (req, res) => {
	if (pairs) {
		endtimer = false;

		timecall();
	}
	else {
		res.status(500).send('Problem, need to load a list of photo api mediaitems first.');
	}

	for (var i in pairs.gitems) {
		console.log('At index ' + i + ' of ' + pairs.gitems.length);

		var item = pairs.gitems[i];

		// retrieve item from itemstore
		var storeindex = searchstore(item.id);
		var storeitem = stored[storeindex];

		// download headers have not been pulled back if expected size is -1
		if (!storeitem.size || storeitem.size == -1) {
			await updateSize(req.user.token, storeitem, 5);
		}

		var destfilename = pulldir + "/" + item.filename;

		// check if the download appears to be done.
		if (fs.existsSync(destfilename)) {
			var stat = fs.statSync(destfilename);

			// the expected size exists.
			// mark to be skipped.
			if (stat.size == storeitem.size) {
				storeitem.finished = true;
				writeStored();


				console.log('File ' + item.filename + ' already finished');
			}
			else {
				// remove the file and start again
				storeitem.finished = false;
				writeStored();

				console.log('File ' + item.filename + ' marked for redownload');

				if (stat.size == 0) {
					console.log('Has size 0, deleteing');
				}
				else {
					console.log('Has unmatched sizes, deleting');
				}

				fs.rmSync(destfilename);
			}
		}


		if (!storeitem.finished) pushtoQueue(destfilename, storeitem, req.user.token);
	}

	endtimer = true;
});

app.get('/getlist', async (req, res) => {
	if (req.isAuthenticated() || req.user) {
		// less than optimal is where it doesnt check length.
		// unfortunately how can it without downloading every item if fucking google doesnt expose that field ?

		pairs = await getpairedlist(req.user.token, [
			localdir,
			onserverdir
		]);

		var onserver = [];
		var localonly = [];

		var itemnames = pairs.gitems.map(function(v) {
			return v.filename;
		});

		console.log('Comparing.');

		for (var i in pairs.localfiles) {
			var f = itemnames.indexOf(path.basename(pairs.localfiles[i].toString()));

			if (f > -1) {
				onserver.push(pairs.localfiles[i].toString());
			}
			else {
				localonly.push(pairs.localfiles[i].toString());
			}
		}

		pairs.onserver = onserver;
		pairs.localonly = localonly;

		moveItems(pairs.onserver, onserverdir);
		moveItems(pairs.localonly, localdir);

		res.status(200).send({message:"completed", server:pairs.onserver.length, local:pairs.localonly.length});

		console.log('sent item info to client');
	}
});

app.get('/logout', (req, res) => {
	req.logout();
	req.session.destroy();
	res.redirect('/');
});

function acallback(arg1,arg2,arg3,arg4)
{
	console.log("reached auth callback");
}

// Start the OAuth login process for Google.
app.get(
	'/auth/google',
	passport.authenticate('google', {
		scope: config.scopes,
		failureFlash: true, // Display errors to the user.
		session: true
	}, acallback )
);

app.get('/jquery.js', (req, res) => {
	res.send(fs.readFileSync('./node_modules/jquery/dist/jquery.js'));
});

app.get('/albums', async (req, res) => {
	if (checkauth(req)) {
		var a = await libraryApiGetAlbums(req.user.token);
		res.status(200).send({ data: a });
	}
	else {
		res.redirect('/auth/google');
	}
});

app.get(
	'/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/', failureFlash: true, session: true }),
	(req, res) => {
		// User has logged in.
		console.log('User has logged in.');
		res.redirect('/');
	}
);

server.listen(config.port, () => {
	console.log(`App listening on port ${config.port}`);
	console.log('Press Ctrl+C to quit.');
});

function pushtoQueue(destfilename, storeitem, authToken) {
	
	console.log('sent to queue.');
	waiting.push({ filename: destfilename, item: storeitem, authToken: authToken });
}

async function updateSize(authToken, storeitem, maxretries) {
	var url = await refreshStoredUrl(authToken, storeitem);

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
				}
				else {
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
		}
	}

	console.log('Updated size.');
}

function searchstore(id) {
	for (var i in stored) {
		if (stored[i].id == id) {
			return i;
		}
	}

	return -1;
}

async function refreshStoredUrl(authToken, storeitem) {
	var result = await getitem(authToken, storeitem.id);

	delete storeitem.baseUrl;
	delete storeitem.lastdate;

	storeitem.voption = result.mediaMetadata.video ? 'v' : '';

	writeStored();

	console.log('Updated URL');

	return result.baseUrl;
}

async function startJob(destfilename, storeitem, authToken) {
	var url = await refreshStoredUrl(authToken, storeitem);

	var ostream = fs.createWriteStream(destfilename);

	ostream.on('finish', function() {
		console.log(' PIPE FINISHED !: ' + this.filename);

		this.storeitem.finished = true;
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

		pipes[i].close();

		if (fs.existsSync(pipes[i].destination)) {
			console.log('deleting partial file.');
			fs.rmSync(pipes[i].destination);
		}

		var p = pipes[i];

		pipes.splice(i, 1);

		pushtoQueue(p.destination, p.storeitem, p.authToken);
	});

	pipe.catch(function(err) {
		var issue = err;
	});

	pipe = pipe.pipe(ostream);

	pipe.storeitem = storeitem;
	pipe.filename = storeitem.filename;
	pipe.expectedSize = storeitem.size;
	pipe.destination = destfilename;
	pipe.authToken = authToken;

	pipes.push(pipe);

	console.log('Active pipes: ' + pipes.length);
	console.log('Started Job For ' + storeitem.filename);
}

// this function starts the queue timer and starts jobs as queue slots become available.
async function timecall() {
	var googlegayasslimit = 4;
	var started = 0;

	while (waiting.length > 0 && pipes.length < maxpipes) {
		if (started == googlegayasslimit) break;

		var i = waiting.shift();
		await startJob(i.filename, i.item, i.authToken);
	}

	var message = '';

	message += 'Active: ' + pipes.length + '  Waiting: ' + waiting.length + '\n';

	for (var i in pipes) {
		var rate = 0;

		if (pipes[i].lastbytes) {
			rate = (pipes[i].bytesWritten - pipes[i].lastbytes) / (Date.now() - pipes[i].lastdate) / 1024 * 1000;
		}

		if (pipes[i].bytesWritten > pipes[i].storeitem.size && !pipes[i].wrote)
		{
			fs.appendFileSync("mismatched.txt",pipes[i].filename+"\n");
			pipes[i].wrote=true;
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
	}
	else {
		setTimeout(() => {
			timecall();
		}, 5000);
	}
}

function recursepath(path) {
	var files = [];

	var dir = fs.readdirSync(path, { withFileTypes: true });

	for (var i in dir) {
		if (dir[i].isFile()) {
			files.push(path + '/' + dir[i].name.toString());
		}
		else {
			files = files.concat(recursepath(path + '/' + dir[i].name));
		}
	}

	return files;
}

async function getitem(authToken, id, maxretries = 5) {
	var retry = true;
	var retries = 0;

	while (retry && retries < maxretries + 1) {
		retry = false;

		if (retries > 0) {
			console.log('GetItem failed, Retry ' + retries + ' of ' + maxretries);
		}

		var result = await request
			.get(config.apiEndpoint + '/v1/mediaItems/' + id, {
				headers: { 'Content-Type': 'application/json' },
				qs: {},
				json: true,
				auth: { bearer: authToken }
			})
			.on('error', function(err) {
				retry = true;
				retries++;
			});
	}

	return result;
}

var maxpipes = 5;
var pipes = [];
var waiting = [];
//var canbeskipped = [];

var endtimer = false;
const fasttest = false;
const localdir = "/Data/Desktop/Combined Photos etc/mp4locals";
//'C:\\Users\\John\\Desktop\\Combined Photos etc\\mp4locals';
const onserverdir = "/Data/Desktop/Combined Photos etc/mp4sonserver";
//'C:\\Users\\John\\Desktop\\Combined Photos etc\\mp4sonserver';
const othersourcedir = '';
const pulldir = "/Data/Desktop/Combined Photos etc/mp4spulled";
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
		if (a.finished && !b.finished) return 1;
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

async function getpairedlist(authToken, paths) {
	loadandsortStored();

	var files = [];

	for (var i in paths) {
		files = files.concat(recursepath(paths[i]));
	}

	console.log('requesting items en masse.');

	var result = await listItems(authToken);

	console.log('got info on ' + result.length + ' items.');

	// these will only be used here
	var namesonly = files.map(function(val) {
		return path.basename(val.toString());
	});


	// sort the gitems array in pairs.
	// if originals are on server already, to save disk space download these first.
	// so they can be compared and deleted.
	result.sort(function(a, b) {
		// sort items that are in the store right below the
		var sta = searchstore(a.id);
		var stb = searchstore(b.id);

		// sort items that are alredy on the harddrive to the top.
		var conta = namesonly.indexOf(a.filename) > -1;
		var contb = namesonly.indexOf(b.filename) > -1;

		var contai = namesonly.indexOf(a.filename);
		var contbi = namesonly.indexOf(b.filename);

		if (conta && sta > -1) {
			if (path.basename(files[contai].toString()) != namesonly[contai]) {
				console.log('Files at index: ' + contai + " don't match !");
				throw new exception('error with files. pausing.');
			}

			var stat = fs.statSync(files[contai]);
			stored[sta].originalsize = stat.size;

			writeStored();
		}

		if (contb && stb > -1) {
			if (path.basename(files[contbi].toString()) != namesonly[contbi]) {
				console.log('Files at index: ' + contbi + " don't match !");
				throw new exception('error with files. pausing.');
			}

			var stat = fs.statSync(files[contbi]);
			stored[stb].originalsize = stat.size;

			writeStored();
		}

		a.islocal = conta;
		b.islocal = contb;

		// if the first file is contained and the second is not, it gets sorted up
		if (conta && !contb) {
			return -1;
		}
		else if (!conta && contb) {
			// if the first file is not contained in local files and second file is, sort down
			return 1;
		}
		else if (conta == contb) {
			// if both are either on the harddisk or not on the hardisk, sort by filename.
			if (sta > -1 && stb > -1) {
				// if the size field is set in the first sort it upwards...
				if (stored[sta].size > -1 && stored[stb].size == -1) {
					return -1;
				}
				else if (stored[sta].size == -1 && stored[stb].size > -1) {
					// if the size field is not set in the first sort it downwards..
					return 1;
				}
				else if (stored[sta].size < stored[stb].size) {
					return -1;
				}
				else if (stored[sta].size > stored[stb].size) {
					return 1;
				}
			}
			else if (a.filename < b.filename) {
				return -1;
			}
			else if (a.filename > b.filename) {
				return 1;
			}
			else {
				return 0;
			}
		}
	});

	return { gitems: result, localfiles: files };
}

// GET request to log out the user.
// Destroy the current session and redirect back to the log in screen.

function checkauth(req) {
	return req.user || req.isAuthenticated();
}

async function listItems(authToken) {
	var result = await request.get(config.apiEndpoint + '/v1/mediaItems', {
		headers: { 'Content-Type': 'application/json' },
		qs: { pageSize: 100 },
		json: true,
		auth: { bearer: authToken }
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
				auth: { bearer: authToken }
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
				break;
			}
		}

		if (!found) {
			stored.push({ id: matches[i].id, filename: matches[i].filename, size: -1, finished: false });
		}
	}

	writeStored();
	loadandsortStored();

	console.log('returning items.');
	return matches;
}

// Returns a list of all albums owner by the logged in user from the Library
// API.
async function libraryApiGetAlbums(authToken) {
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
				auth: { bearer: authToken }
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
