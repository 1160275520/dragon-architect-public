#!/bin/bash

TARGET=games.cs.washington.edu:/var/www/hackcraft;

FILES=(hackcraft style.css index.html blocks.js blocks_compressed.js common.js blockly_compressed.js javascript_compressed.js soyutils.js app.js hackcraft.js generated media);

for file in ${FILES[*]}; do
    echo scp -r $file $TARGET
    scp -r $file $TARGET
done