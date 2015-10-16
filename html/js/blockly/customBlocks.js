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
var COLOR_TEASER = '#707070';

Blockly.Blocks.loops.COLOR = COLOR_LOOPS;
Blockly.Blocks.procedures.COLOR = COLOR_PROCS;
Blockly.FieldColour.COLOURS = RuthefjordDisplay.cubeColors;
Blockly.FieldColour.COLUMNS = Math.min(RuthefjordDisplay.cubeColors.length, 8);

Blockly.JSONLangOps = {};

Blockly.JSONLangOps.convertCallback = function (obj) {
    return Blockly.JSONLangOps[obj.block.type](obj.block, obj.children);
};

/**
 * processes the body of block and returns an array of json-ready objects
 */
Blockly.JSONLangOps.processStructure = function (block) {
    var structure = block.getStructure();
    // if procedure, we only process its children
    if (block.getProcedureDef) {
        // procedures have no connection, so no siblings exist and we can assume the object we want is the first and only element
        return structure[0].children.map(Blockly.JSONLangOps.convertCallback).filter(function (x) { return x.skip !== true; });
    } else {
        return structure.map(Blockly.JSONLangOps.convertCallback).filter(function (x) { return x.skip !== true; });
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
};

Blockly.addCanvasListener("blocklyBlockDeleted", function() {
    // console.log('delete event!');
    if (!Blockly.mainWorkspace.dragMode) {
        RuthefjordBlockly.updateToolbox();
    }
});

function newCall(name, id, args) {
    return {args:args,meta:{id:Number(id)},name:name,type:"execute"};
}

function makeLiteral(value) {
    return {type:'int', value:value}; // We only have int literals right now
}

function makeIdent(name) {
    return {type:'ident', value:name};
}

function makeSingleArg(block, inputName) {
    var input = block.getInlineInput(inputName, "NUM");
    if (input === null) {
        input = block.getInlineInput(inputName, "VAR");
        return makeIdent(input);
    }
    return makeLiteral(input);
}

Blockly.JSONLangOps['Left'] = function(block) {
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

Blockly.JSONLangOps['Right'] = function(block) {
    return newCall("Right", block.id, []);
};

// FORWARD
Blockly.Blocks['Forward'] = {
    init: function() {
        this.jsonInit({
            message0: "forward by %1",
            args0: [
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

Blockly.JSONLangOps['Forward'] = function(block) {
    return newCall("Forward", block.id, [makeSingleArg(block, "VALUE")]);
};

// UP
Blockly.Blocks['Up'] = {
    init: function() {
        this.jsonInit({
            message0: "up by %1",
            args0: [
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

Blockly.Blocks['Up_teaser'] = {
    init: function() {
        this.jsonInit({
            message0: "up by %1",
            args0: [
                {
                    type: "param_value",
                    name: "VALUE",
                    check: "Number"
                }
            ],
            previousStatement:true,
            nextStatement:true,
            inputsInline:true,
            colour:COLOR_TEASER
        });
        this.locked = true;
        this.packName = "up";
    }
};

Blockly.JSONLangOps['Up'] = function(block) {
    return newCall("Up", block.id, [makeSingleArg(block, "VALUE")]);
};

// DOWN
Blockly.Blocks['Down'] = {
    init: function() {
        this.jsonInit({
            message0: "down by %1",
            args0: [
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

Blockly.Blocks['Down_teaser'] = {
    init: function() {
        this.jsonInit({
            message0: "down by %1",
            args0: [
                {
                    type: "param_value",
                    name: "VALUE",
                    check: "Number"
                }
            ],
            previousStatement:true,
            nextStatement:true,
            inputsInline:true,
            colour:COLOR_TEASER
        });
        this.locked = true;
        this.packName = "up";
    }
};

Blockly.JSONLangOps['Down'] = function(block) {
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

Blockly.JSONLangOps['PlaceCube'] = function(block) {
    return newCall("PlaceCube", block.id, [makeLiteral(Blockly.FieldColour.COLOURS.indexOf(block.getFieldValue("VALUE")))]);
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

Blockly.Blocks['RemoveCube_teaser'] = {
    init: function() {
        this.setFullColor(COLOR_TEASER);
        this.appendDummyInput()
            .appendField("remove cube");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.locked = true;
        this.packName = "remove";
    }
};

Blockly.JSONLangOps['RemoveCube'] = function(block) {
    return newCall("RemoveCube", block.id, []);
};

// REPEAT
Blockly.Blocks['controls_repeat_teaser'] = {
  /**
   * Block for repeat n times (internal number).
   * @this Blockly.Block
   */
  init: function() {
    this.jsonInit({
      "message0": Blockly.Msg.CONTROLS_REPEAT_TITLE + " %2 " +
          Blockly.Msg.CONTROLS_REPEAT_INPUT_DO + " %3",
      "args0": [
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
      "colour": COLOR_TEASER,
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
Blockly.JSONLangOps['controls_repeat'] = function(block, children) {
    return {
        meta: {id:Number(block.id)},
        number: makeSingleArg(block, "TIMES"),
        body: children.map(Blockly.JSONLangOps.convertCallback),
        type: "repeat"
    };
};

Blockly.Blocks['procedures_noargs_defnoreturn'] = {
    init: function() {
        this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFNORETURN_HELPURL);
        this.setFullColor(Blockly.Blocks.procedures.COLOR);
        var name = Blockly.Procedures.findLegalName(
            Blockly.Msg.PROCEDURES_DEFNORETURN_PROCEDURE, this);
        var nameField = new Blockly.FieldTextInput(name,
            Blockly.Procedures.rename);
        nameField.setSpellcheck(false);
        this.appendDummyInput()
            .appendField(Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE)
            .appendField(nameField, 'NAME');
        this.arguments_ = [];
        this.updateParams_();
        this.setTooltip(Blockly.Msg.PROCEDURES_DEFNORETURN_TOOLTIP);
        this.setStatements_(true);
        this.setInputsInline(true);
        this.statementConnection_ = null;
    },
    validate: Blockly.Blocks['procedures_defnoreturn'].validate,
    setStatements_: Blockly.Blocks['procedures_defnoreturn'].setStatements_,
    updateParams_: Blockly.Blocks['procedures_defnoreturn'].updateParams_,
    mutationToDom: Blockly.Blocks['procedures_defnoreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_defnoreturn'].domToMutation,
    decompose: Blockly.Blocks['procedures_defnoreturn'].decompose,
    compose: Blockly.Blocks['procedures_defnoreturn'].compose,
    dispose: Blockly.Blocks['procedures_defnoreturn'].dispose,
    getProcedureDef: Blockly.Blocks['procedures_defnoreturn'].getProcedureDef
};

Blockly.Blocks['procedures_defnoreturn_teaser'] = {
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
Blockly.JSONLangOps['math_number'] = function (block) {
    return {skip: true};
};

// VARIABLE_GET
Blockly.JSONLangOps['variables_get'] = function (block) {
    return {skip: true};
};

// CALL
Blockly.JSONLangOps['procedures_callnoreturn'] = function(block) {
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
    }

    return {args:args,meta:{id:Number(block.id)},name:'$' + block.getFieldValue("NAME"),type:"execute"};
};

/// Transform a program from its serialized JSON representation to blockly XML representation.
Blockly.JSONLangOps.XMLOfJSON = function(program) {
    var funcCount = 0;
    var xml = '<xml>';

    // pull out all top-level procedure definitions
    var groups = _.groupBy(program.body, function(stmt) {
        return stmt.type === 'procedure' ? 'procedure' : 'other';
    });

    // HACK NOTE: we don't deal with the prepended $ correctly yet but this sorta fixes itself when the program gets immediately sent to unity
    _.each(groups.procedure, function(proc) {
        var x = 260 + 200*(funcCount % 2);
        var y = 150 + 250*Math.floor(funcCount/2);
        var type = proc.params.length === 0 ? "procedures_noargs_defnoreturn" : "procedures_defnoreturn";
        xml += '<block type="' + type + '" id="' + proc.meta.id + '" x="' + x + '" y="' + y + '"><field name="NAME">' + proc.name + '</field><statement name="STACK">';
        xml += Blockly.JSONLangOps.bodyToXML(proc.body, program);
        xml += '</statement></block>';
        funcCount += 1;
    });

    var main = Blockly.JSONLangOps.bodyToXML(groups.other, program);
    var pos = ' x="260" y="15"';
    var insertIndex = main.indexOf(">", main.indexOf("block"));
    main = main.substring(0, insertIndex) + pos + main.substring(insertIndex);
    xml += main;

    return xml + "</xml>";
};

Blockly.JSONLangOps.bodyToXML = function (body, program) {
    if (!body) return "";

    var xml = Blockly.JSONLangOps.stmtToXML(body[0], program);
    for (var i = 1; i < body.length; i++) {
        var stmt = body[i];
        xml += '<next>' + Blockly.JSONLangOps.stmtToXML(stmt, program);
    }
    if (body.length > 0) { xml += '</block>'; }
    for (var i = 0; i < body.length - 1; i++) { // don't need a </next> for the first statement in the block
        xml += '</next></block>';
    }
    return xml;
};

var BUILT_INS = ['Forward', 'Left', 'Right', 'PlaceCube', 'RemoveCube', 'Up', 'Down'];

// HACK this totally doesn't handle defines correctly but works for other stuff for now
Blockly.JSONLangOps.stmtToXML = function (stmt, program) {
    if (stmt) {
        if (stmt.type === "execute") {
            if (_.contains(BUILT_INS, stmt.name)) { // built-in
                if (stmt.args.length === 0) {
                    return '<block type="' + stmt.name + '" id="' + stmt.meta.id + '">';
                } else if (stmt.name === 'PlaceCube') {
                    return '<block type="' + stmt.name + '" id="' + stmt.meta.id + '"><field name="VALUE">' + Blockly.FieldColour.COLOURS[stmt.args[0].value - 1] + '</field>';
                } else {
                    return '<block type="' + stmt.name + '" id="' + stmt.meta.id + '"><value name="VALUE">' + RuthefjordBlockly.makeNumXML(stmt.args[0].value) + '</value>';
                }
            } else if (Blockly.Blocks[stmt.name]) { // block generated from library import, assumes no parameters
                return '<block type="' + stmt.name + '" id="' + stmt.meta.id + '">';
            } else { // procedure call
                return '<block type="procedures_callnoreturn" id="' + stmt.meta.id + '"><mutation name="' + stmt.name + '"></mutation>';
            }
        } else if (stmt.type === "repeat") { // repeat
            return '<block type="controls_repeat" id="' + stmt.meta.id + '"><value name="TIMES">' + RuthefjordBlockly.makeNumXML(stmt.number.value) + '</value><statement name="DO">' + Blockly.JSONLangOps.bodyToXML(stmt.body, program) + '</statement>';
        }
    }
    return '';
};

}

