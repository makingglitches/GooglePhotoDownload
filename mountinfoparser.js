const fs = require('fs');


class MountInfo
{
    constructor(entry)
    {
        this.Device = entry[0];
        this.MountPoint = entry[1];
        this.FSType = entry[2];
        this.Options = entry[3];
        this.DumpOption = entry[4];
        this.MountOrder= entry[5];

        this.ContainsPath = function(pathitem)
        {
            // ok john you're half asleep
            // but this should be simple no matter how goddamn old you are
            // and you are.
            // damn it.

            // ugh i did this already !

            // /mounty1/dir
            // /mounty1/dir/mounty2
            // /mounty1/dir/mounty2/dir2/mounty3
            //  sort these out if you end up with a file /mounty1/dir/mounty2/dir/mounty3/afile
            // obcviously its under the third one.

            if (fs.existsSync(pathitem))
            {
                if (pathitem.startsWith(this.MountPoint))
                {
                    return true;
                }                
            }
            else
            {
                return false;
            }
        }

        this.OnDevice = function(item)
        {

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
			toentry.push(entry[r].replaceAll('\\040', ' '));
		}

        var mp = new MountInfo(toentry)
		mounts.push(mp);

        for (var m in mounts)
        {
            if (mounts[m] != mp )
            {
                mp.ContainsPath(mounts[m].MountPoint);
            }
        }
	}

    return mounts;
}

module.exports = {
    GetMounts: FSMounts,
    MountInfo: MountInfo
}
