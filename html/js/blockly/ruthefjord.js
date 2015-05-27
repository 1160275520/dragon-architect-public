
var blocklyIframeLoaded;
var Blockly;

var RuthefjordBlockly = (function(){
'use strict';

var current_tools = [];

/**
 * Create a namespace for the application.
 */
var RuthefjordBlockly = {};
RuthefjordBlockly.history = [];
RuthefjordBlockly.curProgramStr = "";
RuthefjordBlockly.ignoreNextHistory = false;

// references to data from app.js (these should be treated as READ-ONLY)
RuthefjordBlockly.isSandbox = false;
RuthefjordBlockly.game_info;
RuthefjordBlockly.progress;

var q_defer = Q.defer();

blocklyIframeLoaded = function() {
    Blockly = document.getElementById('blockly').contentWindow.create();

    RuthefjordBlocklyCustomInit();

    var toolbox = document.getElementById('toolbox');
    window.addEventListener('scroll', function() {
        Blockly.fireUiEvent(window, 'resize');
    });

    Blockly.updateToolbox('<xml id="toolbox" style="display: none"></xml>');

    // block limit currently set to infinity, no need for counter; disabling it since it disrupts DebugFeaturesInfo's use of the arrow
    // Blockly.addChangeListener(RuthefjordBlockly.makeCounter);
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

RuthefjordBlockly.makeNumXML = function(num) {
    return '<block type="math_number"><field name="NUM">' + num + '</field></block>';
}

// list of custom block xml, in the order they should appear in the library
// block name, standard xml, locked xml, pack name
RuthefjordBlockly.Commands = [
    ['move2',  '<block type="Forward"><value name="VALUE">'+RuthefjordBlockly.makeNumXML(1)+'</value></block><block type="Left"></block><block type="Right"></block>'],
    ['place',  '<block type="PlaceCube"></block>'],
    ['line',   '<block type="Line"></block>'],
    ['up',  '<block type="Up"><value name="VALUE">'+RuthefjordBlockly.makeNumXML(1)+'</value></block>', '<block type="Up_locked"><value name="VALUE">'+RuthefjordBlockly.makeNumXML(1)+'</value></block>', 'up'],
    ['down',  '<block type="Down"><value name="VALUE">'+RuthefjordBlockly.makeNumXML(1)+'</value></block>', '<block type="Down_locked"><value name="VALUE">'+RuthefjordBlockly.makeNumXML(1)+'</value></block>', 'up'],
    ['remove', '<block type="RemoveCube"></block>', '<block type="RemoveCube_locked"></block>', 'remove'],
    ['repeat', '<block type="controls_repeat"><value name="TIMES">'+RuthefjordBlockly.makeNumXML(10)+'</value></block>', '<block type="controls_repeat_locked"><value name="TIMES">'+RuthefjordBlockly.makeNumXML(10)+'</value></block>', 'repeat'],
    ['defproc', '<block type="procedures_defnoreturn"></block>', '<block type="procedures_defnoreturn_locked"></block>', 'procedures']
];

RuthefjordBlockly.AddonCommands = [];

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
    // console.info(program);

    RuthefjordBlockly.ignoreNextHistory = true;
    RuthefjordBlockly.clearProgram();

    RuthefjordBlockly.loadBlocks(Blockly.UnityJSON.XMLOfJSON(program));
    RuthefjordBlockly.curProgramStr = RuthefjordBlockly.getXML();

    var checkStmt = function(stmt) {
        var attr;
        if (stmt.meta) { attr = stmt.meta.attributes; }
        if (attr) {
            var block = Blockly.mainWorkspace.getBlockById(stmt.meta.id);
            if (attr['FrozenBlocks']) {
                var doFreezeArgs = Boolean(attr['FrozenArgs']);
                RuthefjordBlockly.freezeBody(block, doFreezeArgs);
            }
            if (attr['NoMove']) {
                block.setMovable(false);
            }
        }
        if (stmt.body) { // recursively process children (e.g. blocks inside a repeat)
            _.each(stmt.body, checkStmt);
        }
    };

    // HACK this isn't very robust but works for everything with have (for now)
    _.each(program.body, checkStmt);

    // update block colors
    _.each(Blockly.mainWorkspace.getAllBlocks(), function (b) { b.svg_.updateColour(); });

    // update the toolbox in case the program contains any procedures
    RuthefjordBlockly.updateToolbox();

    // set maximum blocks to 15 per function
    // Blockly.mainWorkspace.maxBlocks = Object.keys(program.procedures).length * 15;
};

/**
 * loads new program and takes care of related adjustments
 */
RuthefjordBlockly.loadBlocks = function (blocksXML) {
    // console.info(blocksXML);
    BlocklyApps.loadBlocks(blocksXML);

    // update the toolbox in case the program contains any procedures
    RuthefjordBlockly.updateToolbox();
};

/**
 * prevent procedure from being modifed in any way
 */
RuthefjordBlockly.freezeBody = function(block, doFreezeArgs) {
    block.forEach(function(b) { // forEach processes blocks that are successors of block
        b.freeze({doFreezeArgs:doFreezeArgs});
    })
};

RuthefjordBlockly.updateToolbox = function() {
    var toolXML = '<xml id="toolbox" style="display: none">';
    _.each(_.union(RuthefjordBlockly.Commands, RuthefjordBlockly.AddonCommands), function(commandData) {
        if (_.contains(current_tools, commandData[0])) {
            toolXML += commandData[1];
        } else if (commandData[2] && RuthefjordBlockly.isSandbox) {
            var pack = RuthefjordBlockly.game_info.packs[commandData[3]];
            if (!pack.prereq || pack.prereq.every(function (packName) { return RuthefjordBlockly.progress.is_pack_completed(RuthefjordBlockly.game_info.packs[packName]); })) {
                toolXML += commandData[2];
            }
        }
    });

    // add call for each defined procedure
    var procs = Blockly.Procedures.allProcedures()[0];
    _.each(procs, function(proc) {
        var name = proc[0];
        toolXML += '<block type="procedures_callnoreturn"><mutation name="' + name + '"></mutation></block>';
    });

    toolXML += '</xml>';
    // console.log(toolXML);
    Blockly.updateToolbox(toolXML);

    // lock blocks as necessary
    _.each(Blockly.mainWorkspace.flyout_.workspace_.getAllBlocks(), function(block) {
        if (block.locked) {
            block.setDisabled(true);
            block.setEditable(false);
            $(block.svg_.svgGroup_).on('click', function() {
                onRuthefjordEvent("onLockedToolboxClick", block);
            });
        }
    });
};

/**
 * set which blocks are available
 * @param scene_info The PuzzleInfo object sent from unity.
 * @param library The tools that should be active.
 */
RuthefjordBlockly.setLevel = function(scene_info, library) {
    // ignore scene_info.library, trust only the library parameter
    // console.log(scene_info);
    current_tools = _.contains(scene_info.library.restricted, 'blocks') ? library.puzzle : library.all;

    // filter out restricted blocks
    current_tools = _.filter(current_tools, function(value, index, collection) {
        return !_.contains(scene_info.library.restricted, value);
    })

    RuthefjordBlockly.updateToolbox();

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

    var procs = [];
    var other = [];

    // iterate over top-level blocks, putting all function/procedure definitions first and everything else second
    _.each(topBlocks, function(block) {
        if (block.type === "procedures_defnoreturn") {
            // prepend a symbol to avoid clashes with builtins
            var name = '$' + block.getFieldValue("NAME");
            var params = [];
            var body = Blockly.UnityJSON.processStructure(block);
            procs.push({type:"proc", meta:{id:Number(block.id)}, name:name, params:params, body:body});
        } else {
            other = other.concat(Blockly.UnityJSON.processStructure(block));
        }
    });
    return {
        meta: {
            language: 'imperative_v02',
            version: {major: 1, minor: 0}
        },
        body: procs.concat(other)
    };
};

/**
 * returns xml serialization of current blocks, including current positions
 * used for undo history
 */
RuthefjordBlockly.getXML = function() {
    return (new XMLSerializer()).serializeToString(Blockly.Xml.workspaceToDom(Blockly.mainWorkspace));
};


/**
 * Assembles a new block with the specified name, text and params
 */
RuthefjordBlockly.generateBlock = function(name, text, params) {
    Blockly.Blocks[name] = {
        init: function() {
            this.setFullColor('#978B63');
            this.appendDummyInput()
                .appendField(text);
            // assuming no parameters for now since necessary features don't exist yet
            // for (var i = 0; i < params.length; i++) {
            //     this.appendValueInput('ARG'+i)
            //         .appendField(params[i]);
            // };
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setInputsInline(true);
        }
    }
    Blockly.UnityJSON[name] = function(block) {
        return {args:[],meta:{id:Number(block.id)},ident:name,type:"call"};
    };
    RuthefjordBlockly.AddonCommands.push([name, '<block type="'+name+'"></block>']);
}

return RuthefjordBlockly;
}());

