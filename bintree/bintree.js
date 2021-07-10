const { triggerAsyncId } = require('async_hooks');
const fs = require('fs');
const { create } = require('node:domain');
const { stringify } = require('node:querystring');
const path = require('path');

function createLevel(level, parent) {
	level.categories = {};
	level.files = [];
	level.count = 0;
	level.parent = parent;
}

function addFileToTree(tree, filename, index = 0, dname,keypath) {
	if (!tree.categories) {
		createLevel(tree);
	}

	if (index == filename.length) {
		// likely these will always be small.
        var found = false;
        var obj = null

        for (var i in tree.files)
        {
            obj = tree.files[i];

            if ( obj.filename == filename && obj.dirname == dname)
            {
                found = true;
                break;
            }
        }

		// either the same filename exists in a different directory
		// or the filename does not exist at all.
		if (!found) {
			
            obj = { filename: filename, dirname: dname };

			tree.files.push(obj);
			tree.count++;
			return { tree: tree, obj: obj, dup: false, exists: true, keypath:keypath };
		} else {
			console.log('duplicate filename ' + filename);
			return { tree: tree, obj: obj, dup: true, exists: true, keypath:keypath };
		}
	} else {
		var c = filename[index];

		if (!tree.categories[c]) {
			tree.categories[c] = [];
			tree.categories[c].c = c;
			createLevel(tree.categories[c], tree);
		}

        keypath.push(c);

		index++;
		// big fan of sensible recursion in js.
		return addFileToTree(tree.categories[c], filename, index, dname,keypath);
	}
}

function addByExtension(tree, filename) {
	var ext = path.extname(filename);

	if (!tree.extensions) {
		tree.extensions = {};
		tree.count = 0;
	}

	if (!tree.extensions[ext]) {
		tree.extensions[ext] = {};
		tree.extensions[ext].ext = ext;

		createLevel(tree.extensions[ext], 32, 126);
		tree.extensions[ext].count += 1;
		tree.count++;
		tree.extensions[ext].parent = tree;
	}

	// see now they're just going to pretend they didn't yank me out of here today years back or rather in the same fucking year and disguise
	// this as being anything but unlawful which it always is.

	return addFileToTree(tree.extensions[ext], path.basename(filename, ext), 0, path.dirname(filename),[ext]);
}

function findbyname(tree, filename, index, keypath, dname = null) {
	if (index == filename.length) {
		var found = false;
		var obj = null;

		for (i in tree.files) {
            obj = tree.files[i];
			if (tree.files[i].filename == filename && tree.files[i].dirname == dname) {
				found = true;
				obj = tree.files[i];
				break;
			}
		}

		if (!found) {
			return { found: false, tree: tree, keypath: keypath, obj: null };
		} else {
			return { found: true, tree: tree, keypath: keypath, obj: obj };
		}
	} else {
		var c = filename[index];

		if (tree.categories[c]) {
			keypath.push(c);
			index++;
			return findbyname(tree.categories[c], filename, index, keypath, dname);
		} else {
			return { found: false, tree: tree, keypath: keypath, obj: null };
		}
	}
}

function findByExtension(tree, filename, dname = null) {
	var ext = path.extname(filename);

	if (!tree.extensions[ext]) {
		return { notfound: true, keypath: null };
	}

	var keypath = [ ext ];

	return findbyname(tree.extensions[ext], path.basename(filename, ext), 0, keypath, dname);
}



var bintree = 
{
    addByExtension:addByExtension,
    findByExtension:findByExtension
}



module.exports = bintree;