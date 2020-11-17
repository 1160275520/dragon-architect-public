function RuthefjordBlocklyCustomInit() {
'use strict';

// Extensions to Blockly's language and JavaScript generator.


var COLOR_MOVE_1 = '#CFEEFF';
var COLOR_MOVE_2 = '#CFFFE5';
var COLOR_BLOCK = '#F6FFCF';
var COLOR_LOOPS = '#00711C';
var COLOR_PROCS = '#FFF3CF';
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
        if (Blockly.dragMode_ === 0) {
            RuthefjordBlockly.updateToolbox();
        }
        return newName;
    }
};

Blockly.Variables.rename = function(text) {
    if (this.sourceBlock_.locked) {
        return;
    }
    if (this.sourceBlock_.isInFlyout) {
        // don't allow renaming of something in toolbox, this breaks everything...
        return this.getFieldValue("NAME");
    } else {
        // Strip leading and trailing whitespace.  Beyond this, all names are legal.
        text = text.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');

        // Rename any getters and setters.
        var blocks = this.sourceBlock_.workspace.getAllBlocks();
        for (var i = 0; i < blocks.length; i++) {
            if (blocks[i].isGetter && blocks[i].renameVar) { // procedure call blocks have this defined
                blocks[i].renameVar(this.text_, text); // only renames to text those calls that match current name this.text_
            }
        }
        // blockly friggin explodes if the toolbox is updated while something is being dragged
        if (Blockly.dragMode_ === 0) {
            RuthefjordBlockly.updateToolbox();
        }
        return text;
    }
};

var old_changed_func = Blockly.Mutator.prototype.workspaceChanged_;

Blockly.Mutator.prototype.workspaceChanged_ = function() {
    old_changed_func.call(this);
    // blockly friggin explodes if the toolbox is updated while something is being dragged
    if (Blockly.dragMode_ === 0) {
        RuthefjordBlockly.updateToolbox();
    }
};

function newCall(name, id, args) {
    return {args:args,meta:{id:id},name:name,type:"execute"};
}

function makeLiteral(value) {
    return {type:'int', value:value}; // We only have int literals right now
}

function makeIdent(name) {
    return {type:'ident', value:name};
}

//For the making of variable set blocks
function makeAssignment(name, value) {
    return {type:"assign", name:name, value:value};
}

function makeSingleArg(block, inputName) {
    var input = block.getInlineInputValue(inputName, "NUM");
    if (input === null) {
        input = block.getInlineInputValue(inputName, "NAME");
        return makeIdent(input);
    }
    return makeLiteral(input);
}

