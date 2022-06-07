
const getrows = require('./getRows')
const queryResult = require('./queryresult')
const sqlite3 = require('sqlite3').verbose();
const { any } = require('async');
const { create } = require('lodash');
const path = require('path');
const { query } = require('express');
// itemstore object
// {
//     "id": "AAs_2xY0TPLdYdba-IcKQZVIy8JnzzxO9FrmyrvNY3m2jCD1nZS-ctJRdeYiZ3jHvjhJXdgOkbyTN8A3RfjOLAjPpHy8xJw2oA",
//     "filename": "IMG_2115.MOV",
//     "size": "5868486",
//     "finished": false,
//     "userid": "115473458188357073643",
//     "VideoOption": "v",
//     "online": true,
//     "missinglocal": true
// }


var db = null;

// async function runsql(db, sql, params = null) {
// 	if (params == null) {
// 		params = [];
// 	}

// 	var res = await new Promise((resolve, reject) => {
// 		try {
// 			var res =  db.run(sql, params);
// 			resolve(true);
// 		} catch (err) {
//             throw err;
// 		}
// 	});

// 	return res;
// }

async function getItemCount() {
	var r = await getrows(db, 'select count(*) as counted from storeitem');
	return r.success ? r.rows[0].counted : null;
}

async function SetVideoOption(id, VideoOption) {
	var r = await getrows(db, 'update storeitem set VideoOption=? where id = ?', [ VideoOption, id ]);
	return r.success;
}

async function FileInStore(filename, userid = null) {
	var sql = 'select id from storeitem where filenameonserver=? ';
	var params = [ path.basename(filename) ];

	if (userid) {
		params.push(userid);
		sql += userid != null ? ' and userid=?' : '';
	}

	var r = await getrows(db, sql, params);

	if (r.success) {
		if (r.rows.length > 0) {
			return { res: true, id: r.rows[0], file: filename };
		} else {
			return { res: false, id: -1, file: filename };
		}
	}

	throw r.err;
}

async function AddStoreItem(id, filename, userid) {
	var r = await getrows(db, 'insert into StoreItem(id,filenameonserver,userid) values (?, ?, ?)', [
		id,
		filename,
		userid
	]);

	return r.success;
}

async function MarkFinished(id, finished, finishedsize, downloadmissinglocal = false) {
	var r = await getrows(
		db,
		'update StoreItem set finished= ?,  finishedsize= ?, downloadmissinglocal=? where id =? ',
		[ finished, finishedsize, downloadmissinglocal, id ]
	);

	return r.success;
}

async function MarkMissingLocal(id, val) {
	var r = await getrows(db, 'update storeitem set missinglocal = ? where id =?', [ val, id ]);

	return r.success;
}

async function UpdateOriginalSizeIf(id, size) {
	var r = await getrows(db, 'update storeitem set originalsize = ? where id = ? and originalsize is null', [
		size,
		id
	]);
	return r.success;
}

async function UpdateSize(id, size) {
	var r = await getrows(db, 'update storeitem set sizeonserver = ? where id = ?', [ size, id ]);
	return r.success;
}

async function CheckExists(id) {
	var r = await getrows(db, 'select 1 from StoreItem where id=?', id);

	return r.success && r.rows.length == 1 ? true : false;
}

async function GetIds() {
	var r = await getrows(db, 'select id, finished from storeitem where 1=1');

	return r.success ? r.rows : null;
}

async function GetById(id) {
	var r = await getrows(db, 'select * from storeitem where id=?', [ id ]);
	return r.success && r.rows.length == 1 ? r.rows[0] : null;
}

async function GetItems(userid = null, offset = null, limit = null) {
	var sql =
		' select * from storeitem ' +
		(limit != null ? ' limit ' + limit : ' ') +
		(offset != null ? ' offset ' + offset : ' ') +
		(userid != null ? ' where userid=?' : ' ');

	var r = await getrows(db, sql, userid == null ? [] : [ userid ]);

	return r.success && r.rows.length > 0 ? r.rows : null;
}

