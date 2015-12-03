
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

RuthefjordBlockly.game_info; // assigned in app.js
RuthefjordBlockly.progress; // assigned in app.js
RuthefjordBlockly.scene_info; // assigned in app.js

var q_defer = Q.defer();

blocklyIframeLoaded = function() {
    Blockly = document.getElementById('blockly').contentWindow.create();
    console.info("blockly init");
    RuthefjordBlocklyCustomInit();

    var toolbox = document.getElementById('toolbox');
    window.addEventListener('scroll', function() {
        Blockly.fireUiEvent(window, 'resize');
    });

    Blockly.getMainWorkspace().updateToolbox('<xml id="toolbox" style="display: none"></xml>');

    // block limit currently set to infinity, no need for counter; disabling it since it disrupts DebugFeaturesInfo's use of the arrow
    // Blockly.addChangeListener(RuthefjordBlockly.makeCounter);

    // no undo button currently
    Blockly.getMainWorkspace().addChangeListener(RuthefjordBlockly.addToHistory);

    Blockly.getMainWorkspace().flyout_.svgGroup_.onmouseenter = function () {
        Blockly.getMainWorkspace().flyout_.show_all();
        $(".blocklyDraggable", $(".blocklyFlyout", $("#blockly").contents())).css('pointer-events', '')
    };

    Blockly.getMainWorkspace().flyout_.svgGroup_.onmouseleave = function () {
        Blockly.getMainWorkspace().flyout_.show_cutoff();
        $(".blocklyDraggable", $(".blocklyFlyout", $("#blockly").contents())).css('pointer-events', 'none')
    };

    q_defer.resolve();
};

/* XXX edbutler: was this suppossed to be changed? It currently loads a non-existent file, so I commented it out.
 document.write('<script type="text/javascript" src="generated/' +
 BlocklyApps.LANG + '.js"></script>\n');
 */

RuthefjordBlockly.makeShadowNum = function(num) {
    return '<shadow type="math_number"><field name="NUM">' + num + '</field></shadow>';
};

// list of custom block xml, in the order they should appear in the library
// block name, standard xml, locked xml, pack name
RuthefjordBlockly.Commands = {
    move2: { block: '<block type="Forward"><value name="VALUE">'+RuthefjordBlockly.makeShadowNum(1)+'</value></block><block type="Left"></block><block type="Right"></block>'},
    place: { block: '<block type="PlaceCube"></block>'},
    remove: { block: '<block type="RemoveCube"></block>', teaser: '<block type="RemoveCube_teaser"></block>', pack: 'remove'},
    up: { block: '<block type="Up"><value name="VALUE">'+RuthefjordBlockly.makeShadowNum(1)+'</value></block>', teaser: '<block type="Up_teaser"><value name="VALUE">'+RuthefjordBlockly.makeShadowNum(1)+'</value></block>', pack: 'up'},
    down: { block: '<block type="Down"><value name="VALUE">'+RuthefjordBlockly.makeShadowNum(1)+'</value></block>', teaser: '<block type="Down_teaser"><value name="VALUE">'+RuthefjordBlockly.makeShadowNum(1)+'</value></block>', pack: 'up'},
    repeat: { block: '<block type="controls_repeat"><value name="TIMES">'+RuthefjordBlockly.makeShadowNum(10)+'</value></block>',
        teaser: '<block type="controls_repeat_teaser"><value name="TIMES">'+RuthefjordBlockly.makeShadowNum(10)+'</value></block>', pack: 'repeat'},
    counting_loop: { block: '<block type="controls_for"><value name="COUNTER"><block type="variables_get" default="true"><field name="VAR">i</field></block></value>' +
        '<value name="FROM">' + RuthefjordBlockly.makeShadowNum(0) + '</value>' +
        '<value name="TO">' + RuthefjordBlockly.makeShadowNum(10) + '</value>' +
        '<value name="BY">' + RuthefjordBlockly.makeShadowNum(1) + '</value>' +
        '</block>'},
    defproc_noargs: { block: '<block type="procedures_noargs_defnoreturn"></block>', teaser: '<block type="procedures_defnoreturn_teaser"></block>', pack: 'procedures'},
    defproc: { block: '<block type="procedures_defnoreturn"></block>', teaser: '<block type="procedures_defnoreturn_teaser"></block>', pack: 'procedures'},
};

