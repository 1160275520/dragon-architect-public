function RuthefjordBlocklyCustomInit() {
'use strict';

// Extensions to Blockly's language and JavaScript generator.

Blockly.UnityJSON = {};

Blockly.UnityJSON.idCounter_ = 0;

Blockly.UnityJSON.nextId = function () {
    Blockly.UnityJSON.idCounter_ += 1;
    return Blockly.UnityJSON.idCounter_;
};

Blockly.UnityJSON.convertCallback = function (obj) {
    return Blockly.UnityJSON[obj.block.type](obj.block, obj.children); 
};

/**
 * processes the body of block and returns an array of json-ready objects
 */
Blockly.UnityJSON.processStructure = function (block) {
    var structure = block.getStructure();
    // if procedure, we only process its children
    if (block.type === "procedures_defnoreturn") {
        // procedures have no connection, so no siblings exist and we can assume the object we want is the first and only element
        return structure[0].children.map(Blockly.UnityJSON.convertCallback);
    }
    return structure.map(Blockly.UnityJSON.convertCallback);
};

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

function newCall0(name, id) {
    return {args:[],meta:{id:Number(id)},ident:name,type:"call"};
}

function newCall1(name, id, arg0) {
    return {args:[{type:"literal", value:arg0}],meta:{id:Number(id)},ident:name,type:"call"};
}

Blockly.UnityJSON['Left'] = function(block) {
    return newCall0("Left", block.id);
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
    return newCall0("Right", block.id);
};

// FORWARD
Blockly.Blocks['Forward'] = {
    init: function() {
        this.setColour(160);
        this.appendDummyInput()
            .appendField("forward by")
            .appendField(new Blockly.FieldTextInput('1',
                Blockly.FieldTextInput.nonnegativeIntegerValidator), "VALUE");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['Forward'] = function(block) {
    return newCall1("Forward", block.id, block.getFieldValue("VALUE"));
};

// UP
Blockly.Blocks['Up'] = {
    init: function() {
        this.setColour(220);
        this.appendDummyInput()
            .appendField("up by")
            .appendField(new Blockly.FieldTextInput('1',
                Blockly.FieldTextInput.nonnegativeIntegerValidator), "VALUE");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['Up'] = function(block) {
    return newCall1("Up", block.id, block.getFieldValue("VALUE"));
};

// DOWN
Blockly.Blocks['Down'] = {
    init: function() {
        this.setColour(220);
        this.appendDummyInput()
            .appendField("down by")
            .appendField(new Blockly.FieldTextInput('1',
                Blockly.FieldTextInput.nonnegativeIntegerValidator), "VALUE");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['Down'] = function(block) {
    return newCall1("Down", block.id, block.getFieldValue("VALUE"));
};

// PLACEBLOCK
Blockly.Blocks['PlaceBlock'] = {
    init: function() {
        this.setColour(35);
        this.appendDummyInput()
            .appendField("place block")
            .appendField(new Blockly.FieldColour('#1ca84f'), 'VALUE');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['PlaceBlock'] = function(block) {
    return newCall1("PlaceBlock", block.id, block.getFieldValue("VALUE"));
};

// REMOVEBLOCK
Blockly.Blocks['RemoveBlock'] = {
    init: function() {
        this.setColour(35);
        this.appendDummyInput()
            .appendField("remove block")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['RemoveBlock'] = function(block) {
    return newCall0("RemoveBlock", block.id);
};

// REPEAT
Blockly.UnityJSON['controls_repeat'] = function(block, children) {
    return {
        meta: {id:Number(block.id)},
        numtimes: {type:"literal", value:block.getFieldValue("TIMES")},
        body: children.map(Blockly.UnityJSON.convertCallback),
        type: "repeat"
    };
}

// CALL
Blockly.UnityJSON['procedures_callnoreturn'] = function(block) {
    return {args:[],meta:{id:Number(block.id)},ident:block.getFieldValue("NAME"),type:"call"};
}

Blockly.UnityJSON.XMLOfJSON = function(program) {
    var funcCount = 0;
    var xml = '<xml>';
    var main = Blockly.UnityJSON.bodyToXML(program.body, program);
    var pos = ' x="' + (50 + 200*(funcCount % 2)) + '" y="' + (150 + 250*Math.floor(funcCount/2)) + '"';
    var insertIndex = main.indexOf(">", main.indexOf("block"));
    main = main.substring(0, insertIndex) + pos + main.substring(insertIndex);
    xml += main;
    console.info('converted json to xml');
    console.info(xml);
    return xml + "</xml>";
}

Blockly.UnityJSON.bodyToXML = function (body, program) {
    var xml = Blockly.UnityJSON.stmtToXML(body[0], program);
    for (var i = 1; i < body.length; i++) {
        var stmt = body[i];
        xml += '<next>' + Blockly.UnityJSON.stmtToXML(stmt, program);
    }
    if (body.length > 0) { xml += '</block>'; }
    for (var i = 0; i < body.length - 1; i++) { // don't need a </next> for the first statement in the block
        xml += '</next></block>';
    }
    return xml;
}

Blockly.UnityJSON.stmtToXML = function (stmt, program) {
    if (stmt) {
        if (stmt.type === "call") {
            if (stmt.args.length === 0) {
                /*
                if (stmt['proc'] in program.procedures) {
                    return '<block type="procedures_callnoreturn"><mutation name="' + stmt['proc'] + '"></mutation>';
                } else {
                    return '<block type="' + stmt['proc'] + '">';
                }
                */
                return '<block type="' + stmt.ident + '">';
            } else {
                return '<block type="' + stmt.ident + '"><field name="VALUE">' + stmt.args[0].value + '</field>';
            }
        } else if (stmt.type === "repeat") {
            return '<block type="controls_repeat"><field name="TIMES">' + stmt.numtimes.value + '</field><statement name="DO">' + Blockly.UnityJSON.bodyToXML(stmt.body, program) + '</statement>';
        }
    }
    return '';
}

}

