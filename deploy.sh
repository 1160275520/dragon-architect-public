#!/bin/bash

host=awb@wannacut.cs.washington.edu
webroot=/srv/www/hackcraft

ssh $host rm -rf $webroot/dist
ssh $host rm -rf $webroot/latest
scp -r dist $host:$webroot/
ssh $host mv $webroot/dist $webroot/latest
