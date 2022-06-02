// TODO: THIS NEEDS UPDATED 
const { json } = require('express');
const fs = require('fs');
const path = require('path');
const keytree = require('./bintree/keytree')

var files = fs.readdirSync('.', { withFileTypes: true });

// this compensates for fuckups.
var orisizes = {};

console.log('find truncated original file sizes previously stored.');

var itemtree = {};

// go through all the backups and search for values that contain originalsize for files that may have been deleted
// as the desired results were found but development corrupted the write store.
for (var f in files) {
	if (!files[f].isDirectory()) {
		if (
			(path.extname(files[f].name) == '.json' && files[f].name.indexOf('itemstore.json-backup') > -1) ||
			files[f].name.indexOf('itemstore-backup') < -1
		) {
			var tempitems = [];

			try {
				console.log('Processing file: ' + files[f].name);
				tempitems = JSON.parse(fs.readFileSync(files[f].name));
			} catch (e) {
				console.log('error in json, skipping.');
				continue;
			}

			for (var i in tempitems) {
				var tempitem = tempitems[i];

				if (tempitem.id && tempitem.originalsize) {
					var found = keytree.findInTree(orisizes,tempitem.id);

					if (!found.found) {
						keytree.addToTree(orisizes, tempitem.id,  {
							id: tempitem.id,
							ori: tempitem.originalsize
						});
					} else {
						if (tempitem.originalsize > found.obj.tag.ori) {
							found.obj.tag.ori = tempitem.originalsize;
						}
					}
				}
			}
		}
	}
}

console.log('orisize array size: ' + orisizes.length);

console.log('loading items.');

var items = JSON.parse(fs.readFileSync('itemstore.json'));

var totalDL = 0;
var origsize = 0;
var newsize = 0;
var nosize = 0;
var alreadydl = 0;
var countdl = 0;
var countorig = 0;

function toGB(val) {
	return (
		val.toLocaleString(undefined, {
			minimumFractionDigits: 4,
			maximumFractionDigits: 4
		}) + ' Gb'
	);
}

function toPerc(val) {
	return (
		val.toLocaleString(undefined, {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		}) + '%'
	);
}

for (var i in items) {
	var item = items[i];
	

	var oriitem = keytree.findInTree(orisizes, item.id);

	if (oriitem.found) {
		if (oriitem.obj.tag.ori > item.originalsize) {
			item.originalsize = oriitem.obj.tag.ori;
		}
	}

	var finsize = 0;

	if (item.size) {
		// sometimes google doesn't update its item sizes correctly immediately
		// this resulst in finished sizes greater than the server reported size
		// obviously the finished size of the working value is the correct one to use
		finsize = item.finished && item.finishedsize ? item.finishedsize * 1 : item.size * 1;
		finsize = finsize > item.size * 1 ? finsize : item.size * 1;

		totalDL += finsize;

		if (item.finished) {
			alreadydl += finsize;
			countdl++;
		}

		// only track these together, depends on their being a ratio to compare
		if (item.originalsize) {
			newsize += finsize;
			origsize += item.originalsize * 1;
		}
	} else {
		nosize++;
	}

	// seperate statistic involving the original file being present.
	if (items[i].originalsize) {
		countorig++;
	}
}

console.log('writing updated itemtore.');
fs.writeFileSync('updated-itemstore.json', JSON.stringify(items));

totalDL = totalDL / 1024 / 1024 / 1024;
alreadydl = alreadydl / 1024 / 1024 / 1024;
origsize = origsize / 1024 / 1024 / 1024;
newsize = newsize / 1024 / 1024 / 1024;
percdiff = newsize / origsize * 100;

console.log('There are ' + items.length + ' items in the google photos store.');
console.log('There are ' + countorig + ' items which are tracking their original size.');
console.log('There are ' + nosize + ' items which do not have their server size info updated.');
console.log();
console.log('Of Tracked Original Size: ' + toGB(origsize) + ' New Size: ' + toGB(newsize));
console.log('Total To Download: ' + toGB(totalDL) + '  Already Downloaded:' + toGB(alreadydl));
console.log('Of the items being tracked transcoding saved ' + toGB(origsize - newsize));
console.log(
	'There are still yet ' +
		(items.length - countdl) +
		' at ' +
		toGB(totalDL - alreadydl) +
		' to download of items reporting server size.'
);
console.log('The ' + countdl + ' items downloaded already are occupying ' + toGB(alreadydl));
console.log('Of the tracked items the new items take up ' + toPerc(percdiff) + ' of the original space');
