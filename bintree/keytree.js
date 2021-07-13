const { triggerAsyncId } = require('async_hooks');
const fs = require('fs');
const { create } = require('node:domain');
const { stringify } = require('node:querystring');
const path = require('path');

function createLevel(level, parent) {
	level.categories = {};
	level.keys = [];
	level.count = 0;
	level.parent = parent;
}

function addToTree(tree, key,  tag, index=0, keypath = null) {
	begindate = Date.now()

	if (!keypath)
	{
		keypath = [];
	}

	if (!tree.categories) {
		createLevel(tree);
	}

	if (index == key.length) {
		// likely these will always be small.
        var found = false;
        var obj = null

        for (var i in tree.keys)
        {
            obj = tree.keys[i];

            if ( obj.key == key)
            {
                found = true;
                break;
            }
        }

		// either the same key exists in a different directory
		// or the key does not exist at all.
		if (!found) {
			
            obj = { key: key, tag: tag };

			tree.keys.push(obj);
			tree.count++;
			tt = date.now() - begindate;

			return { tree: tree, time:tt, obj: obj, existed: true, keypath:keypath, found:false };
		} else {
			tt = Date.now() - begindate
			console.log('duplicate key ' + key);
			return { tree: tree, time:tt, obj: obj, existed: false, keypath:keypath, found:true };
		}
	} else {
		var c = key[index];

		if (!tree.categories[c]) {
			tree.categories[c] = [];
			tree.categories[c].c = c;
			createLevel(tree.categories[c], tree);
		}

        keypath.push(c);

		index++;
		tt = Date.now() - begindate
		// big fan of sensible recursion in js.
		var res = addToTree(tree.categories[c], key, tag,index, keypath);
		res.time+=tt;
		return res;
	}
}

function findInTree(tree, key, index=0, keypath=null) {
	begindate = Date.now()
	if (!keypath)
	{
		keypath = [];
	}

	if (index == key.length) {
		var found = false;
		var obj = null;

		for (i in tree.keys) {
            obj = tree.keys[i];
			if (tree.keys[i].key == key ) {
				found = true;
				obj = tree.keys[i];
				break;s
			}
		}

		if (!found) {
			tt = Date.now() - begindate
			return { found: false, time: tt, tree: tree, keypath: keypath, obj: null };
		} else {
			tt = Date.now() - begindate
			return { found: true, time: tt, tree: tree, keypath: keypath, obj: obj };
		}
	} else {
		var c = key[index];

		if (tree.categories &&  tree.categories[c]) {
			keypath.push(c);
			index++;
			tt = Date.now() - begindate
			var res = findInTree(tree.categories[c], key, index, keypath);
			res.time+=tt;
			return res;
		} else {
			tt = Date.now() - begindate
			return { found: false, time:tt, tree: tree, keypath: keypath, obj: null };
		}
	}
}




var keytree = 
{
	addToTree:addToTree,
    findInTree:findInTree
}



module.exports = keytree;