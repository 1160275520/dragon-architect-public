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
Blockly.UnityCode = {};

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

Blockly.UnityCode['call'] = {}

// LEFT
Blockly.Blocks['Left'] = {
    init: function() {
        this.setColour(160);
        this.appendDummyInput()
            .appendField("turn left")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['Left'] = function(block) {
    return {"args":[],"meta":{"id":Number(block.id)},"proc":"Left","type":"call"};
};

// RIGHT
Blockly.Blocks['Right'] = {
    init: function() {
        this.setColour(160);
        this.appendDummyInput()
            .appendField("turn right")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['Right'] = function(block) {
    return {"args":[],"meta":{"id":Number(block.id)},"proc":"Right","type":"call"};
};

// FORWARD
Blockly.Blocks['Forward'] = {
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

Blockly.UnityJSON['Forward'] = function(block) {
    return {"args":[block.getFieldValue("VALUE")],"meta":{"id":Number(block.id)},"proc":"Forward","type":"call"};
};

// UP
Blockly.Blocks['Up'] = {
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

Blockly.UnityJSON['Up'] = function(block) {
    return {"args":[block.getFieldValue("VALUE")],"meta":{"id":Number(block.id)},"proc":"Up","type":"call"};
};

// DOWN
Blockly.Blocks['Down'] = {
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

Blockly.UnityJSON['Down'] = function(block) {
    return {"args":[block.getFieldValue("VALUE")],"meta":{"id":Number(block.id)},"proc":"Down","type":"call"};
};

// PLACEBLOCK
Blockly.Blocks['PlaceBlock'] = {
  // Block for moving placeblock.
    init: function() {
        this.setColour(35);
        this.appendDummyInput()
            .appendField("place block")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['PlaceBlock'] = function(block) {
    return {"args":[],"meta":{"id":Number(block.id)},"proc":"PlaceBlock","type":"call"};
};

// FORWARD
Blockly.Blocks['Line'] = {
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

Blockly.UnityJSON['Line'] = function(block) {
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

Blockly.UnityJSON.XMLOfJSON = function(program) {
    var xml = '<xml>';
    var funcCount = 0;
    for (var func in program) {
        var body = program[func]['body'];
        if (body.length > 0 || func === "MAIN") {
            xml += '<block type="procedures_defnoreturn" x="' + (70 + 200*(funcCount++)) + '" y="70"><field name="NAME">' + func + '</field><statement name="STACK">' + Blockly.UnityJSON.stmtToXML(body[0], program);
            for (var i = 1; i < body.length; i++) {
                var stmt = body[i];
                xml += '<next>' + Blockly.UnityJSON.stmtToXML(stmt, program);
            }
            if (body.length > 0) { xml += '</block>'; }
            for (var i = 0; i < body.length - 1; i++) { // don't need a </next> for the first statement in the block
                xml += '</next></block>';
            }
            xml += '</statement></block>';
        }
        
    }
    return xml + "</xml>";
}

Blockly.UnityJSON.stmtToXML = function (stmt, program) {
    if (stmt) {
        if (stmt['type'] === "call") {
            if (stmt['args'].length === 0) {
                if (stmt['proc'] in program) {
                    return '<block type="procedures_callnoreturn"><mutation name="' + stmt['proc'] + '"></mutation>';
                } else {
                    return '<block type="' + stmt['proc'] + '">';
                }
            } else {
                return '<block type="' + stmt['proc'] + '"><field name="VALUE">' + stmt['args'][0] + '</field>';
            }
        } else if (stmt['type'] === "repeat") {
            return '<block type="controls_repeat"><field name="TIMES">' + stmt['numtimes'] + '</field><statement name="DO">' + Blockly.UnityJSON.stmtToXML(stmt['stmt'], program) + '</statement>';
        } else if (stmt['type'] === "block") {
            var body = stmt['body'];
            if (body.length > 0) {
                var xml = Blockly.UnityJSON.stmtToXML(body[0], program);
                for (var i = 1; i < body.length; i++) {
                    var stmt = body[i];
                    xml += '<next>' + Blockly.UnityJSON.stmtToXML(stmt, program);
                }
                xml += '</block>';
                for (var i = 0; i < body.length - 1; i++) { // don't need a </next> for the first statement in the block
                    xml += '</next></block>';
                }
            }
            return xml;
        }
    }
    return "";
}

