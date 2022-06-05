
// var acc = {
//     userid: config.userid,
//     username: config.username,
//     emailid: config.emailid,
//     title: 'Google User',
//     localdirectory: config.defaultlocaldir,
//     onserverdirectory: config.defaultpulldir+'/'+ config.username+ '/'+config.defaultonserverdir,
//     destdir: config.defaultpulldir + '/'+config.username
// };

const { retry, findSeries } = require("async");
const getrows = require("./getRows");
const fs = require('fs');
const mountPoint = require("mount-point");


class GoogleAccount  
{
    static DirectoryType = { Download:1, Original:2, OnServer:3}

    static  FromRow(row)
    {
        return new GoogleAccount(
            row.UserId,
            row.Name,
            row.EmailId,
            'Google Account');
    }

    static async CheckExistsDb(db,userid)
    {
            // yeah yeah double index scan, the table won't ever have many rows blah blah
            // on a big table this would be awful, this table will likely have less than 20 rows
            var sql = `select 1 as res where exists (select 1 from Accounts where UserId = ? )
            union 
            select 0 as res where not exists (select 1 from Accounts where UserId = ? )`

            var res = await getrows(db,sql,[userid, userid])
            
            var ya = res.rows[0]['res']

            return ya == '1' ? true: false;
        
    }

    static async GetAll(db)
    {

        var accounts = [];

        var res = await getrows(db,'select * from Accounts')

        if (res.success)
        {
            for (var i in res.rows)
            {
                accounts.push(GoogleAccount.FromRow(res.rows[i]));      
                await accounts[accounts.length -1].GetDirectories(db);  
            }
        }

        return accounts;

    }

    constructor(_userid=null, 
                _username=null, 
                _emailid=null, 
                _title=null)
    {
        this.userid =  _userid;
        this.username=_username;
        this.emailid=_emailid;
        this.title =  'Google User';
        this.directories = []



        // returns the FIRST download directory in the list.
        this.localdir = function()
        {
            for (var i in this.directories)
            {
                if (this.directories[i].TrustedStore && this.directories[i].Main)
                {
                    return this.directories[i];
                }
            }

            return null;

        }

        // returns the FIRST server only directory in the list
        this.onserverdirectory = function()
        {
            for (var i in this.directories)
            {
                if (this.directories[i].ServerOnlyOrganizer && this.directories[i].Main)
                {
                    return this.directories[i];
                }
            }

            return null;
        }


        //TODO: THERE NEEEDS TO BE A METHOD TO GRAB AN ORIGINALS AND SERVERONLY DIRECTORY 
        // THAT HAVE THE SAME MOUNT POINT
        // OR THERE NEEDS TO BE A WAY TO INDICATE THAT CROSS DEVICE MOVES ARE OK
        // EVEN IF THEY ARE EXTREMELY INEFFICIENT AND SLOW.
        // this behavior was originally here so the user could decide whether originals 
        // which had already been backed up should be deleted by giving them the leisure to look
        // them over.
        // the main idea was also to determine the efficiency of the google transcoding engine 
        // for informative purposes by tracking the differences in file sizes
        // apple and android phones both are HORRIBLE when it comes to file size bloat.

        this.originalsdirectory = function()
        {
            var ret = [];

            for (var i in this.directories)
            {
                if (this.directories[i].OriginalStore)
                {
                    ret.push(this.directories[i]);
                }
            }

            return ret;

        }

        this.UserExistsInDb = async function(db)
        {
            // yeah yeah double index scan, the table won't ever have many rows blah blah
            // on a big table this would be awful, this table will likely have less than 20 rows
            var sql = `select 1 as res where exists (select 1 from Accounts where UserId = ? )
            union 
            select 0 as res where not exists (select 1 from Accounts where UserId = ? )`

            var res = await getrows(db,sql,[this.userid, this.userid])
            
            var ya = res.rows[0]['res']

            return ya == '1' ? true: false;
        }

        this.UpdateInDb =  async function(db)
        {
           var res = await getrows(db ,` UPDATE Accounts
                    SET Name = ?,
                    EmailId = ?,
                    WHERE
                    UserId = ?`,
                    [
                        this.username,
                        this.emailid,
                        this.userid]);

            return res.success;
        }

        this.GetDirectories = async function (db)
        {
            var sql = 'select * from ImageDirectories where UserId=? or not UserSpecific and Active'

            var res = await getrows(db, sql, [this.userid]);

            var startdirs =  res.success ? res.rows: [];
            
            this.directories = [];
            
            for (var i in startdirs)
            {
                // sometimes a directory is a mount point in linux.
                if (fs.existsSync(startdirs[i].Directory))
                {
                    this.directories.push(startdirs[i])
                }
            }

            return res.rows;
        }

        this.AddDirectory = async function (db, dirname, title, directorytype, main=false  )
        {
            var sql = 
            `insert or ignore into  ImageDirectories(Directory, Name, 
                Active, TrustedStore, OriginalStore,  
                ServerOnlyOrganizer, UserSpecific, UserId, Main,MountPoint)
            values ( ?, ? , ? , ? , ? , ?, ?, ?, ?, ? )`

            var mp = await mountPoint(dirname);

            var res = await getrows(db,
                     sql,
                     [
                        dirname, 
                        title, 
                        true, 
                        directorytype == GoogleAccount.DirectoryType.Download,
                        directorytype == GoogleAccount.DirectoryType.Original,
                        directorytype == GoogleAccount.DirectoryType.OnServer,
                        true,
                        this.userid,
                        main,
                        mp            
                    ] );


            this.GetDirectories(db);

            return res.success;
        }

        this.InsertInDb = async function(db)
        {

            if (await this.UserExistsInDb(db))
            return false;

            var res = await getrows(db , `INSERT INTO Accounts (
                Name,
                EmailId,
                UserId
           )
            VALUES (
                ?,
                ?,
                ?
            )`,
            [
                this.username,
                this.emailid,
                this.userid
            ]);

            return res.success;

        }
    }

}

module.exports = GoogleAccount;