async function getMissingSizeCount(userid)
{
	var sql = 'select count(*) as countnosize from storeitem where sizeonserver == -1 and userid=? and processsize=1';
	var r = await getrows(db,sql,[userid]);
	return r.rows[0]['countnosize'];
}

async function GetUnfinishedItems(userid = null, offset = null, limit = null) {
	var sql =
		' select * from storeitem ' +
		' where finished=0 ' +
		(userid != null ? ' and userid=?' : ' ') +
		(limit != null ? ' limit ' + limit : ' ') +
		(offset != null ? ' offset ' + offset : ' ');

	var r = await getrows(db, sql, userid == null ? [] : [ userid ]);
	return r.success && r.rows.length > 0 ? r.rows : null;
}

async function SetFinishedSize(id, size) {
	var r = await getrows(db, 'update storeitem set finishedsize=? where id=?', [ size, id ]);
	return r.success;
}

async function MarkWaitTillNext(id, val) {
	var r = await getrows(db, 'update storeitem set waittillnext=? where id=?', [ val, id ]);

	return r.success;
}

async function ClearAllWaitTillNext(userid) {
	var r = await getrows(db, 'update storeitem set waittillnext=0 where userid=? ', [ userid ]);

	return r.success;
}

function InitDB(_db) {
	db = _db;
}

async function GetItemsByIds(idarray) {
	prepare = idarray
		.map(function(v) {
			return "'" + v + "'";
		})
		.join();

	var r = await getrows(db, 'select * from storeitem where id in (?)', [ prepare ]);

	return r.success ? r.rows : null;
}

async function CheckExistsFileByNames(namesarray, userid) {
	prepare = namesarray
		.map(function(v) {
			return "'" + v + "'";
		})
		.join();
	prepare = '(' + prepare + ')';

	// i don't know why i have to do it this way
	// TODO: CHECK IF I CAN JUST SEND AN ARRAY IN, WHICH I DON'T THINK I CAN ACTUALLY.
	var r = await getrows(
		db,
		'select * from storeitem where filenameonserver in ' + prepare + ' and userid=? and mediaitemerror404=0 ',
		[ userid ]
	);

	return r.success ? r.rows : null;
}

async function UpdateMissingLocalByNames(namesarray, userid) {
	prepare = namesarray
		.map(function(v) {
			return "'" + v + "'";
		})
		.join();
	prepare = '(' + prepare + ')';

	var sql =
		`update storeitem
			   set originalmissinglocal = not storeitem.filenameonserver in  ` +
		prepare +
		`
			   where userid=?`;

	// i don't know why i have to do it this way
	// TODO: CHECK IF I CAN JUST SEND AN ARRAY IN, WHICH I DON'T THINK I CAN ACTUALLY.
	var r = await getrows(db, sql, [ userid ]);

	return r.success;
}

async function UpdateMissingDownloadsByNames(namesarray, userid) {
	prepare = namesarray
		.map(function(v) {
			return "'" + v + "'";
		})
		.join();
	prepare = '(' + prepare + ')';

	var sql =
		`update storeitem
			   set DownloadMissingLocal = not storeitem.filenameonserver in  ` +
		prepare +
		`
			   where userid=?`;

	// i don't know why i have to do it this way
	// TODO: CHECK IF I CAN JUST SEND AN ARRAY IN, WHICH I DON'T THINK I CAN ACTUALLY.
	var r = await getrows(db, sql, [ userid ]);

	return r.success;
}

async function deleteQueue() {
	var r = await getrows(db, 'delete from queuestore', []);

	return r.success;
}

async function addqueueitems(itemlist) {
	await db.run('begin transaction');

	try {
		for (var i in itemlist) {
			var p = [ itemlist[i].id, itemlist[i].filename, JSON.stringify(itemlist[i].mediaMetadata) ];

			var stmt = await getrows(db, 'insert into queuestore(id, filename,mediadata) values (?,?,?) ', p);

			//	await stmt.finalize();
		}

		//stmt.finalize();
		await db.run('commit');
	} catch (err) {
		console.log('Error within addqueue. rollback.');
		await db.run('rollback');
	}
}

