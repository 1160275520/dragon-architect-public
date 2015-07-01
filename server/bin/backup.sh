#! /bin/bash

# backup the game and logging databases to $BASE_DIR
# this must be run by a postgres superuser (problably postgres)
# assumes $BASE_DIR exists and is rwx by user

DUMPALL="/usr/bin/pg_dumpall"
PGDUMP="/usr/bin/pg_dump"
PSQL="/usr/bin/psql"
DBS=ruthefjord logging

BASE_DIR="/var/backups/postgres"
YMD=$(date "+%Y-%m-%d")
DIR="$BASE_DIR/$YMD"
mkdir -p $DIR
cd $DIR

# first dump entire postgres database
$DUMPALL | gzip -9 > "$DIR/db.sql.gz"
# then dump the database we care about
for DB in $DBS
do
    $PGDUMP $DB | gzip -9 > "$DIR/${DB}.sql.gz"
done

# delete backup files older than 90 days
OLD=$(find $BASE_DIR -type d -mtime +90)
if [ -n "$OLD" ] ; then
    echo $OLD | xargs rm -rfv
fi

