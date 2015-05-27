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
var COLOR_LOCKED = '#707070';

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
        return structure[0].children.map(Blockly.UnityJSON.convertCallback).filter(function (x) { return x.skip !== true; });
    } else {
        return structure.map(Blockly.UnityJSON.convertCallback).filter(function (x) { return x.skip !== true; });
    }
};

// LEFT
Blockly.Blocks['Left'] = {
    init: function() {
        this.setFullColor(COLOR_MOVE_1);
        this.appendDummyInput()
            .appendField("turn left");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

var old_rename_func = Blockly.Procedures.rename;

// monkey patch procedure renaming to change valid names, and also update library
Blockly.Procedures.rename = function(text) {
    if (this.sourceBlock_.locked) {
        return;
    }
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
    // console.log('delete event!');
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

function newCall(name, id, args) {
    var json = {args:[],meta:{id:Number(id)},ident:name,type:"call"};
    _.each(args, function(arg) {
        json.args.push({type:"literal", value:arg});
    });
    return json;
}

Blockly.UnityJSON['Left'] = function(block) {
    return newCall0("Left", block.id);
};

// RIGHT
Blockly.Blocks['Right'] = {
    init: function() {
        this.setFullColor(COLOR_MOVE_1);
        this.appendDummyInput()
            .appendField("turn right");
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
        this.interpolateMsg("foward by %1", ["VALUE", "Number", Blockly.ALIGN_RIGHT], Blockly.ALIGN_RIGHT);
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['Forward'] = function(block) {
    return newCall1("Forward", block.id, block.getInlineInput("VALUE", "NUM"));
};

// UP
Blockly.Blocks['Up'] = {
    init: function() {
        this.setFullColor(COLOR_MOVE_2);
        this.interpolateMsg("up by %1", ["VALUE", "Number", Blockly.ALIGN_RIGHT], Blockly.ALIGN_RIGHT);
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.Blocks['Up_locked'] = {
    init: function() {
        this.setFullColor(COLOR_LOCKED);
        this.interpolateMsg("up by %1", ["VALUE", "Number", Blockly.ALIGN_RIGHT], Blockly.ALIGN_RIGHT);
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.locked = true;
        this.packName = "up";
    }
};

Blockly.UnityJSON['Up'] = function(block) {
    return newCall1("Up", block.id, block.getInlineInput("VALUE", "NUM"));
};

// DOWN
Blockly.Blocks['Down'] = {
    init: function() {
        this.setFullColor(COLOR_MOVE_2);
        this.interpolateMsg("down by %1", ["VALUE", "Number", Blockly.ALIGN_RIGHT], Blockly.ALIGN_RIGHT);
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.Blocks['Down_locked'] = {
    init: function() {
        this.setFullColor(COLOR_LOCKED);
        this.interpolateMsg("down by %1", ["VALUE", "Number", Blockly.ALIGN_RIGHT], Blockly.ALIGN_RIGHT);
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.locked = true;
        this.packName = "up";
    }
};

Blockly.UnityJSON['Down'] = function(block) {
    return newCall1("Down", block.id, block.getInlineInput("VALUE", "NUM"));
};

// PLACECUBE
Blockly.Blocks['PlaceCube'] = {
    init: function() {
        this.setFullColor(COLOR_BLOCK);
        this.appendDummyInput()
            .appendField("place cube")
            .appendField(new Blockly.FieldColour(Blockly.FieldColour.COLOURS[0]), 'VALUE');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.UnityJSON['PlaceCube'] = function(block) {
    return newCall1("PlaceCube", block.id, Blockly.FieldColour.COLOURS.indexOf(block.getFieldValue("VALUE")) + 1);
};

// REMOVECUBE
Blockly.Blocks['RemoveCube'] = {
    init: function() {
        this.setFullColor(COLOR_BLOCK);
        this.appendDummyInput()
            .appendField("remove cube");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.Blocks['RemoveCube_locked'] = {
    init: function() {
        this.setFullColor(COLOR_BLOCK);
        this.appendDummyInput()
            .appendField("remove cube");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.locked = true;
        this.packName = "remove";
    }
};

Blockly.UnityJSON['RemoveCube'] = function(block) {
    return newCall0("RemoveCube", block.id);
};

// REPEAT
Blockly.Blocks['controls_repeat_locked'] = {
  /**
   * Block for repeat n times (internal number).
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl(Blockly.Msg.CONTROLS_REPEAT_HELPURL);
    this.setFullColor(Blockly.Blocks.loops.COLOR);
    this.interpolateMsg(Blockly.Msg.CONTROLS_REPEAT_TITLE,
                        ['TIMES', 'Number', Blockly.ALIGN_RIGHT],
                        Blockly.ALIGN_RIGHT);
    this.appendStatementInput('DO')
        .appendField(Blockly.Msg.CONTROLS_REPEAT_INPUT_DO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    this.setTooltip(Blockly.Msg.CONTROLS_REPEAT_TOOLTIP);

    // make inner repeat connections immune to freezing
    var inputs = this.inputList.filter(function (input) { return input.type === Blockly.NEXT_STATEMENT; });
    inputs.forEach(function (input) { input.connection.neverFrozen = true; });
    this.locked = true;
    this.packName = "repeat";
  }
};

// REPEAT
Blockly.UnityJSON['controls_repeat'] = function(block, children) {
    return {
        meta: {id:Number(block.id)},
        numtimes: {type:"literal", value:block.getInlineInput("TIMES", "NUM")},
        body: children.map(Blockly.UnityJSON.convertCallback),
        type: "repeat"
    };
}

Blockly.Blocks['procedures_defnoreturn_locked'] = {
  /**
   * Block for defining a procedure with no return value.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFNORETURN_HELPURL);
    this.setFullColor(Blockly.Blocks.procedures.COLOR);
    var name = Blockly.Procedures.findLegalName(
        Blockly.Msg.PROCEDURES_DEFNORETURN_PROCEDURE, this);
    this.appendDummyInput()
        .appendField(Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE)
        .appendField(new Blockly.FieldTextInput(name,
        Blockly.Procedures.rename), 'NAME')
        .appendField('', 'PARAMS');
    this.setTooltip(Blockly.Msg.PROCEDURES_DEFNORETURN_TOOLTIP);
    this.arguments_ = [];
    this.setStatements_(true);
    this.statementConnection_ = null;
    this.locked = true;
    this.packName = "procedures";
  },
  /**
   * Add or remove the statement block from this function definition.
   * @param {boolean} hasStatements True if a statement block is needed.
   * @this Blockly.Block
   */
  setStatements_: function(hasStatements) {
    if (this.hasStatements_ === hasStatements) {
      return;
    }
    if (hasStatements) {
      this.appendStatementInput('STACK')
          .appendField(Blockly.Msg.PROCEDURES_DEFNORETURN_DO);
      if (this.getInput('RETURN')) {
        this.moveInputBefore('STACK', 'RETURN');
      }
    } else {
      this.removeInput('STACK', true);
    }
    this.hasStatements_ = hasStatements;
  }
};

// MATH_NUMBER
Blockly.UnityJSON['math_number'] = function (block) {
    return {skip: true};
}

// CALL
Blockly.UnityJSON['procedures_callnoreturn'] = function(block) {
    return {args:[],meta:{id:Number(block.id)},ident:'$' + block.getFieldValue("NAME"),type:"call"};
}

/// Transform a program from its serialized JSON representation to blockly XML representation.
Blockly.UnityJSON.XMLOfJSON = function(program) {
    var funcCount = 0;
    var xml = '<xml>';

    // pull out all top-level procedure definitions
    var groups = _.groupBy(program.body, function(stmt) {
        return stmt.type === 'proc' ? 'proc' : 'other';
    });

    // HACK NOTE: we don't deal with the prepended $ correctly yet but this sorta fixes itself when the program gets immediately sent to unity
    _.each(groups.proc, function(proc) {
        var x = 10 + 200*(funcCount % 2);
        var y = 150 + 250*Math.floor(funcCount/2);
        xml += '<block type="procedures_defnoreturn" id="' + proc.meta.id + '" x="' + x + '" y="' + y + '"><field name="NAME">' + proc.name + '</field><statement name="STACK">';
        xml += Blockly.UnityJSON.bodyToXML(proc.body, program);
        xml += '</statement></block>';
        funcCount += 1;
    });

    var main = Blockly.UnityJSON.bodyToXML(groups.other, program);
    var pos = ' x="10" y="15"';
    var insertIndex = main.indexOf(">", main.indexOf("block"));
    main = main.substring(0, insertIndex) + pos + main.substring(insertIndex);
    xml += main;

    return xml + "</xml>";
}

Blockly.UnityJSON.bodyToXML = function (body, program) {
    if (!body) return "";

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

var BUILT_INS = ['Forward', 'Left', 'Right', 'PlaceCube', 'RemoveCube', 'Up', 'Down']

// HACK this totally doesn't handle defines correctly but works for other stuff for now
Blockly.UnityJSON.stmtToXML = function (stmt, program) {
    if (stmt) {
        if (stmt.type === "call") {
            if (_.contains(BUILT_INS, stmt.ident)) { // built-in
                if (stmt.args.length === 0) {
                    return '<block type="' + stmt.ident + '" id="' + stmt.meta.id + '">';
                } else if (stmt.ident === 'PlaceCube') {
                    return '<block type="' + stmt.ident + '" id="' + stmt.meta.id + '"><field name="VALUE">' + Blockly.FieldColour.COLOURS[stmt.args[0].value - 1] + '</field>';
                } else {
                    return '<block type="' + stmt.ident + '" id="' + stmt.meta.id + '"><value name="VALUE">' + RuthefjordBlockly.makeNumXML(stmt.args[0].value) + '</value>';
                }
            } else if (Blockly.Blocks[stmt.ident]) { // block generated from library import, assumes no parameters
                return '<block type="' + stmt.ident + '" id="' + stmt.meta.id + '">';
            } else { // procedure call
                return '<block type="procedures_callnoreturn" id="' + stmt.meta.id + '"><mutation name="' + stmt.ident + '"></mutation>';
            }
        } else if (stmt.type === "repeat") { // repeat
            return '<block type="controls_repeat" id="' + stmt.meta.id + '"><value name="TIMES">' + RuthefjordBlockly.makeNumXML(stmt.numtimes.value) + '</value><statement name="DO">' + Blockly.UnityJSON.bodyToXML(stmt.body, program) + '</statement>';
        }
    }
    return '';
}

}

