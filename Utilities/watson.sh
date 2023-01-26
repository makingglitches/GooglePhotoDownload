#!/bin/bash

source sensitivedata/watson_key.sh

curl -X POST -u "apikey:$KEY" \
--header "Content-Type: audio/mp3" \
--data-binary @"$1" \
"$URL"