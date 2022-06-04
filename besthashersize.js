// start off by creating a file of a good size, say 200 mb with /dev/random as source
// eg dd if=/dev/random of=test.raw bs=1M count=200
// this seems familiar
// anyway the idea was to test what update size is fastest when not only reading from the disk but 
// also applying the bytes to a sha256 digest
// which actually should aeem kind of obvious since
// the digest generator will obviously just iterate through the goddamn byte array
// and the block size for read will mostly relate to the disk sector size.
// plus whatever unforeseen overhead node is generating.