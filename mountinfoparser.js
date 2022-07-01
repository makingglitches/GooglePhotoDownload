// requires the user be part of group disk.
const { throws } = require('assert');
const { retryable } = require('async');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const { startsWith, replace, kebabCase } = require('lodash');
const lodash = require('lodash');
const path = require('path');
const { dirname } = require('path');

/***
 * Class that contains information about a single mounted filesystem.
 * Also contains static methods for gathering information on mounted filesystems.
 */
class MountInfo
{

    /**
     * Static property initialized with a list of current mounts on call to ParseMounts()
     */
    static Mounts = []

    /**
     * Populates the Mounts static array of MountInfo
     */
    static ParseMounts()
    {
        MountInfo.Mounts = FSMounts();
       
        var retval = execSync("lsblk -fJ").toString();
        var j = JSON.parse(retval);

        var parts = []

        // flatten the list to the partition devices
        while (j.blockdevices.length > 0)
        {
            var bdev = j.blockdevices.pop();

            if (bdev.children)
            {
              parts = parts.concat(bdev.children) ; 

            }
            else
            {
                parts.push(bdev);
            }

        }
        
        // pull the information out of the output.
        while (parts.length > 0)
        {
            var bdev =parts.pop();

            for (var i in MountInfo.Mounts)
            {
                var mt = MountInfo.Mounts[i];
                
                // check ALL of them because of subvolumes
                // in types like btrfs
                if (mt.Device.replaceAll('/dev/','') == bdev.name)
                {
                    mt.LABEL = bdev.label;
                    mt.UUID = bdev.uuid;
                    //mt.MountPoints = bdev.mountpoints;
                } 
            }

        }
    }

    static ByUUID(UUID,subvol=null)
    {
        for (var i in MountInfo.Mounts)
        {
            if (MountInfo.Mounts[i].UUID == UUID)
            {
                // just return the first one if no subvolume indicated
                if (!subvol)
                {
                    return MountInfo.Mounts[i];
                }
                else
                {
                    if (subvol == MountInfo.Mounts[i].SUBVOLUMEID)
                    {
                        return MountInfo.Mounts[i];
                    }
                }
            }
        }

        return null;
    }

    static ExpandPath(UUID,subpath,volid=null)
    {
        // this will likely only be used to find existing files.
        var m = this.ByUUID(UUID,volid);

        if (m==null)
        {
            return null;
        }

        return path.join(m.MountPoint,subpath);
        
    }

    /**
     * Once Mounts is populated, returns the MountInfo object representing where the file is located under
     * @param {*} file the file to find the mountpoint for
     * @returns an array with the MountInfo object the supplied file is under as first item and the relative path as the second
     */
    static WhichDevice(file)
    {   
        if (!fs.existsSync(file))
        {
            throw `File: ${file} not found!`
        }

        var pathname = dirname(path.resolve(file));

        // basically keeps testing the string until the currently mounted filesystems 
        // are all tested and the one with the longest path is where the file will be under
        // then return the object.
        var plen = 0
        var themnt = null

        for (var i in MountInfo.Mounts)
        {
            var m = MountInfo.Mounts[i];
         
            if (startsWith(pathname,  m.MountPoint))
            {
                if (plen < m.MountPoint.length)
                {
                    plen = m.MountPoint.length;
                    themnt = m;
                }
            }
        }
        
        return [themnt, themnt!=null ? path.relative(themnt.MountPoint,pathname):null]
    }

    constructor(entry)
    { 
        /**
         * The device name that would be supplied in the mount command
         */
        this.Device = entry[0];
        /**
         * The point to which this filesystem is mounted
         */
        this.MountPoint = entry[1];
        /**
         * Filesystem type.
         */
        this.FSType = entry[2];
        /**
         * Mount options string
         */
        this.Options =  entry[3] ?   entry[3].split(",") : [];
        this.Options = this.Options.map( function (v)
        {
            var b = {};

            if (v.indexOf("=") == -1 )
            {
                b.Key = v.trim();
                b.Value = null;
                return b;
            }
            else
            {
                var vals = v.split("=");
                b.Key = vals[0].trim();
                b.Value = vals[1].trim();
                return b;
            }
        });
        
        /**
         * Dump option setting.
         */
        this.DumpOption = entry[4];
        /**
         * Order, if any, in which this filesystem would be mounted
         */
        this.MountOrder= entry[5];
        /**
         * If a mounted block or loop device, the unique identifer of the partition
         */
        this.UUID ="";
        /**
         * If available, the volume label.
         */
        this.LABEL="";

        this.SUBVOLUMEID = -1;
        this.SUBVOLUME = "";

        for (var i in this.Options)
        {
            var op = this.Options[i];
            if (op.Key== "subvol")
            {
                this.SUBVOLUME = op.Value;
            }
            else if (op.Key == "subvolid")
            {
                this.SUBVOLUMEID = 1 * op.Value;
            }
        }


    }
}
/**
 * Reads current mountpoints, initializes and returns an array of MountInfo objects
 */
function FSMounts() {
	var f = fs.readFileSync('/proc/self/mounts').toString();

	var p = f.split('\n');

	// so what if there is a goddamn space in the mountpoint name ?
	var mounts = [];

	for (var i in p) {
		var toentry = [];

		var entry = p[i].split(' ');

		for (var r in entry) {
            // replace space characters.
			toentry.push(entry[r].replaceAll('\\040', ' '));
		}

        var mp = new MountInfo(toentry)
		mounts.push(mp);
	}

    return mounts;
}

module.exports = {
    MountInfo: MountInfo
}