// LEFT
Blockly.Blocks['Left'] = {
    init: function() {
        this.setColour(COLOR_MOVE_1);
        this.appendDummyInput()
            .appendField("turn left");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.JSONLangOps['Left'] = function(block) {
    return newCall("Left", block.id, []);
};

// RIGHT
Blockly.Blocks['Right'] = {
    init: function() {
        this.setColour(COLOR_MOVE_1);
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
                    type: "input_value",
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
    //make Single Arg takes in the block that has been passed to forward. When this is a variable block, it doesn't currently have a value
    return newCall("Forward", block.id, [makeSingleArg(block, "VALUE")]);
};

// SET - the set block creates variables and initializes them
Blockly.Blocks['Set'] = {
    init: function() {
        this.setColour(Blockly.Blocks.variables.HUE);

        // TODO is it ok to just make counter the default name?
        var nameField = new Blockly.FieldTextInput("counter", Blockly.Variables.rename);
        nameField.setSpellcheck(false);
        this.appendDummyInput()
            .appendField("Set")
            .appendField(nameField, 'NAME')
            .appendField("to");

        var input = this.appendValueInput("VALUE");
        input.setCheck("Number");
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    },
    mutationToDom: function () {
        // TODO is this necessary?
        var container = document.createElement('mutation');

        // HACK add dummmy attribute for no argument to ensure toolbox gets updated with caller (it's super byzantine)
        container.setAttribute('dummy', true);

        return container;
    },
    domToMutation: function (xml) {
        // TODO is this necessary?;
    },
    getVars: function() { // used by Blockly code
        return [this.getFieldValue('NAME')];
    },
    renameVar: function (oldName, newName) {
        if (Blockly.Names.equals(oldName, this.getFieldValue('NAME'))) {
            this.setFieldValue(newName, 'NAME');
        }
    },
    dispose: function () {
        var getters = [];
        var blocks = Blockly.getMainWorkspace().getAllBlocks();
        var found_setter = false;
        var var_name;
        // Iterate through every block and check the name.
        for (var i = 0; i < blocks.length; i++) {
            if (blocks[i].isGetter) {
                var_name = blocks[i].getFieldValue('NAME');
                // Procedure name may be null if the block is only half-built.
                if (var_name && Blockly.Names.equals(var_name, this.getFieldValue('NAME'))) {
                    getters.push(blocks[i]);
                }
            } else if (blocks[i].renameVar) { // found a setter
                var_name = blocks[i].getFieldValue('NAME');
                found_setter = found_setter || ((this !== blocks[i]) && var_name && Blockly.Names.equals(var_name, this.getFieldValue('NAME')));
            }
        }
        if (!found_setter) {
            for (i = 0; i < getters.length; i++) {
                getters[i].dispose(true, false);
            }
        }
        // avoid recursively updating toolbox by only doing the update when the block being disposed in not in the toolbox
        var flyout = this.isInFlyout;
        this.constructor.prototype.dispose.apply(this, arguments);
        if (Blockly.dragMode_ === 0 && !flyout) {
            RuthefjordBlockly.updateToolbox();
        }
    },
};

Blockly.JSONLangOps['Set'] = function(block) {
    return makeAssignment(block.getFieldValue('NAME'), makeSingleArg(block, "VALUE"));
};

//Get blocks only have the name of the variable on them and can be put into forward, up, down, or repeats
Blockly.Blocks['Get'] = {
    //GET block currently only carries its name. 
    init: function () {
        this.setColour(Blockly.Blocks.variables.HUE);
        this.appendDummyInput()
            .appendField(new Blockly.FieldVariable("counter"), 'NAME');
        this.setOutput(true);
        this.setEditable(false);
    },
    renameVar: function (oldName, newName) {
        console.log("renameVar " + oldName + "->" + newName)
        if (Blockly.Names.equals(oldName, this.getFieldValue('NAME'))) {
            this.setFieldValue(newName, 'NAME');
        }
    },
    domToMutation: function (xml) {
        // applies the name mutation set up in updateToolbox
        this.setFieldValue(xml.getAttribute("name"), "NAME");
    },
    isGetter: true,
}

Blockly.JSONLangOps['Get'] = function(block) {
    //ident for indentifier/identification (variable)
    return makeIdent(block.getFieldValue('NAME'));
};

// UP
Blockly.Blocks['Up'] = {
    init: function() {
        this.jsonInit({
            message0: "up by %1",
            args0: [
                {
                    type: "input_value",
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
                    type: "input_value",
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
                    type: "input_value",
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
                    type: "input_value",
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
        this.setColour(COLOR_BLOCK);
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
        this.setColour(COLOR_BLOCK);
        this.appendDummyInput()
            .appendField("remove cube");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
    }
};

Blockly.Blocks['RemoveCube_teaser'] = {
    init: function() {
        this.setColour(COLOR_TEASER);
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
          "type": "input_value",
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
        meta: {id:block.id},
        number: makeSingleArg(block, "TIMES"),
        body: children.map(Blockly.JSONLangOps.convertCallback),
        type: "repeat"
    };
};

// COUNTING LOOP
Blockly.JSONLangOps['controls_for'] = function(block, children) {
    return {
        meta: {id:block.id},
        counter: makeSingleArg(block, "COUNTER"),
        from: makeSingleArg(block, "FROM"),
        to: makeSingleArg(block, "TO"),
        by: makeSingleArg(block, "BY"),
        body: children.map(Blockly.JSONLangOps.convertCallback),
        type: "counting_loop"
    };
};

Blockly.Blocks['procedures_noargs_defnoreturn'] = {
    init: function() {
        this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFNORETURN_HELPURL);
        this.setColour(Blockly.Blocks.procedures.COLOR);
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

        // make inner procedure connections immune to freezing
        var inputs = this.inputList.filter(function (input) { return input.type === Blockly.NEXT_STATEMENT; });
        inputs.forEach(function (input) { input.connection.neverFrozen = true; });
    },
    validate: Blockly.Blocks['procedures_defnoreturn'].validate,
    setStatements_: Blockly.Blocks['procedures_defnoreturn'].setStatements_,
    updateParams_: Blockly.Blocks['procedures_defnoreturn'].updateParams_,
    mutationToDom: Blockly.Blocks['procedures_defnoreturn'].mutationToDom,
    domToMutation: Blockly.Blocks['procedures_defnoreturn'].domToMutation,
    decompose: Blockly.Blocks['procedures_defnoreturn'].decompose,
    compose: Blockly.Blocks['procedures_defnoreturn'].compose,
    dispose: function () {
        // avoid recursively updating toolbox by only doing the update when the block being disposed in not in the toolbox
        var flyout = this.isInFlyout;
        Blockly.Blocks['procedures_defnoreturn'].dispose.apply(this, arguments);
        if (Blockly.dragMode_ === 0 && !flyout) {
            RuthefjordBlockly.updateToolbox();
        }
    },
    getProcedureDef: Blockly.Blocks['procedures_defnoreturn'].getProcedureDef
};

Blockly.Blocks['procedures_defnoreturn_teaser'] = {
    /**
    * Block for defining a procedure with no return value.
    * @this Blockly.Block
    */
    init: function() {
        this.setHelpUrl(Blockly.Msg.PROCEDURES_DEFNORETURN_HELPURL);
        this.setColour(Blockly.Blocks.procedures.COLOR);
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
        var type = block.getInlineInputValueType("ARG" + i);
        if (!type) {
            block.setWarningText('Help me know what to do by filling in all the parameters', RuthefjordBlockly.dragonIcon);
        } else {
            var data = block.getInlineInputValue("ARG" + i, type);
            if (type === "VAR") {
                args.push(makeIdent(data));
            } else {
                args.push(makeLiteral(data));
            }
        }
    }

    return {args:args,meta:{id:block.id},name:'$' + block.getFieldValue("NAME"),type:"execute"};
};

/// Transform a program from its serialized JSON representation to blockly XML representation.
Blockly.JSONLangOps.XMLOfJSON = function(program) {
    var funcCount = 1;
    var y_offset = Math.floor(Math.random() * 25) + 5;
    var xml = '<xml>';

    // pull out all top-level procedure definitions
    var groups = _.groupBy(program.body, function(stmt) {
        return stmt.type === 'procedure' ? 'procedure' : 'other';
    });

    // HACK NOTE: leave off the first character of procedure names due to prepended $
    _.forEach(groups.procedure, function(proc) {
        var x = 260 + 215*funcCount;
        var y = y_offset;
        var type = proc.params.length === 0 ? "procedures_noargs_defnoreturn" : "procedures_defnoreturn";
        proc.meta.id = Blockly.genUid();
        xml += '<block id="' + proc.meta.id + '" type="' + type + '" x="' + x + '" y="' + y + '"><field name="NAME">' + proc.name.slice(1) + '</field><statement name="STACK">';
        xml += Blockly.JSONLangOps.bodyToXML(proc.body, program);
        xml += '</statement></block>';
        funcCount += 1;
    });

    var main = Blockly.JSONLangOps.bodyToXML(groups.other, program);
    var pos = ' x="260" y="' + y_offset + '"';
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

var BUILT_INS = ['Forward', 'Set', 'Left', 'Right', 'PlaceCube', 'RemoveCube', 'Up', 'Down'];

// HACK this totally doesn't handle defines correctly but works for other stuff for now
Blockly.JSONLangOps.stmtToXML = function (stmt, program) {
    if (stmt) {
        stmt.meta.id = Blockly.genUid(); // record the ids we give to each block so we can refer to them later
        if (stmt.type === "execute") {
            if (_.includes(BUILT_INS, stmt.name)) { // built-in
                // HACK assumes single argument
                if (stmt.args.length === 0) {
                    return '<block id="' + stmt.meta.id + '" type="' + stmt.name + '">';
                } else if (stmt.name === 'PlaceCube') {
                    return '<block id="' + stmt.meta.id + '" type="' + stmt.name + '"><field name="VALUE">' + Blockly.FieldColour.COLOURS[stmt.args[0].value] + '</field>';
                } else {
                    if (!_.has(stmt.args[0], 'meta')) {
                        stmt.args[0].meta = {};
                    }
                    stmt.args[0].meta.id = Blockly.genUid();
                    return '<block id="' + stmt.meta.id + '" type="' + stmt.name + '"><value name="VALUE">' + RuthefjordBlockly.makeShadowNum(stmt.args[0].value, stmt.args[0].meta.id) + '</value>';
                }
            } else if (Blockly.Blocks[stmt.name]) { // block generated from library import, assumes no parameters
                return '<block id="' + stmt.meta.id + '" type="' + stmt.name + '">';
            } else { // procedure call, leave off the first character of procedure names due to prepended $
                return '<block id="' + stmt.meta.id + '" type="procedures_callnoreturn"><mutation name="' + stmt.name.slice(1) + '"></mutation>';
            }
        } else if (stmt.type === "repeat") { // repeat
            if (!_.has(stmt.number, 'meta')) {
                stmt.number.meta = {};
            }
            stmt.number.meta.id = Blockly.genUid();
            return '<block id="' + stmt.meta.id + '" type="controls_repeat"><value name="TIMES">' + RuthefjordBlockly.makeShadowNum(stmt.number.value, stmt.number.meta.id) + '</value><statement name="DO">' + Blockly.JSONLangOps.bodyToXML(stmt.body, program) + '</statement>';
        }
    }
    return '';
};

}

