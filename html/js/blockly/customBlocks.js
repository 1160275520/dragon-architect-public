function RuthefjordBlocklyCustomInit() {
'use strict';

// Extensions to Blockly's language and JavaScript generator.

var COLOR_MOVE_1 = '#0075A6';
var COLOR_MOVE_2 = '#B84B26';
var COLOR_BLOCK = '#978B63';
var COLOR_LOOPS = '#00711C';
var COLOR_PROCS = '#7C478B';
var COLOR_UNUSED_1 = '#B63551';
var COLOR_UNUSED_2 = '#A88217';

Blockly.Blocks.loops.COLOR = COLOR_LOOPS;
Blockly.Blocks.procedures.COLOR = COLOR_PROCS;

Blockly.UnityJSON = {};

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
        this.setFullColor(COLOR_MOVE_1);
        this.appendDummyInput()
            .appendField("turn left")
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

var old_rename_func = Blockly.Procedures.rename;

// monkey patch procedure renaming to change valid names, and also update library
Blockly.Procedures.rename = function(text) {
    if (this.sourceBlock_.isInFlyout) {
        // don't allow renaming of something in toolbox, this breaks everything...
        return this.sourceBlock_.getProcedureDef()[0];
    } else {
        // why is 'this' bound to an object for some arbitrary function? Who knows! But make sure to preserve it.
        var newName = old_rename_func.call(this, text);
        // blockly friggin explodes if the toolbox is updated while something is being dragged
        if (!Blockly.mainWorkspace.dragMode) {
            RuthefjordBlockly.updateToolbox();
        }
        return newName;
    }
};

Blockly.addCanvasListener("blocklyBlockDeleted", function() {
    console.log('delete event!');
    if (!Blockly.mainWorkspace.dragMode) {
        RuthefjordBlockly.updateToolbox();
    }
})

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
        this.setFullColor(COLOR_MOVE_1);
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
        this.setFullColor(COLOR_MOVE_1);
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
        this.setFullColor(COLOR_MOVE_2);
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
        this.setFullColor(COLOR_MOVE_2);
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
        this.setFullColor(COLOR_BLOCK);
        this.appendDummyInput()
            .appendField("place block")
            .appendField(new Blockly.FieldColour(Blockly.FieldColour.COLOURS[0]), 'VALUE');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['PlaceBlock'] = function(block) {
    return newCall1("PlaceBlock", block.id, Blockly.FieldColour.COLOURS.indexOf(block.getFieldValue("VALUE")) + 1);
};

// REMOVEBLOCK
Blockly.Blocks['RemoveBlock'] = {
    init: function() {
        this.setFullColor(COLOR_BLOCK);
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
    return {args:[],meta:{id:Number(block.id)},ident:'$' + block.getFieldValue("NAME"),type:"call"};
}

/// Transform a program from its serialized JSON representation to blockly XML representation.
Blockly.UnityJSON.XMLOfJSON = function(program) {
    var funcCount = 1;
    var xml = '<xml>';

    // pull out all top-level procedure definitions
    var groups = _.groupBy(program.body, function(stmt) {
        return stmt.type === 'proc' ? 'proc' : 'other';
    });

    // HACK NOTE: we don't deal with the prepended $ correctly yet but this sorta fixes itself when the program gets immediately sent to unity
    _.each(groups.proc, function(proc) {
        var x = 50 + 200*(funcCount % 2);
        var y = 150 + 250*Math.floor(funcCount/2);
        xml += '<block type="procedures_defnoreturn" x="' + x + '" y="' + y + '"><field name="NAME">' + proc.name + '</field><statement name="STACK">';
        xml += Blockly.UnityJSON.bodyToXML(proc.body, program);
        xml += '</statement></block>';
        funcCount += 1;
    });

    var main = Blockly.UnityJSON.bodyToXML(groups.other, program);
    var pos = ' x="50" y="150"';
    var insertIndex = main.indexOf(">", main.indexOf("block"));
    main = main.substring(0, insertIndex) + pos + main.substring(insertIndex);
    xml += main;

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

var BUILT_INS = ['Forward', 'Left', 'Right', 'PlaceBlock', 'RemoveBlock', 'Up', 'Down']

// HACK this totally doesn't handle defines correctly but works for other stuff for now
Blockly.UnityJSON.stmtToXML = function (stmt, program) {
    if (stmt) {
        if (stmt.type === "call") {
            if (_.contains(BUILT_INS, stmt.ident)) {
                if (stmt.args.length === 0) {
                    return '<block type="' + stmt.ident + '" id="' + stmt.meta.id + '">';
                } else if (stmt.ident === 'PlaceBlock') {
                    return '<block type="' + stmt.ident + '" id="' + stmt.meta.id + '"><field name="VALUE">' + Blockly.FieldColour.COLOURS[stmt.args[0].value - 1] + '</field>';
                } else {
                    return '<block type="' + stmt.ident + '" id="' + stmt.meta.id + '"><field name="VALUE">' + stmt.args[0].value + '</field>';
                }
            } else {
                return '<block type="procedures_callnoreturn"><mutation name="' + stmt.ident + '"></mutation>';
            }
        } else if (stmt.type === "repeat") {
            return '<block type="controls_repeat" id="' + stmt.meta.id + '"><field name="TIMES">' + stmt.numtimes.value + '</field><statement name="DO">' + Blockly.UnityJSON.bodyToXML(stmt.body, program) + '</statement>';
        }
    }
    return '';
}

}

