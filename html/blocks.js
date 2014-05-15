/**
 * Blockly Apps: Turtle Graphics Blocks
 *
 * Copyright 2012 Google Inc.
 * https://blockly.googlecode.com/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Blocks for Blockly's Turtle Graphics application.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

// Extensions to Blockly's language and JavaScript generator.

Blockly.UnityJSON = {};

Blockly.UnityJSON.idCounter_ = 0;

Blockly.UnityJSON.nextId = function () {
    Blockly.UnityJSON.idCounter_ += 1;
    return Blockly.UnityJSON.idCounter_;
}

Blockly.UnityJSON.processBody = function (block) {
    var bodyBlock = block.inputList[1]; // the first element is the procedure name or number of repeats
    var body = [];
    // check if there's anything in the body
    if (bodyBlock.connection && bodyBlock.connection.targetBlock()) {
        var stmt = bodyBlock.connection.targetBlock();
        // process stmt
        body.push(Blockly.UnityJSON[stmt.type].call(stmt, stmt));
        // iterate over top-level blocks inside body
        while(stmt.nextConnection && stmt.nextConnection.targetBlock()) {
            // dispatch appropriately for each type of block
            stmt = stmt.nextConnection.targetBlock();
            body.push(Blockly.UnityJSON[stmt.type].call(stmt, stmt));
        }
    }
    return body;
}

// LEFT
Blockly.Blocks['left'] = {
    init: function() {
        this.setColour(160);
        this.appendDummyInput()
            .appendField("turn left")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['left'] = function(block) {
    return {"args":[],"meta":{"id":Number(block.id)},"proc":"Left","type":"call"};
};

// RIGHT
Blockly.Blocks['right'] = {
    init: function() {
        this.setColour(160);
        this.appendDummyInput()
            .appendField("turn right")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['right'] = function(block) {
    return {"args":[],"meta":{"id":Number(block.id)},"proc":"Right","type":"call"};
};

// FORWARD
Blockly.Blocks['forward'] = {
    init: function() {
        this.setColour(160);
        this.appendDummyInput()
            .appendField("move forward by")
            .appendField(new Blockly.FieldTextInput('1',
                Blockly.FieldTextInput.nonnegativeIntegerValidator), "VALUE");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['forward'] = function(block) {
    return {"args":[block.getFieldValue("VALUE")],"meta":{"id":Number(block.id)},"proc":"Forward","type":"call"};
};

// UP
Blockly.Blocks['up'] = {
    init: function() {
        this.setColour(220);
        this.appendDummyInput()
            .appendField("move up by")
            .appendField(new Blockly.FieldTextInput('1',
                Blockly.FieldTextInput.nonnegativeIntegerValidator), "VALUE");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['up'] = function(block) {
    return {"args":[block.getFieldValue("VALUE")],"meta":{"id":Number(block.id)},"proc":"Up","type":"call"};
};

// DOWN
Blockly.Blocks['down'] = {
    init: function() {
        this.setColour(220);
        this.appendDummyInput()
            .appendField("move down by")
            .appendField(new Blockly.FieldTextInput('1',
                Blockly.FieldTextInput.nonnegativeIntegerValidator), "VALUE");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['down'] = function(block) {
    return {"args":[block.getFieldValue("VALUE")],"meta":{"id":Number(block.id)},"proc":"Down","type":"call"};
};

// PLACEBLOCK
Blockly.Blocks['placeblock'] = {
  // Block for moving placeblock.
    init: function() {
        this.setColour(35);
        this.appendDummyInput()
            .appendField("place block")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['placeblock'] = function(block) {
    return {"args":[],"meta":{"id":Number(block.id)},"proc":"PlaceBlock","type":"call"};
};

// FORWARD
Blockly.Blocks['line'] = {
    init: function() {
        this.setColour(35);
        this.appendDummyInput()
            .appendField("place")
            .appendField(new Blockly.FieldTextInput('1',
                Blockly.FieldTextInput.nonnegativeIntegerValidator), "VALUE")
            .appendField("in a line");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['line'] = function(block) {
    return {"args":[block.getFieldValue("VALUE")],"meta":{"id":Number(block.id)},"proc":"Line","type":"call"};
};

// REPEAT
Blockly.UnityJSON['controls_repeat'] = function(block) {
    return {"numtimes":{"type":"literal", "value":block.getFieldValue("TIMES")},"meta":{"id":Number(block.id)},
            "stmt":{"meta":{"id":Blockly.UnityJSON.nextId()}, "body":Blockly.UnityJSON.processBody(block), "type":"block"},"type":"repeat"};
}

// CALL
Blockly.UnityJSON['procedures_callnoreturn'] = function(block) {
    return {"args":[],"meta":{"id":Number(block.id)},"proc":block.getFieldValue("NAME"),"type":"call"};
}