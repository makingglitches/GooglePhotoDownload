const { findSeries } = require("async");
const getrows = require("./getRows");
const queryResult = require("./queryresult");
const fs = require('fs')
const MountInfo = require('../mountinfoparser').MountInfo;

var db = null;

function InitDB(_db) {
	db = _db;
}


const EStoreType = 
{
    Trusted : 1,
    ServerOnly: 2, 
    Originals: 3,
    FromStoreType: function(storetype,itemlocation)
    {

        itemlocation.TrustedStore = EStoreType.Trusted == storetype;
        itemlocation.ServerOnlyOrganizer = EStoreType.ServerOnly == storetype;
        itemlocation.OriginalStore = EStoreType.Originals == storetype

        return itemlocation;
    },
    ToStoreType: function (i)
    {
        if (i.TrustedStore)
        {
            return this.Trusted;
        }
        else if (i.ServerOnlyOrganizer)
        {
            return this.ServerOnly;
        }
        else if (i.OriginalStore)
        {
            return this.Originals;
        }
    }
}

class ImageLocation
{
    /**
     *  Creates a new ImageLocation object from an absolute path
     * @param {*} directory absolute path to the directory
     * @param {*} storetype see EStoreType
     * @param {*} main T/F is this the main store.
     * @param {*} userid  UserId, leave null if not user specific.
     * @returns 
     */
    static CreateNew(directory, storetype, main=false, userid=null)
    {
        if (!fs.existsSync(directory))
        {
            throw "Directory must exist at time of creation !\nEven if on a mounted device later umounted!\n"+directory;
        }

        MountInfo.ParseMounts();
        
        // get the MountInfo and relative path.
        var info = MountInfo.WhichDevice(directory);

        // autopopulate this, subtracts mountpoint


        return new ImageLocation( info[0].UUID, 
                                  info[0].SUBVOLUMEID,
                                  info[1],
                                  storetype,
                                  main,
                                  userid);
            
    }


    static async GetAll(ActiveOnly=false)
    {
        var sql = fs.readFileSync('storemgr/imagedirectories_select.sql').toString();

        if (ActiveOnly)
        {
            sql+= ' where Active=1';
        }

        var res = await getrows(db,sql,[]);
        
        var ret = [];

        if (res.success)
        {
            for (var i in res.rows)
            {
                var row = res.rows[i];
                ret.push(
                    new ImageLocation(  row.MounPointUUID, 
                                        row.SubVolumeId,
                                        row.SubVolumePath,
                                        row.Directory,
                                        EStoreType.ToStoreType(row),
                                        row.Main,
                                        row.UserId
                                        ));
            }
        }
        else
        {
            throw "Sql error "+res.err;
        }

        return ret;
    }

    /**
     * Best not to call this directly, instead use GetAll() or GetActive() or CreateNew()
     * @param {*} uuid 
     * @param {*} subvolumeid 
     * @param {*} subvolumepath
     * @param {*} path 
     * @param {*} storetype 
     * @param {*} main 
     * @param {*} userid 
     */
    constructor(uuid, subvolumeid, subvolumepath, path, storetype,  main=false, userid=null)
    {
        
        this.UUID = uuid;
        this.SubVolumeId = subvolumeid;
        this.SubVolumePath = subvolumepath;
        this.Path = path;
        // initialize mountinfo.
        this.Active = true;
        this.StoreType = storetype;
        this.UserId = userid;
        this.Main = main;

        this.Equals = function(other)
        {
            return (this.MounPointUUID == other.MounPointUUID &&
                this.SubVolumeId == other.SubVolumeId &&
                this.SubVolumePath == other.SubVolumePath &&
                this.Active == other.Active && 
                this.Path == other.Path );
        }

        this.Write = async function()
        {
            var sql = fs.readFileSync('storemgr/imagedirectory_insert.sql').toString();

            var res = await getrows(db,sql,
                [
                    'Directory',
                    this.UUID,
                    this.SubVolumeId,
                    this.SubVolumePath,
                    this.Path,
                    this.Active,
                    this.StoreType == EStoreType.Trusted,
                    this.StoreType == EStoreType.Originals,
                    this.StoreType == EStoreType.ServerOnly,
                    this.UserId != null,
                    this.UserId,
                    this.Main
                ]);

              return res;
        }
    }
}

module.exports = 
{
    EStoreType:EStoreType,
    ImageLocation:ImageLocation,
    InitDB:InitDB
}