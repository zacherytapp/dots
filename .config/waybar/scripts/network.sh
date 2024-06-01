#!/usr/bin/bash

stat=`vnstat -i wlp3s0 -tr 2 --json`
tx=`echo "$stat" | jq .tx.ratestring | sed 's/"//g ; s/bit/b/g'`
rx=`echo "$stat" | jq .rx.ratestring | sed 's/"//g ; s/bit/b/g'`

echo "{\"text\": \" $tx   $rx\", \"alt\": \"bc\"}"
