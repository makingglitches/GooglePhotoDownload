#!/bin/bash

# get first loop device
first=$(losetup -f)

# create disk file
dd if=/dev/zero of=test.img bs=1M count=150

chmod 777 test.img

parted --script test.img mklabel gpt 

parted --script test.img mkpart "test1" ext4 0 5M 
parted --script test.img mkpart "test2" ext4 5M 10M 
parted --script test.img mkpart "test3" ext4 10M 15M 
parted --script test.img mkpart "test4" btrfs 15M 150M

losetup -P  $first test.img 

parted --script $first print 

# generate the partition uuid's
firstguid=$(uuidgen)
secondguid=$(uuidgen)
thirdguid=$(uuidgen)
fourthguid=$(uuidgen)


#create file systems 
mkfs -t ext4 ${first}p1 
mkfs -t ext4 ${first}p2 
mkfs -t ext4 ${first}p3 
mkfs.btrfs -L testbtrfs  ${first}p4

#assign the partition uuid's
tune2fs -f ${first}p1 -U ${firstguid} 
tune2fs -f ${first}p2 -U ${secondguid} 
tune2fs -f ${first}p3 -U ${thirdguid} 
btrfstune -f ${first}p4 -U ${fourthguid}

# send this to terminal for test to parse.
# ugh this may not allow completely automated testing.
# elevated permissions and such
# if you trust nodejs with root, lemme know because i actually do not.
echo "${first},${firstguid},${secondguid},${thirdguid},${fourthguid}" >testcase.txt

chmod 777 testcase.txt

mkdir -p testmount

mount ${first}p1 testmount

mkdir -p testmount/test1
mount ${first}p2 testmount/test1

mkdir -p testmount/test1/test2
mount ${first}p3 testmount/test1/test2

mkdir -p testmount/test1/test2/vol1
mkdir -p testmount/test1/test2/vol2

mount ${first}p4 testmount/test1/test2/vol1

btrfs subvolume create testmount/test1/test2/vol1/t1
btrfs subvolume create testmount/test1/test2/vol1/t2

umount -l testmount/test1/test2/vol1

mount ${first}p4 -o subvol=t1 testmount/test1/test2/vol1
mount ${first}p4 -o subvol=t2 testmount/test1/test2/vol2


touch testmount/1.txt
touch testmount/test1/2.txt
touch testmount/test1/test2/3.txt
touch testmount/test1/test2/vol1/1.txt
touch testmount/test1/test2/vol2/2.txt

chmod 777 -R testmount

cp ../EmptyStoreDB.sqlite tests.sqlite
chmod 777 tests.sqlite

