
var blocklyIframeLoaded;
var Blockly;

var RutherfjordBlockly = (function(){
'use strict';

/**
 * Create a namespace for the application.
 */
var RutherfjordBlockly = {};
RutherfjordBlockly.history = [];
RutherfjordBlockly.curProgramStr = "";
RutherfjordBlockly.ignoreNextHistory = false;

var q_defer = Q.defer();

blocklyIframeLoaded = function() {
    Blockly = document.getElementById('blockly').contentWindow.create();

    RutherfjordBlocklyCustomInit();

    var toolbox = document.getElementById('toolbox');
    window.addEventListener('scroll', function() {
        Blockly.fireUiEvent(window, 'resize');
    });

    Blockly.updateToolbox('<xml id="toolbox" style="display: none"></xml>');

    Blockly.addChangeListener(RutherfjordBlockly.makeCounter);
    Blockly.addChangeListener(RutherfjordBlockly.addToHistory);

    q_defer.resolve();
};

// Supported languages.
BlocklyApps.LANGUAGES = ['en'];
BlocklyApps.LANG = BlocklyApps.getLang();

/* XXX edbutler: was this suppossed to be changed? It currently loads a non-existent file, so I commented it out.
document.write('<script type="text/javascript" src="generated/' +
               BlocklyApps.LANG + '.js"></script>\n');
 */

// dictionary of custom block xml
RutherfjordBlockly.Commands = {"move2" :  '<block type="Forward"></block> \
                                  <block type="Left"></block> \
                                  <block type="Right"></block>',
                      "up" :  '<block type="Up"></block>',
                      "down":  '<block type="Down"></block>',
                      "place" :  '<block type="PlaceBlock"></block>',
                      "remove" : '<block type="RemoveBlock"></block>',
                      "line" :   '<block type="Line"></block>',
                      "repeat" : '<block type="controls_repeat"></block>'};

RutherfjordBlockly.makeCounter = function() {
    var blocksLeft = Blockly.mainWorkspace.remainingCapacity();
    var counter = $("#statement-counter")[0];
    if (blocksLeft < 5) {
        counter.innerHTML = blocksLeft + " blocks left.";
    } else { 
        counter.innerHTML = "";
    }
    var arrow = $("#trash-arrow")[0];
    if (blocksLeft === 0) {
        arrow.style.visibility = "visible";
        arrow.style.webkitAnimationPlayState = "running";
        arrow.style.animationPlayState = "running";
    } else {
        arrow.style.visibility = "hidden";
        arrow.style.webkitAnimationPlayState = "paused";
        arrow.style.animationPlayState = "paused";
    }
};

RutherfjordBlockly.addToHistory = function () {
    //console.log("adding to history, locked = "+RutherfjordBlockly.ignoreNextHistory);
    if (RutherfjordBlockly.ignoreNextHistory) {
        RutherfjordBlockly.ignoreNextHistory = false;
        return;
    }
    var prog = RutherfjordBlockly.getXML();
    if (Blockly.Block.dragMode_ === 0 && prog !== RutherfjordBlockly.curProgramStr) {
        RutherfjordBlockly.history.push(RutherfjordBlockly.curProgramStr);
        RutherfjordBlockly.curProgramStr = prog;
    }
};

RutherfjordBlockly.undo = function () {
    if (RutherfjordBlockly.history.length > 0) {
        RutherfjordBlockly.ignoreNextHistory = true;
        RutherfjordBlockly.curProgramStr = RutherfjordBlockly.history.pop();
        RutherfjordBlockly.clearProgram();
        RutherfjordBlockly.loadBlocks(RutherfjordBlockly.curProgramStr);
    }
};

/**
 * Initialize Blockly.  Called by app.js
 */
RutherfjordBlockly.init = function() {
    // actually, initialization happened automatically, this just returns the promise we already created
    return q_defer.promise;
};

RutherfjordBlockly.clearProgram = function () {
    // clear existing blocks
    Blockly.mainWorkspace.getTopBlocks().map(function (b) { b.dispose(); });
};

/**
 * set blocks making up current program
 */
RutherfjordBlockly.setProgram = function(program) {
    console.info(program);

    RutherfjordBlockly.ignoreNextHistory = true;
    RutherfjordBlockly.clearProgram();

    RutherfjordBlockly.loadBlocks(Blockly.UnityJSON.XMLOfJSON(program));
    RutherfjordBlockly.curProgramStr = RutherfjordBlockly.getXML();

    _.each(program.procedures, function(proc, name) {
        var attr;
        if (proc.meta) { attr = proc.meta.attributes; }
        if (attr && attr['frozen_blocks']) {
            var doFreezeArgs = Boolean(attr['frozen_args']);
            if (name === 'MAIN') {
                var blocks = Blockly.mainWorkspace.getTopBlocks().filter(function (x) { return x.type !== "procedures_defnoreturn" });
                _.each(blocks, function(b) { RutherfjordBlockly.freezeBody(b, doFreezeArgs); });
            } else {
                RutherfjordBlockly.freezeBody(Blockly.mainWorkspace.getTopBlocks().filter(function (x) { return x.getFieldValue("NAME") === name; })[0], doFreezeArgs);
            }
        }
    });

    // set maximum blocks to 15 per function
    Blockly.mainWorkspace.maxBlocks = program.procedures.length * 15;
};

/**
 * loads new program and takes care of related adjustments
 */
RutherfjordBlockly.loadBlocks = function (blocksXML) {
    BlocklyApps.loadBlocks(blocksXML);
    var blocks = Blockly.mainWorkspace.getTopBlocks();
};

/**
 * prevent procedure from being modifed in any way
 */
RutherfjordBlockly.freezeBody = function(block, doFreezeArgs) {
    block.forEach(function(b) {
        b.freeze({doFreezeArgs:doFreezeArgs});
    })
};

/**
 * set which blocks are available
 * @param scene_info The PuzzleInfo object sent from unity.
 * @param library The tools that should be active.
 */
RutherfjordBlockly.setLevel = function(scene_info, library) {
    var toolXML = '<xml id="toolbox" style="display: none">';

    // ignore scene_info.library, trust only the library parameter
    _.each(library, function(command) {
        if (RutherfjordBlockly.Commands[command]) {
            toolXML += RutherfjordBlockly.Commands[command];
        }
    });
    toolXML += '</xml>';
    //console.log(toolXML);
    Blockly.updateToolbox(toolXML);

    if (scene_info && scene_info.tutorial && scene_info.tutorial.highlighted) {
        Blockly.mainWorkspace.flyout_.workspace_.topBlocks_.forEach(function (b) { 
            if (_.contains(scene_info.tutorial.highlighted, b.type)) {
                b.svg_.addNewGlow();
            }
        });
    }
};

/**
 * get json-ready version of current program
 */
RutherfjordBlockly.getProgram = function() {
    var topBlocks = Blockly.mainWorkspace.getTopBlocks(true);
    Blockly.UnityJSON.idCounter_ = Math.max.apply(null, Blockly.mainWorkspace.getAllBlocks().map(function (x, i, a) {return Number(x.id);}));
    var procedures = {};
    procedures["MAIN"] = {};
    var main = procedures["MAIN"];
    main['arity'] = 0;
    main['body'] = [];
    // iterate over top-level blocks
    for (var i = 0; i < topBlocks.length; i++) {
        var block = topBlocks[i];
        // process each procedure
        if (block.type === "procedures_defnoreturn") {
            procedures[block.getFieldValue("NAME")] = {};
            var fn = procedures[block.getFieldValue("NAME")];
            fn['arity'] = 0;
            fn['body'] = Blockly.UnityJSON.processStructure(block);
        } else { // everything else is part of MAIN
            main['body'] = main['body'].concat(Blockly.UnityJSON.processStructure(block));
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
RutherfjordBlockly.getXML = function() {
    return (new XMLSerializer()).serializeToString(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
};

return RutherfjordBlockly;
}());

