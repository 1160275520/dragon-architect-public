
var blocklyIframeLoaded;
var Blockly;

var HackcraftBlockly = (function(){
'use strict';

/**
 * Create a namespace for the application.
 */
var HackcraftBlockly = {};
HackcraftBlockly.history = [];
HackcraftBlockly.curProgramStr = "";
HackcraftBlockly.ignoreNextHistory = false;

var q_defer = Q.defer();

blocklyIframeLoaded = function() {
    Blockly = document.getElementById('blockly').contentWindow.create();

    HackcraftBlocklyCustomInit();

    var toolbox = document.getElementById('toolbox');
    window.addEventListener('scroll', function() {
        Blockly.fireUiEvent(window, 'resize');
    });

    Blockly.updateToolbox('<xml id="toolbox" style="display: none"></xml>');

    Blockly.addChangeListener(HackcraftBlockly.makeCounter);
    Blockly.addChangeListener(HackcraftBlockly.addToHistory);

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
HackcraftBlockly.Commands = {"move2" :  '<block type="Forward"></block> \
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
HackcraftBlockly.makeFuncs = function (num) {
    HackcraftBlockly.Commands['call'] = '';
    for (var i = 0; i < num; i++) {
        HackcraftBlockly.Commands['call'] += '<block type="procedures_callnoreturn"> \
                                         <mutation name="F'+ (i+1) + '"></mutation> \
                                       </block>';
    }
};

HackcraftBlockly.makeCounter = function() {
    var blocksLeft = Blockly.mainWorkspace.maxBlocks - Blockly.mainWorkspace.getAllBlocks().length;
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

HackcraftBlockly.addToHistory = function () {
    //console.log("adding to history, locked = "+HackcraftBlockly.ignoreNextHistory);
    if (HackcraftBlockly.ignoreNextHistory) {
        HackcraftBlockly.ignoreNextHistory = false;
        return;
    }
    var prog = HackcraftBlockly.getXML();
    if (Blockly.Block.dragMode_ === 0 && prog !== HackcraftBlockly.curProgramStr) {
        HackcraftBlockly.history.push(HackcraftBlockly.curProgramStr);
        HackcraftBlockly.curProgramStr = prog;
    }
};

HackcraftBlockly.undo = function () {
    if (HackcraftBlockly.history.length > 0) {
        HackcraftBlockly.ignoreNextHistory = true;
        HackcraftBlockly.curProgramStr = HackcraftBlockly.history.pop();
        HackcraftBlockly.clearProgram();
        HackcraftBlockly.loadBlocks(HackcraftBlockly.curProgramStr);
    }
};

/**
 * Initialize Blockly.  Called by app.js
 */
HackcraftBlockly.init = function() {
    // actually, initialization happened automatically, this just returns the promise we already created
    return q_defer.promise;
};

HackcraftBlockly.clearProgram = function () {
    // clear existing blocks
    Blockly.mainWorkspace.getTopBlocks().map(function (b) { b.dispose(); });
};

/**
 * set blocks making up current program
 */
HackcraftBlockly.setProgram = function(program) {
    console.info(program);

    HackcraftBlockly.ignoreNextHistory = true;
    HackcraftBlockly.clearProgram();

    HackcraftBlockly.loadBlocks(Blockly.UnityJSON.XMLOfJSON(program));
    HackcraftBlockly.curProgramStr = HackcraftBlockly.getXML();

    _.each(program.procedures, function(proc, name) {
        var attr;
        if (proc.meta) { attr = proc.meta.attributes; }
        if (attr && attr['frozen_blocks']) {
            var doFreezeArgs = Boolean(attr['frozen_args']);
            if (name === 'MAIN') {
                var blocks = Blockly.mainWorkspace.getTopBlocks().filter(function (x) { return x.type !== "procedures_defnoreturn" });
                _.each(blocks, function(b) { HackcraftBlockly.freezeBody(b, doFreezeArgs); });
            } else {
                HackcraftBlockly.freezeBody(Blockly.mainWorkspace.getTopBlocks().filter(function (x) { return x.getFieldValue("NAME") === name; })[0], doFreezeArgs);
            }
        }
    });

    // set maximum blocks to 15 per function
    Blockly.mainWorkspace.maxBlocks = program.procedures.length * 15;
};

/**
 * loads new program and takes care of related adjustments
 */
HackcraftBlockly.loadBlocks = function (blocksXML) {
    BlocklyApps.loadBlocks(blocksXML);
    var blocks = Blockly.mainWorkspace.getTopBlocks();
};

/**
 * prevent procedure from being modifed in any way
 */
HackcraftBlockly.freezeBody = function(block, doFreezeArgs) {
    block.forEach(function(b) {
        b.freeze({doFreezeArgs:doFreezeArgs});
    })
};

/**
 * set which blocks are available
 * @param scene_info The PuzzleInfo object sent from unity.
 * @param library The tools that should be active.
 */
HackcraftBlockly.setLevel = function(scene_info, library) {
    var toolXML = '<xml id="toolbox" style="display: none">';

    // HACK
    HackcraftBlockly.makeFuncs(4);

    // ignore scene_info.library, trust only the library parameter
    _.each(library, function(command) {
        if (HackcraftBlockly.Commands[command]) {
            toolXML += HackcraftBlockly.Commands[command];
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
HackcraftBlockly.getProgram = function() {
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
HackcraftBlockly.getXML = function() {
    return (new XMLSerializer()).serializeToString(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
};

return HackcraftBlockly;
}());

