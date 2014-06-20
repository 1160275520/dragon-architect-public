var onHackcraftEvent = (function(){ "use strict";

var possible_stages;
var program;
var unityObject;
var is_running = false;
var questLogger;
var handler = {};

// GENERIC UNITY API SETUP AND MARSHALLING

// send a message to unity
function send_message(object, method, arg) {
    unityObject.getUnity().SendMessage(object, method, arg);
}

// callback function that receives messages from unity, sends to handler
function onHackcraftEvent(func, arg) {
    handler[func](arg);
}


var unityPlayer = function(){
    var self = {};

    // TODO have these return correct values even when the thing isn't visible

    self.width = function() {
        return $('#unityPlayer embed').width();
    }

    self.height = function() {
        return $('#unityPlayer embed').height();
    }

    self.initialize = function() {
        var div = $("#unityPlayer");

        // XXX TODO disable dynamic sizing for now until we clean up positioning
        //var dim = Math.min(768, window.innerHeight - 160);
        var config = {
            //width: '100%',
            //height: '100%',
            params: { enableDebugging:"0" }
        };

        unityObject = new UnityObject2(config);
        unityObject.initPlugin(div[0], "hackcraft/hackcraft.unity3d");

        /*
        $(window).resize(function(arg1, arg2) {
            console.log('foo');
            div.width(div.parent().width());
        });
        */
    }

    // HACK TODO oh god come up with something better than this that works to hide/show the player T_T

    var oldUnityWidth, oldUnityHeight;

    self.hide = function() {
        /*
        var u = $('#unityPlayer embed, #unityPlayer');
        if (!oldUnityWidth) {
            oldUnityHeight = self.height();
            oldUnityWidth = self.width();
        }
        u.width(1).height(1);
        */
    }

    self.show = function() {
        /*
        if (oldUnityWidth) {
            var u = $('#unityPlayer embed, #unityPlayer');
            //u.width(oldUnityWidth).height(oldUnityHeight);
            oldUnityWidth = null;
            oldUnityHeight = null;
        }
        */
    }

    return self;
}();

function hideAll() {
    unityPlayer.hide();
    $('.codeEditor, .puzzleModeUI, .creativeModeUI, .levelSelector, .titleScreen, .galleryUI').hide();
}

function setState_title() {
    hideAll();
    $('.titleScreen').show();
}

function setState_levelSelect() {
    hideAll();

    // check if level selector is initialized, and initialize if not
    if ($('levelList li').length === 0 && possible_stages) {
        var list = $('#levelList');
        _.each(possible_stages, function(item) {
            var button = $('<li><button>' + item + '</button></li>').appendTo(list);
            button.on('click', function() { setState_puzzle(item); });
        });
    } else if (!possible_stages) {
        console.warn("level selector visited without initialized possible level list!");
    }

    $('.levelSelector').show();
}

function setState_puzzle(puzzleId) {
    console.info('starting puzzle ' + puzzleId);
    hideAll();
    $('.codeEditor, .puzzleModeUI').show();
    unityPlayer.show();
    set_stage(puzzleId);
}

// startup
$(function() {

    // set up callbacks for transitions between application state
    ////////////////////////////////////////////////////////////////////////////////

    $('#button_title_to_levelSelect').on('click', setState_levelSelect);
    $('#button_levelSelect_to_title').on('click', setState_title);

    // initialize subsystems (mainly unity and logging)
    ////////////////////////////////////////////////////////////////////////////////

    unityPlayer.initialize();
    //$('.mainLeftSide').css('width', unityPlayer.width() + 'px');
    //$('.mainRightSide').css('margin-left', unityPlayer.width() + 'px');
    Hackcraft.init();
    HackcraftLogging.initialize();

    // set up some of the callbacks for code editing UI
    ////////////////////////////////////////////////////////////////////////////////

    $('#btn-run').on('click', function() {
        var program = Hackcraft.getProgram();
        set_program(program);
        is_running = !is_running;
        set_is_running(is_running);
        Blockly.mainWorkspace.traceOn(is_running);
        if (questLogger) {
            if (is_running) {
                questLogger.logProgramExecutionStarted(JSON.stringify(program));
            } else {
                questLogger.logProgramExecutionReset();
            }
        }
    });
    $('#instructions')[0].style.visibility = "hidden";

    // run button
    $('#btn-run').on('click', function () {
        var b = $('#btn-run')[0];
        if (b.innerText === "Run!") {
            b.innerText = "Reset";
            b.style.backgroundColor = "#B03737";
        } else {
            b.innerText = "Run!";
            b.style.backgroundColor = "#37B03F";
        }
    });

    // undo button
    $('#btn-undo').on('click', Hackcraft.undo);

    $( "#slider" ).slider({
        value:0.5,
        min: 0.0,
        max: 1.0,
        step: 0.05,
        slide: function( event, ui ) {
            send_message("System", "EAPI_SetDelayPerCommand", (1 - ui.value).toString());
        }
    });
});

// SPECIFIC HANDLER FUNCTIONS

function set_program(prog) {
    var s = JSON.stringify(prog)
    console.info(s);
    send_message("System", "EAPI_SetProgramFromJson", s);
}

function set_stage(stage_id) {
    send_message("Global", "EAPI_SetStage", stage_id);
}

function set_is_running(is_running) {
    send_message("System", "EAPI_SetIsRunning", is_running ? "true" : "false");
}

handler.onSystemStart = function(json) {
    possible_stages = JSON.parse(json);
    //setState_title();
    setState_puzzle(possible_stages[5]);
}

handler.onProgramChange = function(json) {
    //console.log(json);
    program = JSON.parse(json);
    Hackcraft.setProgram(program);
}

handler.onLevelChange = function(json) {
    console.log(json);
    var levelInfo = JSON.parse(json);

    Hackcraft.setLevel(levelInfo);
    Hackcraft.history = new Array();
    // reset run button
    var b = $('#btn-run')[0];
    var slider = $('#sliderContainer')[0];
    if (jQuery.isEmptyObject(levelInfo)) {
        b.hidden = true;
        slider.style.visibility = "hidden";
    } else {
        b.hidden = false;
        b.innerText = "Run!";
        b.style.backgroundColor = "#37B03F";
        var rect = $('#unityPlayer>embed')[0].getBoundingClientRect();
        var selfRect = b.getBoundingClientRect();
        b.style.left = (rect.right - selfRect.width - 2) + 'px'; // 2 to account for padding, etc.
        b.style.top = (rect.bottom + 2) + 'px';
        // b.style.width = rect.width + 'px';
        // b.style.left = rect.left + 'px';
        // var toolBlocks = Blockly.mainWorkspace.flyout_.workspace_.topBlocks_;
        // var lastTool = toolBlocks[toolBlocks.length - 1];
        // rect = lastTool.svg_.svgGroup_.getBoundingClientRect();
        // b.style.top = (rect.bottom + 25) + 'px';
        slider.style.visibility = "visible";
        var selfRect = slider.getBoundingClientRect();
        slider.style.top = (rect.bottom + 2) + 'px';
    }
    is_running = false;

    // clear old quest logger if it exists
    if (questLogger) {
        questLogger.logQuestEnd();
        questLogger = null;
    }
    // then start new quest logger if this is not an empty level
    if (levelInfo.hasOwnProperty('qid')) {
        questLogger = HackcraftLogging.startQuest(levelInfo.qid);
    }
}

handler.onStatementHighlight = function(id) {
    //console.log("highlighting " + id)
    // XXX edbutler are these conditional bodies supposed to be different...?
    if (id) {
        Blockly.mainWorkspace.highlightBlock(id.toString());
    } else {
        Blockly.mainWorkspace.highlightBlock(id.toString());
    }
}

handler.onInstructionsChange = function(msg) {
    Hackcraft.setInstructions(msg);
}

handler.onSetColors = function(json) {
    var colors = JSON.parse(json);
    Blockly.FieldColour.COLOURS = colors;
    Blockly.FieldColour.COLUMNS = Math.min(colors.length, 7);
}

return onHackcraftEvent;
}());