async function getNewItems(userid) {
	var sql =
		'select count(*) as newitemcount from queuestore q ' +
		'where not exists (select null from storeitem s where  s.id=q.id and s.userid=?)';

	var newitems = await getrows(db, sql, [ userid ]);

	return newitems.success ? newitems.rows[0]['newitemcount'] : 0;
}

// Get a list of
async function setWaitTillNextFromQueue(userid) {
	suc = await ClearAllWaitTillNext(userid);

	sql = `update storeitem  
	set waittillnext = (not storeitem.finished) and (storeitem.sizeonserver==-1 or storeitem.originalsize is null or  storeitem.originalsize=0 or  storeitem.originalsize > storeitem.sizeonserver)
	from queuestore q
	where q.id = storeitem.id
	and storeitem.userid=? and storeitem.MediaItemError404=0`;

	var stmt = db.prepare(sql, [ userid ]);

	var res = await getrows(db, sql, [ userid ]);

	return res.success;
}

async function getNext100Waiting(userid) {
	sql = 'select * from StoreItem where WaitTillNext=1 and userid=? and MediaItemError404=0 and SizeUpdateFailureCount < 21 limit 100';

	var res = await getrows(db, sql, [ userid ]);

	return res.success ? res.rows : null;
}

async function setOnlineStatusFromQueue(userid) {
	// i wish their dumbass syntax allowed something other than 2 subqueries.
	var sql = `update storeitem
				set online = exists(select null from Queuestore q where q.id=storeitem.id),
				finished =  (storeitem.mediaitemerror404=1) or storeitem.finished or (not exists (select null from QueueStore q where q.id=storeitem.id))
				where userid=?`;

	var res = await getrows(db, sql, [ userid ]);
	return res.success;
}

async function createNewStoreItemsFromQueue(userid) {
	var sql =
	`insert into StoreItem(Id,FileNameOnServer,MediaData,UserId,WaitTillNext)
	select q3.Id, q3.FileName, q3.MediaData, ? ,1 from queuestore q3
	where not exists (select null from storeitem s where s.id = q3.id)
	group by q3.id having count(*) = 1
	
	union
	
	SELECT distinct q3.Id, q3.FileName, q3.MediaData, ?,1 FROM QUEUESTORE Q3
	inner JOIN
	(select
	distinct q.id,
	(
	select json_extract(q2.mediadata,'$.creationTime') AS DATE1 FROM QUEUESTORE Q2
	WHERE Q2.ID = Q.ID
	ORDER BY DATE1 ASC
	LIMIT 1
	) AS DATE1
	FROM QUEUESTORE Q
	GROUP BY Q.ID
	HAVING COUNT(*) > 1) AS T
	
	ON T.ID = Q3.ID AND JSON_EXTRACT(Q3.MEDIADATA,'$.creationTime') = T.date1
	
	where not exists (select null from storeitem s where s.id = q3.id)
	order by q3.filename`

	var res = await getrows(db, sql, [ userid, userid ]);

	return res.success;
}


async function setHash(id, hash, original = false)
{
	var sql = 'update StoreItem set ' + 
	(original? "OriginalSha256":"DownloadedSha256") +
	"= ? where Id = ?";

	var r = await getrows (db,sql,[hash,id]);

	return r.success;
}

async function getCountWaiting(userid) {
	var sql = 'select count(*) as waitingcount from StoreItem where userid=? and  SizeUpdateFailureCount <21 and waittillnext=1';

	var res = await getrows(db, sql, [ userid ]);

	return res.rows[0].waitingcount;
}

async function setMediaErrorFlag(id, status) {
	var res = await getrows(db, 'update storeitem set MediaItemError404=?, waittillnext=0 where id=?', [ status, id ]);
	return res.success;
}

