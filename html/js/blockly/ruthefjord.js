
var blocklyIframeLoaded;
var Blockly;

var RuthefjordBlockly = (function(){
'use strict';

/**
 * Create a namespace for the application.
 */
var RuthefjordBlockly = {};
RuthefjordBlockly.history = [];
RuthefjordBlockly.curProgramStr = "";
RuthefjordBlockly.ignoreNextHistory = false;

var q_defer = Q.defer();

blocklyIframeLoaded = function() {
    Blockly = document.getElementById('blockly').contentWindow.create();

    RuthefjordBlocklyCustomInit();

    var toolbox = document.getElementById('toolbox');
    window.addEventListener('scroll', function() {
        Blockly.fireUiEvent(window, 'resize');
    });

    Blockly.updateToolbox('<xml id="toolbox" style="display: none"></xml>');

    Blockly.addChangeListener(RuthefjordBlockly.makeCounter);
    Blockly.addChangeListener(RuthefjordBlockly.addToHistory);

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
RuthefjordBlockly.Commands = {"move2" :  '<block type="Forward"></block> \
                                  <block type="Left"></block> \
                                  <block type="Right"></block>',
                      "up" :  '<block type="Up"></block>',
                      "down":  '<block type="Down"></block>',
                      "place" :  '<block type="PlaceBlock"></block>',
                      "remove" : '<block type="RemoveBlock"></block>',
                      "line" :   '<block type="Line"></block>',
                      "repeat" : '<block type="controls_repeat"></block>'};

RuthefjordBlockly.makeCounter = function() {
    var blocksLeft = Blockly.mainWorkspace.remainingCapacity();
    var counter = $("#statement-counter")[0];
    if (blocksLeft < 5) {
        counter.innerHTML = blocksLeft + " blocks left.";
    } else { 
        counter.innerHTML = "";
    }
    var arrow = $("#attention-arrow");
    if (blocksLeft === 0) {
        arrow.css("display", "block");
        var trash = Blockly.mainWorkspace.trashcan;
        RuthefjordUI.Arrow.positionAt(trash.top_ + $("#blockly").offset().top, trash.left_ + $("#blockly").offset().left, trash.BODY_HEIGHT_ + trash.LID_HEIGHT_);
    } else {
        arrow.css("display", "none");
    }
};

RuthefjordBlockly.addToHistory = function () {
    //console.log("adding to history, locked = "+RuthefjordBlockly.ignoreNextHistory);
    if (RuthefjordBlockly.ignoreNextHistory) {
        RuthefjordBlockly.ignoreNextHistory = false;
        return;
    }
    var prog = RuthefjordBlockly.getXML();
    if (Blockly.Block.dragMode_ === 0 && prog !== RuthefjordBlockly.curProgramStr) {
        RuthefjordBlockly.history.push(RuthefjordBlockly.curProgramStr);
        RuthefjordBlockly.curProgramStr = prog;
    }
};

RuthefjordBlockly.undo = function () {
    if (RuthefjordBlockly.history.length > 0) {
        RuthefjordBlockly.ignoreNextHistory = true;
        RuthefjordBlockly.curProgramStr = RuthefjordBlockly.history.pop();
        RuthefjordBlockly.clearProgram();
        RuthefjordBlockly.loadBlocks(RuthefjordBlockly.curProgramStr);
    }
};

/**
 * Initialize Blockly.  Called by app.js
 */
RuthefjordBlockly.init = function() {
    // actually, initialization happened automatically, this just returns the promise we already created
    return q_defer.promise;
};

RuthefjordBlockly.clearProgram = function () {
    // clear existing blocks
    Blockly.mainWorkspace.getTopBlocks().map(function (b) { b.dispose(); });
};

/**
 * set blocks making up current program
 */
RuthefjordBlockly.setProgram = function(program) {
    console.info(program);

    RuthefjordBlockly.ignoreNextHistory = true;
    RuthefjordBlockly.clearProgram();

    RuthefjordBlockly.loadBlocks(Blockly.UnityJSON.XMLOfJSON(program));
    RuthefjordBlockly.curProgramStr = RuthefjordBlockly.getXML();

    // HACK this isn't very robust but works for everything with have (for now)
    _.each(program.body, function(stmt) {
        var attr;
        if (stmt.meta) { attr = stmt.meta.attributes; }
        if (attr && attr['FrozenBlocks']) {
            var doFreezeArgs = Boolean(attr['FrozenArgs']);
            var blocks = Blockly.mainWorkspace.getTopBlocks().filter(function (x) { return x.type !== "procedures_defnoreturn" });
            _.each(blocks, function(b) { RuthefjordBlockly.freezeBody(b, doFreezeArgs); });
        }
    });

    // set maximum blocks to 15 per function
    // Blockly.mainWorkspace.maxBlocks = Object.keys(program.procedures).length * 15;
};

/**
 * loads new program and takes care of related adjustments
 */
RuthefjordBlockly.loadBlocks = function (blocksXML) {
    BlocklyApps.loadBlocks(blocksXML);
    var blocks = Blockly.mainWorkspace.getTopBlocks();
};

/**
 * prevent procedure from being modifed in any way
 */
RuthefjordBlockly.freezeBody = function(block, doFreezeArgs) {
    block.forEach(function(b) {
        b.freeze({doFreezeArgs:doFreezeArgs});
    })
};

/**
 * set which blocks are available
 * @param scene_info The PuzzleInfo object sent from unity.
 * @param library The tools that should be active.
 */
RuthefjordBlockly.setLevel = function(scene_info, library) {
    var toolXML = '<xml id="toolbox" style="display: none">';

    // ignore scene_info.library, trust only the library parameter
    var lib = _.contains(scene_info.library.restricted, 'blocks') ? library.puzzle : library.all;
    _.each(lib, function(command) {
        if (RuthefjordBlockly.Commands[command]) {
            toolXML += RuthefjordBlockly.Commands[command];
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
RuthefjordBlockly.getProgram = function() {
    var topBlocks = Blockly.mainWorkspace.getTopBlocks(true);
    Blockly.UnityJSON.idCounter_ = Math.max.apply(null, Blockly.mainWorkspace.getAllBlocks().map(function (x, i, a) {return Number(x.id);}));

    var defines = [];
    var other = [];

    // iterate over top-level blocks, putting all defines first and everything else second
    _.each(topBlocks, function(block) {
        if (block.type === "procedures_defnoreturn") {
            var name = block.getFieldValue("NAME");
            var params = [];
            var body = Blockly.UnityJSON.processStructure(block);
            defines.push({type:"define", name:name, params:params, body:body});
        } else {
            other = other.concat(Blockly.UnityJSON.processStructure(block));
        }
    });
    return {
        meta: {
            language: 'imperative_v02',
            version: {major: 1, minor: 0}
        },
        body: defines.concat(other)
    };
};

/**
 * returns xml serialization of current blocks, including current positions
 * used for undo history
 */
RuthefjordBlockly.getXML = function() {
    return (new XMLSerializer()).serializeToString(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
};

return RuthefjordBlockly;
}());

