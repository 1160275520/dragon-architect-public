#!/bin/bash

host=awb@wannacut.cs.washington.edu
webroot=/srv/www/hackcraft

ssh $host rm -rf $webroot/build
ssh $host rm -rf $webroot/latest
scp -r build $host:$webroot/
ssh $host mv $webroot/build $webroot/latest