// this sets the queuestatus to 1 if the original has gone missing.
async function resolveMissingLocalSizeandDownload(userid) {
	var sql = `update StoreItem
				set WaitTillNext =  (originalmissinglocal=1 and downloadmissinglocal=1) or (downloadmissinglocal=1 and originalsize > sizeonserver),
				    Finished = not  ((originalmissinglocal=1 and downloadmissinglocal=1) or (downloadmissinglocal=1 and originalsize > sizeonserver))
				where userid=? and mediaitemerror404=0`;

	var res = getrows(db, sql, [ userid ]);

	return res.success;
}

async function IncrementSizeFailure(id)
{
	var sql = 'update StoreItem set SizeUpdateFailureCount = SizeUpdateFailureCount +1 where Id=?'

	var res = getrows(db,sql,[id]);

	return res.success;

}

async function ClearSizeFailureCount(userid)
{
	var sql = 'update StoreItem set SizeUpdateFailureCount = 0, ProcessSize=1 where userid=? and SizeUpdateFailureCount > 0'
	var res = getrows(db,sql,[userid]);

	return res.success;
}

async function getNext100WaitingSize(userid)
{
	var sql = 'select * from StoreItem where processsize=1 and sizeonserver=-1  and userid=? limit 100'

	var res = await getrows(db,sql, [userid]);

	return res.success ? res.rows: null;
}

async function updateProcessSize(id,process)
{
	var sql = 'update StoreItem set Processsize =? where Id=? ';

	var res = await getrows(db,sql,[process,id]);

	return res.success;
}

async function getAllStoreFolders()
{
	var sql = 'select * from ImageDirectories'

	var res = await getrows(db,sql)

	return res.success ? res.rows : null
}

async function CreateStoreItemLocationIfMissing(storeitem, directory)
{
	var sql = 'select * from ImageDirectories where Directory = ?'

	var res = await getrows(db, sql, [directory])

	if (res.success && res.rows && res.rows.length == 1)
	{

		// itemlocation exists, check a few things.

		var imagedir = res.rows[0];
		
		if (imagedir.userid)
		{
			
		}

	}
	else
	{
		return new queryResult(false,null,'No ImageDirectory Item for '+directory)
	}
	

}

module.exports = {
	InitDB: InitDB,
	MarkMissingLocal: MarkMissingLocal,
	MarkFinished: MarkFinished,
	UpdateSize: UpdateSize,
	SetVideoOption: SetVideoOption,
	getItemCount: getItemCount,
	GetById: GetById,
	GetItems: GetItems,
	GetUnfinishedItems: GetUnfinishedItems,
	getrows: getrows,
	FileInStore: FileInStore,
	SetFinishedSize: SetFinishedSize,
	MarkWaitTillNext: MarkWaitTillNext,
	ClearAllWaitTillNext: ClearAllWaitTillNext,
	UpdateOriginalSizeIf: UpdateOriginalSizeIf,
	GetItemsByIds: GetItemsByIds,
	CheckExistsFileByNames: CheckExistsFileByNames,
	addqueueitems: addqueueitems,
	deleteQueue: deleteQueue,
	getNewItems: getNewItems,
	setWaitTillNextFromQueue: setWaitTillNextFromQueue,
	getNext100Waiting: getNext100Waiting,
	createNewStoreItemsFromQueue: createNewStoreItemsFromQueue,
	getCountWaiting: getCountWaiting,
	setMediaErrorFlag: setMediaErrorFlag,
	setOnlineStatusFromQueue: setOnlineStatusFromQueue,
	UpdateMissingLocalByNames: UpdateMissingLocalByNames,
	UpdateMissingDownloadsByNames: UpdateMissingDownloadsByNames,
	resolveMissingLocalSizeandDownload: resolveMissingLocalSizeandDownload,
	IncrementSizeFailure: IncrementSizeFailure,
	ClearSizeFailureCount: ClearSizeFailureCount,
	getMissingSizeCount: getMissingSizeCount,
	getNext100WaitingSize: getNext100WaitingSize,
	updateProcessSize:updateProcessSize,
	getAllStoreFolders: getAllStoreFolders,
	setHash: setHash
};