RuthefjordBlockly.CommandReplacements = {
    defproc_noargs:'defproc'
};

RuthefjordBlockly.AddonCommands = {};

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
    if (Blockly.dragMode_ === 0 && prog !== RuthefjordBlockly.curProgramStr) {
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

RuthefjordBlockly.proceduresOnly = function () {
    if (Blockly.dragMode_ === 0) { // don't clean while a block is still being dragged
        var topBlocks = Blockly.getMainWorkspace().getTopBlocks();
        _.forEach(topBlocks, function(block) {
            if (block.type.indexOf("procedures") !== 0) { // clear out blocks outside of procedures that aren't calls
                block.dispose();
            } else if (block.type === "procedures_callnoreturn") { // clear out blocks attached to calls that aren't other calls
                _.forEach(block.getDescendants(), function(child) {
                    if (child.type.indexOf("procedures") !== 0) {
                        child.dispose();
                    }
                })
            }
        });
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
    Blockly.mainWorkspace.getTopBlocks().map(function (b) { b.dispose(false, false, false, true); });
};

/**
 * set blocks making up current program
 */
RuthefjordBlockly.setProgram = function(program) {
    // console.info(program);

    RuthefjordBlockly.ignoreNextHistory = true;
    RuthefjordBlockly.clearProgram();

    RuthefjordBlockly.loadBlocks(Blockly.JSONLangOps.XMLOfJSON(program));

    var checkStmt = function(stmt) {
        var attr;
        if (stmt.meta) { attr = stmt.meta.attributes; }
        if (attr) {
            var block = Blockly.getMainWorkspace().getBlockById(stmt.meta.id);
            if (attr.FrozenBlocks) {
                var doFreezeArgs = Boolean(attr['FrozenArgs']);
                RuthefjordBlockly.freezeBody(block, doFreezeArgs);
                block.setMovable(true); // let only the top block move
            }
            if (attr.NoMove) {
                block.setMovable(false);
            }
            if (attr.NoDelete) {
                block.setDeletable(false);
            }
        }
        if (stmt.body) { // recursively process children (e.g. blocks inside a repeat)
            _.forEach(stmt.body, checkStmt);
        }
    };

    // HACK this isn't very robust but works for everything with have (for now)
    _.forEach(program.body, checkStmt);

    // update block colors
    _.forEach(Blockly.getMainWorkspace().getAllBlocks(), function (b) { b.updateColour(); });

    // update the toolbox in case the program contains any procedures
    RuthefjordBlockly.updateToolbox();

    RuthefjordBlockly.curProgramStr = RuthefjordBlockly.getXML();

    // set maximum blocks to 15 per function
    // Blockly.mainWorkspace.maxBlocks = Object.keys(program.procedures).length * 15;
};

/**
 * loads new program and takes care of related adjustments
 */
RuthefjordBlockly.loadBlocks = function (blocksXML) {
    // console.info(blocksXML);
    var xml = Blockly.Xml.textToDom(blocksXML);
    Blockly.Xml.domToWorkspace(Blockly.getMainWorkspace(), xml);

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
    var commands = _.extend({}, RuthefjordBlockly.Commands, RuthefjordBlockly.AddonCommands);
    // check for commands that should be eliminated due to presence of replacement command
    _.forEach(RuthefjordBlockly.CommandReplacements, function(replacement, obsolete) {
        if (_.includes(current_tools, replacement) || RUTHEFJORD_CONFIG.features.unlock_all) {
            delete commands[obsolete]; // if we have the replacement, we can get rid of its predecessor
        } else if (!_.has(current_tools, obsolete)) {
            delete commands[replacement]; // otherwise if we don't have the predecessor, hide the replacement until we do
        }
    });
    // assemble toolbox XML, adding in teaser blocks as appropriate
    _.forEach(commands, function(data, name) {
        if (_.includes(current_tools, name) || RUTHEFJORD_CONFIG.features.unlock_all) {
            toolXML += data.block;
        } else if (data.teaser && RuthefjordBlockly.isSandbox) {
            var pack = RuthefjordBlockly.game_info.packs[data.pack];
            if (pack) { // pack may have been hidden by config
                var allPrereqsDone = pack.prereq && pack.prereq.every(function (packName) {
                        return RuthefjordBlockly.progress.is_pack_completed(RuthefjordBlockly.game_info.packs[packName]);
                    });
                if (!pack.prereq || allPrereqsDone) {
                    toolXML += data.teaser;
                }
            }
        }
    });

    // add call for each defined procedure
    var procs = Blockly.Procedures.allProcedures(Blockly.getMainWorkspace())[0]; // returns [proceduresNoReturn, proceduresReturn]
    _.forEach(procs, function(proc) { // proc is [name, arguments, hasReturnValue]
        var name = proc[0];
        toolXML += '<block type="procedures_callnoreturn"><mutation name="' + name + '">';
        _.forEach(proc[1], function(arg) {
            toolXML += '<arg name="' + arg + '"></arg>'
        });
        toolXML += '</mutation></block>';
    });

    toolXML += '</xml>';
    // console.log(toolXML);
    Blockly.getMainWorkspace().updateToolbox(toolXML);

    // lock blocks as necessary
    _.forEach(Blockly.getMainWorkspace().flyout_.workspace_.getAllBlocks(), function(block) {
        if (block.locked) {
            block.setDisabled(true);
            block.setEditable(false);
            $(block.svgGroup_).on('click', function() {
                onRuthefjordEvent("onLockedToolboxClick", block);
            });
        }
    });

    // highlight blocks that should be used in the current puzzle
    if (RuthefjordBlockly.scene_info && RuthefjordBlockly.scene_info.tutorial && RuthefjordBlockly.scene_info.tutorial.highlighted) {
        Blockly.getMainWorkspace().flyout_.workspace_.getTopBlocks().forEach(function (b) {
            if (_.contains(RuthefjordBlockly.scene_info.tutorial.highlighted, b.type)) {
                b.addNewGlow();
            }
        });
    }
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
    current_tools = _.filter(current_tools, function(value) {
        return !_.contains(scene_info.library.restricted, value);
    });

    RuthefjordBlockly.scene_info = scene_info;

    RuthefjordBlockly.updateToolbox();

    // since the flyout starts cutoff, we need to make the flyout_.svgBackground_
    // the correct size with this call
    Blockly.getMainWorkspace().flyout_.show_cutoff();
};

/**
 * get json-ready version of current program
 */
RuthefjordBlockly.getProgram = function() {
    var topBlocks = Blockly.mainWorkspace.getTopBlocks(true);

    var procs = [];
    var other = [];

    // iterate over top-level blocks, putting all function/procedure definitions first and everything else second
    _.forEach(topBlocks, function(block) {
        if (block.getProcedureDef) {
            // prepend a symbol to avoid clashes with builtins
            var name = '$' + block.getFieldValue("NAME");
            var params = block.arguments_;
            var body = Blockly.JSONLangOps.processStructure(block);
            procs.push({type:"procedure", meta:{id:Number(block.id)}, name:name, params:params, body:body});
        } else {
            other = other.concat(Blockly.JSONLangOps.processStructure(block));
        }
    });
    return {
        meta: {
            language: 'imperative_v02',
            version: 2
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
    };
    Blockly.JSONLangOps[name] = function(block) {
        return {args:[],meta:{id:Number(block.id)},name:name,type:"execute"};
    };
    RuthefjordBlockly.AddonCommands[name] = {block: '<block type="'+name+'"></block>'};
};

return RuthefjordBlockly;
}());

