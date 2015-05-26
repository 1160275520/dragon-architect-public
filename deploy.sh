#!/bin/bash

host=awb@gigantor.cs.washington.edu
webroot=/srv/www/dragonarchitect

ssh $host rm -rf $webroot/dist
ssh $host rm -rf $webroot/latest
scp -r dist $host:$webroot/
ssh $host mv $webroot/dist $webroot/latest
