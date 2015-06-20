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

var old_changed_func = Blockly.Mutator.prototype.workspaceChanged_;

Blockly.Mutator.prototype.workspaceChanged_ = function() {
    old_changed_func.call(this);
    // blockly friggin explodes if the toolbox is updated while something is being dragged
    if (!Blockly.mainWorkspace.dragMode) {
        RuthefjordBlockly.updateToolbox();
    }
}

Blockly.addCanvasListener("blocklyBlockDeleted", function() {
    // console.log('delete event!');
    if (!Blockly.mainWorkspace.dragMode) {
        RuthefjordBlockly.updateToolbox();
    }
});

function newCall(name, id, args) {
    return {args:args,meta:{id:Number(id)},ident:name,type:"call"};
}

function makeLiteral(value) {
    return {type:'literal', value:value};
}

function makeIdent(name) {
    return {type:'ident', name:name};
}

function makeSingleArg(block, inputName) {
    var input = block.getInlineInput(inputName, "NUM");
    if (input === null) {
        input = block.getInlineInput(inputName, "VAR")
        return makeIdent(input);
    }
    return makeLiteral(input);
}

Blockly.UnityJSON['Left'] = function(block) {
    return newCall("Left", block.id, []);
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
    return newCall("Right", block.id, []);
};

// FORWARD
Blockly.Blocks['Forward'] = {
    init: function() {
        this.jsonInit({
            message: "forward by %1",
            args: [
                {
                    type: "param_value",
                    name: "VALUE",
                    check: "Number"
                }
            ],
            previousStatement:true,
            nextStatement:true,
            inputsInline:true,
            colour:COLOR_MOVE_1
        });
    }
};

Blockly.UnityJSON['Forward'] = function(block) {
    return newCall("Forward", block.id, [makeSingleArg(block, "VALUE")]);
};

// UP
Blockly.Blocks['Up'] = {
    init: function() {
        this.jsonInit({
            message: "up by %1",
            args: [
                {
                    type: "param_value",
                    name: "VALUE",
                    check: "Number"
                }
            ],
            previousStatement:true,
            nextStatement:true,
            inputsInline:true,
            colour:COLOR_MOVE_2
        });
    }
};

Blockly.Blocks['Up_locked'] = {
    init: function() {
        this.jsonInit({
            message: "up by %1",
            args: [
                {
                    type: "param_value",
                    name: "VALUE",
                    check: "Number"
                }
            ],
            previousStatement:true,
            nextStatement:true,
            inputsInline:true,
            colour:COLOR_LOCKED
        });
        this.locked = true;
        this.packName = "up";
    }
};

Blockly.UnityJSON['Up'] = function(block) {
    return newCall("Up", block.id, [makeSingleArg(block, "VALUE")]);
};

// DOWN
Blockly.Blocks['Down'] = {
    init: function() {
        this.jsonInit({
            message: "down by %1",
            args: [
                {
                    type: "param_value",
                    name: "VALUE",
                    check: "Number"
                }
            ],
            previousStatement:true,
            nextStatement:true,
            inputsInline:true,
            colour:COLOR_MOVE_2
        });
    }
};

Blockly.Blocks['Down_locked'] = {
    init: function() {
        this.jsonInit({
            message: "down by %1",
            args: [
                {
                    type: "param_value",
                    name: "VALUE",
                    check: "Number"
                }
            ],
            previousStatement:true,
            nextStatement:true,
            inputsInline:true,
            colour:COLOR_LOCKED
        });
        this.locked = true;
        this.packName = "up";
    }
};

Blockly.UnityJSON['Down'] = function(block) {
    return newCall("Down", block.id, [makeSingleArg(block, "VALUE")]);
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
    return newCall("PlaceCube", block.id, [makeLiteral(Blockly.FieldColour.COLOURS.indexOf(block.getFieldValue("VALUE")) + 1)]);
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
        this.setFullColor(COLOR_LOCKED);
        this.appendDummyInput()
            .appendField("remove cube");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.locked = true;
        this.packName = "remove";
    }
};

Blockly.UnityJSON['RemoveCube'] = function(block) {
    return newCall("RemoveCube", block.id, []);
};

// REPEAT
Blockly.Blocks['controls_repeat_locked'] = {
  /**
   * Block for repeat n times (internal number).
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message": Blockly.Msg.CONTROLS_REPEAT_TITLE + " %2 " +
          Blockly.Msg.CONTROLS_REPEAT_INPUT_DO + " %3",
      "args": [
        {
          "type": "param_value",
          "name": "TIMES",
          "check": "Number"
        },
        {
          "type": "input_dummy"
        },
        {
          "type": "input_statement",
          "name": "DO"
        }
      ],
      "previousStatement": true,
      "nextStatement": true,
      "inputsInline": true,
      "colour": COLOR_LOCKED,
      "tooltip": Blockly.Msg.CONTROLS_REPEAT_TOOLTIP,
      "helpUrl": Blockly.Msg.CONTROLS_REPEAT_HELPURL
    });

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
        numtimes: makeSingleArg(block, "TIMES"),
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

// VARIABLE_GET
Blockly.UnityJSON['variables_get'] = function (block) {
    return {skip: true};
}

// CALL
Blockly.UnityJSON['procedures_callnoreturn'] = function(block) {
    var args = [];
    block.setWarningText(null);
    for (var i = 0; i < block.arguments_.length; i++) {
        var type = block.getInlineInputType("ARG" + i);
        if (!type) {
            block.setWarningText('Help me know what to do by filling in all the parameters', RuthefjordBlockly.dragonIcon);
        } else {
            var data = block.getInlineInput("ARG" + i, type);
            if (type === "VAR") {
                args.push(makeIdent(data));
            } else {
                args.push(makeLiteral(data));
            }
        }
    };

    return {args:args,meta:{id:Number(block.id)},ident:'$' + block.getFieldValue("NAME"),type:"call"};
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
        var x = 110 + 200*(funcCount % 2);
        var y = 150 + 250*Math.floor(funcCount/2);
        xml += '<block type="procedures_defnoreturn" id="' + proc.meta.id + '" x="' + x + '" y="' + y + '"><field name="NAME">' + proc.name + '</field><statement name="STACK">';
        xml += Blockly.UnityJSON.bodyToXML(proc.body, program);
        xml += '</statement></block>';
        funcCount += 1;
    });

    var main = Blockly.UnityJSON.bodyToXML(groups.other, program);
    var pos = ' x="110" y="15"';
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

