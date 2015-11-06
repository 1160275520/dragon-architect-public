#!/bin/sh

HOST=webdeploy@dragonarchitect.net
WEBROOT=/srv/www/play/
KEYFILE=deploykey

ssh -i $KEYFILE $HOST "rm -rf $WEBROOT/$1"
rsync -avz -e "ssh -i $KEYFILE" dist $HOST:$WEBROOT
ssh -i $KEYFILE $HOST mv $WEBROOT/dist $WEBROOT/$1

