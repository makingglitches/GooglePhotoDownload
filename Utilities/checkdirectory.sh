#!/bin/bash
#ls -1 /mnt/Seagate1TB/Photos\ and\ Videos/partyinthecia2/*.mp4 \
#| xargs -I{} python checkintegrity.py {}

ls -1 "$1" | grep -i .mp4 \
| xargs -I{} python checkintegrity.py {}
