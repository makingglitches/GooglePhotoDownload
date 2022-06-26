const { retryable } = require('async');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const { startsWith, replace } = require('lodash');
const lodash = require('lodash');
const { dirname } = require('path');

class MountInfo
{

    static Mounts = []

    static ParseMounts()
    {
        MountInfo.Mounts = FSMounts();
    }

    static WhichDevice(file)
    {
        var pathname = dirname(file)

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
        
        return themnt
    }

    constructor(entry)
    { 
        this.Device = entry[0];
        this.MountPoint = entry[1];
        this.FSType = entry[2];
        this.Options = entry[3];
        this.DumpOption = entry[4];
        this.MountOrder= entry[5];
        this.UUID ="";
        this.LABEL="";

        // have yet to see a linux installation that doesn't use the /dev directory
        // to contain block devices. all image files will also be here as loop devices.
        if (startsWith(this.Device,'/dev'))
        {
            var retval = execSync('blkid '+this.Device).toString().split(" ")

            for (var i in retval)
            {
                var s = retval[i].replaceAll("\"","").trim()

                if (s.indexOf("=") > -1 )
                {
                    var item = s.split("=")

                    if (item[0]=="LABEL")
                    {
                        this.LABEL = item[1]
                    }
                    else if (item[0]=="UUID")
                    {
                        this.UUID = item[1]
                    }
                }

            }
        }
    }
}

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
    GetMounts: FSMounts,
    MountInfo: MountInfo
}