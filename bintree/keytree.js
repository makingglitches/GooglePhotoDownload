const { triggerAsyncId } = require('async_hooks');
const fs = require('fs');
const { create } = require('node:domain');
const { stringify } = require('node:querystring');
const path = require('path');
const lodash = require('lodash')

 class KeyResult
{
	constructor(parent, key, time, tag, existed, keypath, found)
	{
		this.Tree = parent;
		this.Key = key;
		this.Existed = existed;
		this.Found = found;
		this.Time = time;
		this.Obj = tag;
	}
}

function createLevel(level, parent) {
	level.categories = {};
	level.keys = [];
	level.count = 0;
	level.parent = parent;
}

function addToTree(tree, key,  tag, index=0, keypath = null) {
	var begindate = Date.now();
	var tt =0;

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

			tt = Date.now() - begindate;

			return new KeyResult( tree, key, tt,tag, true, keypath, found );

		} else {

			tt = Date.now() - begindate
			console.log('duplicate key ' + key);

			return 	new KeyResult( tree, key, tt,tag, false, keypath, found );
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

		res.Time+=tt;

		return res;
	}
}


function removeFromTree(tree, key)
{
	var f = findInTree(tree,key);

	if (f.found)
	{
		var treeptr = tree;

		for (var i  in f.keypath )
		{
			var treeptr = treeptr.categories[f.keypath[i]];
		}

		treeptr.keys = lodash.remove( treeptr.keys, function(t)
		{
		   return t.key = key;
		});
	}
}

function findInTree(tree, key, index=0, keypath=null) {
	var begindate = Date.now();
	var tt = 0;

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

			return new KeyResult( tree, key, tt,null, false, keypath, false );

		//	return { found: false, time: tt, tree: tree, keypath: keypath, obj: null };
		} else {

			tt = Date.now() - begindate
			return new KeyResult( tree, obj.key, tt,obj.tag, true, keypath, true );

			//return { found: true, time: tt, tree: tree, keypath: keypath, obj: obj };
		}
	} else {
		
		var c = key[index];

		if (tree.categories &&  tree.categories[c]) {
			keypath.push(c);
			index++;

			tt = Date.now() - begindate

			var res = findInTree(tree.categories[c], key, index, keypath);
			res.Time+=tt;

			return res;

		} else {

			tt = Date.now() - begindate
			return new KeyResult( tree, key, tt,null, false, keypath, false );
			//return { found: false, time:tt, tree: tree, keypath: keypath, obj: null };
		}
	}
}




var keytree = 
{
	addToTree:addToTree,
    findInTree:findInTree,
	removeFromTree:removeFromTree,

}



module.exports.keytree = keytree;
module.exports.KeyResult = KeyResult;