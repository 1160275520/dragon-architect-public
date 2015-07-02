#!/bin/bash

host=awb@gigantor.cs.washington.edu
webroot=/srv/www/dragonarchitect

ssh $host rm -rf $webroot/dist
ssh $host rm -rf $webroot/$1
scp -r dist $host:$webroot/
ssh $host mv $webroot/dist $webroot/$1
ssh $host chmod -R g+w $webroot/$1
