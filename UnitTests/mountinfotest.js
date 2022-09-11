const { MountInfo } = require("../mountinfoparser");
const {execSync} = require('child_process')
const lodash = require('lodash')
const fs = require('fs');
const path = require("path");
// run mkmountest.sh first 


function test(module, successmessage, errormessage, passed)
{
    if (passed)
    {
        console.log(module+": "+successmessage);
    }
    else
    {
        console.log(module+": "+errormessage);
        process.exit(1);
    }
}

console.log("THIS TEST REQUIRES THE USER TO RUN THE MKMOUNTEST.SH SCRIPT IN THIS DIRECTORY !");
console.log("===> ALL TESTS WILL FAIL IF THIS DOES NOT OCCUR <===");

var whereami = process.cwd();

var iraw = fs.readFileSync('UnitTests/testcase.txt').toString();
var info = iraw.trim().split(',');

var dev = info[0];
var p1uid = info[1];
var p2uid = info[2];
var p3uid = info[3];
var p4uid = info[4];
// test parse mounts
MountInfo.ParseMounts()
test("ParseMounts","More than 0 mountpoints found.", "No mountpoints found, impossible.",MountInfo.Mounts.length > 0);

// find by UUID
searchedmounts = [ 
    MountInfo.ByUUID(p1uid),
    MountInfo.ByUUID(p2uid), 
    MountInfo.ByUUID(p3uid), 
    MountInfo.ByUUID(p4uid)
    ];    

test("ByUUID","No Null Values in results","One or more UUID's were not found",searchedmounts.indexOf(null)==-1);

test("ByUUID","Matched P1", "Mismatch P1", searchedmounts[0].UUID == p1uid);
test("ByUUID","Matched P2", "Mismatch P2", searchedmounts[1].UUID == p2uid);
test("ByUUID","Matched P3", "Mismatch P3", searchedmounts[2].UUID == p3uid);
test("ByUUID","Matched P4", "Mismatch P4", searchedmounts[3].UUID == p4uid);

// with test files.
var f1 = MountInfo.WhichDevice('UnitTests/testmount/1.txt');
var f2 = MountInfo.WhichDevice('UnitTests/testmount/test1/2.txt');
var f3 = MountInfo.WhichDevice('UnitTests/testmount/test1/test2/3.txt');
var f4 = MountInfo.WhichDevice('UnitTests/testmount/test1/test2/vol1/1.txt');
var f5 = MountInfo.WhichDevice('UnitTests/testmount/test1/test2/vol2/2.txt');

// check that they match up against the correct mounted blockdevices
test("WhichDevice", 
    `Partition was ${f1[0].UUID} and correct`, 
    `Mismatch expected ${searchedmounts[0].UUID} got ${f1[0].UUID} `, 
    f1[0].UUID == searchedmounts[0].UUID);

test("WhichDevice", 
    `Partition was ${f2[0].UUID} and correct`, 
    `Mismatch expected ${searchedmounts[1].UUID} got ${f2[0].UUID} `, 
    f2[0].UUID == searchedmounts[1].UUID);

test("WhichDevice", 
    `Partition was ${f3[0].UUID} and correct`, 
    `Mismatch expected ${searchedmounts[2].UUID} got ${f3[0].UUID} `, 
    f3[0].UUID == searchedmounts[2].UUID);

test("WhichDevice", 
    `Partition was ${f4[0].UUID} and correct, subvolume t1`, 
    `Mismatch expected ${searchedmounts[3].UUID} got ${f4[0].UUID} `, 
    f4[0].UUID == searchedmounts[3].UUID && f4[0].SUBVOLUME=='/t1');

test("WhichDevice", 
    `Partition was ${f5[0].UUID} and correct, subvolume t2`, 
    `Mismatch expected ${searchedmounts[3].UUID} got ${f5[0].UUID} `, 
    f5[0].UUID == searchedmounts[3].UUID && f5[0].SUBVOLUME=='/t2');


// take the results and expand the device and subpath to the absolute system path.
var fp = [MountInfo.ExpandBTRFSPath(f1[0].UUID,f1[1],f1[0].SUBVOLUMEID),
          MountInfo.ExpandBTRFSPath(f2[0].UUID,f2[1],f2[0].SUBVOLUMEID),
          MountInfo.ExpandBTRFSPath(f3[0].UUID,f3[1],f3[0].SUBVOLUMEID),
          MountInfo.ExpandBTRFSPath(f4[0].UUID,f4[1],f4[0].SUBVOLUMEID),       
          MountInfo.ExpandBTRFSPath(f5[0].UUID,f5[1],f5[0].SUBVOLUMEID)];


var cp = [  MountInfo.ExpandPath( 'UnitTests/testmount'),
            MountInfo.ExpandPath('UnitTests/testmount/test1'),
            MountInfo.ExpandPath('UnitTests/testmount/test1/test2'),
            MountInfo.ExpandPath('UnitTests/testmount/test1/test2/vol1'),
            MountInfo.ExpandPath('UnitTests/testmount/test1/test2/vol2')];
            

for (var i in fp)
{
    test("ExpandPath", 
        `Path correct ${fp[i]}`, 
        `Path Mismatch expected ${cp[i]} got ${fp[i]}`,
        fp[i]==cp[i]);
}





