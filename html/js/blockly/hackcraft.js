
var Hackcraft = (function(){
'use strict';

/**
 * Create a namespace for the application.
 */
var Hackcraft = {};
Hackcraft.history = new Array();
Hackcraft.curProgramStr = "";
Hackcraft.ignoreNextHistory = false;

// Supported languages.
BlocklyApps.LANGUAGES = ['en'];
BlocklyApps.LANG = BlocklyApps.getLang();

/* XXX edbutler: was this suppossed to be changed? It currently loads a non-existent file, so I commented it out.
document.write('<script type="text/javascript" src="generated/' +
               BlocklyApps.LANG + '.js"></script>\n');
 */

// dictionary of custom block xml
Hackcraft.Commands = {"move2" :  '<block type="Forward"></block> \
                                  <block type="Left"></block> \
                                  <block type="Right"></block>',
                      "move3" :  '<block type="Up"></block> \
                                  <block type="Down"></block>',
                      "place" :  '<block type="PlaceBlock"></block>',
                      "line" :   '<block type="Line"></block>',
                      "repeat" : '<block type="controls_repeat"></block>'};



/**
 * Create call blocks for the helper functions present
 */
Hackcraft.makeFuncs = function (num) {
    Hackcraft.Commands['call'] = '';
    for (var i = 0; i < num; i++) {
        Hackcraft.Commands['call'] += '<block type="procedures_callnoreturn"> \
                                         <mutation name="F'+ (i+1) + '"></mutation> \
                                       </block>';
    }
};

Hackcraft.makeCounter = function() {
    var blocksLeft = Blockly.mainWorkspace.maxBlocks - Blockly.mainWorkspace.getAllBlocks().length;
    var counter = $("#statement-counter")[0];
    if (blocksLeft < 5) {
        counter.innerHTML = blocksLeft + " blocks left.";
    } else { 
        counter.innerHTML = "";
    }
    var arrow = $("#trash-arrow")[0];
    if (blocksLeft == 0) {
        arrow.style.visibility = "visible";
        arrow.style.webkitAnimationPlayState = "running";
        arrow.style.animationPlayState = "running";
    } else {
        arrow.style.visibility = "hidden";
        arrow.style.webkitAnimationPlayState = "paused";
        arrow.style.animationPlayState = "paused";
    }
};

Hackcraft.addToHistory = function () {
    //console.log("adding to history, locked = "+Hackcraft.ignoreNextHistory);
    if (Hackcraft.ignoreNextHistory) {
        Hackcraft.ignoreNextHistory = false;
        return;
    }
    var prog = Hackcraft.getXML();
    if (Blockly.Block.dragMode_ == 0 && prog != Hackcraft.curProgramStr) {
        Hackcraft.history.push(Hackcraft.curProgramStr);
        Hackcraft.curProgramStr = prog;
    }
}

Hackcraft.undo = function () {
    if (Hackcraft.history.length > 0) {
        Hackcraft.ignoreNextHistory = true;
        Hackcraft.curProgramStr = Hackcraft.history.pop();
        Hackcraft.clearProgram();
        Hackcraft.loadBlocks(Hackcraft.curProgramStr);
    }
}

/**
 * Initialize Blockly.  Called by app.js
 */
Hackcraft.init = function() {
    BlocklyApps.init();
    var toolbox = document.getElementById('toolbox');
    Blockly.inject(document.getElementById('blockly'),
        {path: '',
         rtl: false,
         toolbox: toolbox,
         trashcan: true});

    window.addEventListener('scroll', function() {
        Blockly.fireUiEvent(window, 'resize');
    });

    Blockly.updateToolbox('<xml id="toolbox" style="display: none"></xml>');

    Blockly.addChangeListener(Hackcraft.makeCounter);
    Blockly.addChangeListener(Hackcraft.addToHistory);
};

Hackcraft.clearProgram= function () {
    // clear existing blocks
    Blockly.mainWorkspace.getTopBlocks().map(function (b) { b.dispose(); });
}

/**
 * set blocks making up current program
 */
Hackcraft.setProgram = function(program) {
    Hackcraft.ignoreNextHistory = true;
    Hackcraft.clearProgram();

    //console.log("setting program");
    //console.log(Blockly.UnityJSON.XMLOfJSON(program));
    Hackcraft.loadBlocks(Blockly.UnityJSON.XMLOfJSON(program));
    Hackcraft.curProgramStr = Hackcraft.getXML();
};

/**
 * loads new program and takes care of related adjustments
 */
Hackcraft.loadBlocks = function (blocksXML) {
    BlocklyApps.loadBlocks(blocksXML);
    var blocks = Blockly.mainWorkspace.getTopBlocks();
    // set maximum blocks to 15 per function
    Blockly.mainWorkspace.maxBlocks = blocks.length * 15;    

    // recolor functions to differentiate MAIN from helpers
    if (blocks.length > 0) {
        blocks.filter(function (x) { return x.getFieldValue("NAME") === "MAIN"; })[0].setColour(260);
        blocks.filter(function (x) { return x.type === "procedures_defnoreturn" && x.getFieldValue("NAME") !== "MAIN"; }).map(function (x) { x.setColour(315); });
    }
    // prevent renaming and deleting existing procedures 
    for (var i = 0; i < blocks.length; i++) {
        blocks[i].setEditable(false);
        blocks[i].setDeletable(false);
        blocks[i].contextMenu = false;
    };
}

/**
 * prevent procedure from being modifed in any way
 */
Hackcraft.freezeBody = function(block) {
    //console.log("freezing " + block);
    block.inputList[1].connection.freeze();
    function freezeBlock(b) {
        b.setMovable(false);
        b.nextConnection.freeze();
        b.setDeletable(false);
        b.contextMenu = false;
    }
    Hackcraft.processBody(block, function tmp(x) {
        freezeBlock(x);
        if (x.inputList.some(function (i) { return i.connection != null; })) {
            Hackcraft.processBody(x, tmp);
        }
    });
};

/**
 * set which blocks are available
 */
Hackcraft.setLevel = function(levelInfo) {
    //console.log("updating toolbox");
    var toolXML = '<xml id="toolbox" style="display: none">';
    if (levelInfo.funcs) {
        Hackcraft.makeFuncs(levelInfo.funcs);
    }
    _.each(levelInfo.commands, function(command) {
        if (Hackcraft.Commands[command]) {
            toolXML += Hackcraft.Commands[command];
        }
    });
    toolXML += '</xml>';
    //console.log(toolXML);
    Blockly.updateToolbox(toolXML);

    if (levelInfo.highlights) {
        Blockly.mainWorkspace.flyout_.workspace_.topBlocks_.forEach(function (b) { 
            if ($.inArray(b.type, levelInfo.highlights) > -1) {
                b.svg_.addNewGlow();
            }
        });
    }

    if (levelInfo.locks) {
        levelInfo.locks.forEach(function (l) {
            Hackcraft.freezeBody(Blockly.mainWorkspace.getTopBlocks().filter(function (x) { return x.getFieldValue("NAME") === l; })[0]);
        });
    }
};

/**
 * get json-ready version of current program
 */
Hackcraft.getProgram = function() {
    var topBlocks = Blockly.mainWorkspace.getTopBlocks(true);
    Blockly.UnityJSON.idCounter_ = Math.max.apply(null, Blockly.mainWorkspace.getAllBlocks().map(function (x, i, a) {return Number(x.id)}));
    var procedures = {};
    // iterate over top-level blocks
    for (var i = 0; i < topBlocks.length; i++) {
        var block = topBlocks[i];
        // process each procedure
        if (block.type === "procedures_defnoreturn") {
            procedures[block.getFieldValue("NAME")] = {};
            var fn = procedures[block.getFieldValue("NAME")];
            fn['arity'] = 0;
            fn['body'] = Blockly.UnityJSON.processBody(block);
        }
    }
    return {
        meta: {
            language: 'imperative_v01',
            version: {major: 0, minor: 1}
        },
        procedures: procedures,
    };
};

/**
 * returns xml serialization of current blocks, including current positions
 * used for undo history
 */
Hackcraft.getXML = function() {
    return (new XMLSerializer()).serializeToString(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
}

/**
 * iterates over the blocks in a body, invoking callback on each one
 * callback needs to handle recursively processing nested bodies, if applicable
 */
 Hackcraft.processBody = function(block, callback) {
    var bodyBlock = block.inputList[1];
    var body = [];
    if (bodyBlock.connection && bodyBlock.connection.targetBlock()) {
        var stmt = bodyBlock.connection.targetBlock();
        // process stmt
        body.push(callback(stmt));
        // iterate over top-level blocks inside body
        while(stmt.nextConnection && stmt.nextConnection.targetBlock()) {
            // dispatch appropriately for each type of block
            stmt = stmt.nextConnection.targetBlock();
            body.push(callback(stmt));
        }
    }
    return body;
 };

/**
 * set the html for the instructions, sizing the speech buble appropriately
 * if instructions is the empty string, speech bubble is hidden instead
 */
Hackcraft.setInstructions = function (instructions) {
    //console.log("setting instructions");
    //console.log(instructions);
    var msg = $('#instructions')[0];
    // $('#instructions').removeClass("speechBubble");
    if (instructions) {
        msg.innerHTML = instructions;

    }
}

return Hackcraft;
}());
