var onRuthefjordEvent = (function(){ "use strict";

var program_state = {
    run_state: null,
    edit_mode: null,
    last_program_sent: undefined
};

var questLogger;
var handler = {};
var isDevMode = false;
// the packs/puzzles sent up on game start
var game_info;

var current_puzzle_runner;

var world_data;

var current_scene = "title";
var win_msg;
var win_btn_msg;

// flag for when unity is rendering gallery thumbnails
var galleryRender = false; 

// flag and data for when code from a gallery item is added to the sandbox
var sandboxProgAddon = ""; 

var storage = (function() {
    var self = {};
    var base_url = RUTHEFJORD_CONFIG.game_server.url;
    var remote_data;

    self.initialize = function(cb) {
        if (RUTHEFJORD_CONFIG.are_logins) {
            var username = '';
            while (!username) {
                username = window.prompt("Please enter your username");
            }
            // try to grab all the user data
            $.get(base_url + 'player/' + username)
                .done(function(data) {
                    remote_data = data;
                    cb();
                })
                .fail(function(data) {
                    // on failure, make a new user
                    $.ajax(base_url + 'player', {
                        data: JSON.stringify({id:username}),
                        contentType: 'application/json',
                        type: 'POST'
                    })
                        .done(function(data) {
                            remote_data = data;
                            cb();
                        })
                        .fail(function(data) {
                            // if THIS fails, give up and turn off logins
                            console.log("creating a player failed D:")
                            cb();
                        });
                });

        } else {
            cb();
        }
    }

    self.save = function(key, value) {
        if (typeof key !== "string") throw new TypeError("keys must be strings!");
        if (value !== null && typeof value !== "string") throw new TypeError("can only save string values!");

        // only save if the current value is different or non-existent
        if (remote_data && remote_data[key] !== value) {
            var o = {};
            o[key] = value;

            $.ajax(base_url + 'player/' + remote_data.id, {
                data: JSON.stringify(o),
                contentType: 'application/json',
                type: 'PUT'
            });
            remote_data[key] = value;
        } else {
            sessionStorage.setItem(key, value);
        }
    }

    self.load = function(key, cb) {
        if (remote_data) {
            cb(remote_data[key]);
        } else {
            cb(sessionStorage.getItem(key));
        }
    }

    self.remove = function(key) {
        if (remote_data) {
            $.ajax(base_url + 'player/' + remote_data.id, {
                data: JSON.stringify({key:null}),
                contentType: 'application/json',
                type: 'PUT'
            });
            remote_data[key] = null;
        } else {
            sessionStorage.removeItem(key);
        }
    }

    return self;
}());

var content = (function() {
    var self = {};

    /** Returns a promise. */
    self.initialize = function() {
        game_info = {};

        var qm = Q($.get('content/packs.json'))
            .then(function(json) {
                game_info.packs = json;
            });

        var qs = Q($.get('content/puzzles.json'))
            .then(function(json) {
                game_info.puzzles = json;
                // HACK we want these objects to have id as a property instead of being a mysterious key mapping.
                _.each(json, function(val, key) {
                    val.id = key;
                });
            });

        return Q.all([qm, qs]);
    }

    self.puzzles = function() { return _.values(game_info.puzzles); }

    return self;
}());

var progress = (function(){
    var self = {};

    var puzzles_completed = [];

    self.initialize = function(cb) {
        // load the level progress from this session (if any)
        console.info('loading saved puzzles!');
        storage.load("puzzles_completed", function(x) {
            console.log(x);
            if (x) {
                puzzles_completed = x.split(',');
            }
            cb();
        });
    };

    self.mark_puzzle_completed = function(id, puzzle) {
        if (!_.contains(puzzles_completed, id)) {
            puzzles_completed.push(id);
            storage.save("puzzles_completed", puzzles_completed.toString());
        }
    }

    self.is_puzzle_completed = function(puzzle_id) {
        return isDevMode || _.contains(puzzles_completed, puzzle_id);
    }

    self.completed_puzzles = function() {
        return _.filter(content.puzzles(), function(p) { return self.is_puzzle_completed(p.id); });
    }

    self.is_pack_completed = function(pack) {
        return pack.nodes.every(self.is_puzzle_completed);
    }

    self.puzzles_remaining = function(pack) {
        return _.filter(pack.nodes, function(p) { return !self.is_puzzle_completed(p); }).length;
    }

    self.get_library = function() {
        var libs = _.map(self.completed_puzzles(), function(p) { return p.library.granted; });
        return _.unique(_.flatten(libs));
    }

    return self;
}());

/**
 * Starts a pack.
 * Returns an object with the function 'onPuzzleFinish' that should be called when puzzleCompleted is sent from unity.
 * @param pack A pack object (from game_info.packs).
 * @param sceneSelectType one of {"tutorial", "pack"}.
 * Controls whether you are shuttled through levels automatically or get the graph scene selctor.
 */
function create_puzzle_runner(pack, sceneSelectType) {
    var self = {};
    var tutorialCounter = 0;

    function onPackComplete() {
        console.error("TODO make this do something!");
    }

    function setState_puzzle(id, finish_msg) {
        current_scene = 'transition';
        var info = {id:id, puzzle:game_info.puzzles[id]};
        RuthefjordUI.State.goToPuzzle(function() {
            if (sceneSelectType === 'tutorial') {
                $('.hideTutorial').hide();
            }
            RuthefjordUnity.Call.request_start_puzzle(info);
        });
        win_btn_msg = finish_msg;
    }

    self.onPuzzleFinish = function() {
        switch (sceneSelectType) {
            case "pack":
                if (progress.puzzles_remaining(pack) > 0 || isDevMode) {
                    // bring up the level select
                    RuthefjordUI.State.goToSceneSelect(function() {
                        RuthefjordUI.LevelSelect.create(pack, game_info.puzzles, progress.is_puzzle_completed, function(pid) {
                            if (progress.puzzles_remaining(pack) === 1) {
                                setState_puzzle(pid, "Go to the sandbox");
                            } else {
                                setState_puzzle(pid, "Go to puzzle select");
                            }
                        });
                    });
                } else {
                    // pack has been completed, go to sandbox
                    setState_sandbox();
                }
                break;

            case "tutorial":
                if (tutorialCounter < pack.nodes.length) {
                    // progress through tutorial using tutorialCounter
                    var finishType = pack.nodes.length - tutorialCounter === 1 ? "Go to the sandbox" : "Go to next puzzle";
                    setState_puzzle(pack.nodes[tutorialCounter++], finishType);
                } else {
                    // tutorial has been completed, go to sandbox
                    setState_sandbox();
                }

                break;

            default:
                throw new Error("invalid scene select type " + sceneSelectType);
        }
    }

    // call onPuzzleComplete to trigger the first puzzle
    self.onPuzzleFinish();

    return self;
};

// callback function that receives messages from unity, sends to handler
function onRuthefjordEvent(func, arg) {
    if (func !== 'onProgramStateChange') {
        console.info('received Unity event ' + func);
    }
    handler[func](arg);
}

function setState_title() {
    RuthefjordUI.State.goToTitle(function(){});
}

function setState_intro() {
    var d = '<p>I\'m a Dragon who can build things out of cubes. I follow instructions written in <b>code</b>. Click anywhere to start learning <b>code</b>, so we can build things together!</p>' +
        '<button id="button_startTutorial">Get Started!</button>';

    RuthefjordUI.State.goToIntro(function(){
        RuthefjordUI.Instructions.show({
            summary: 'Welcome to Ruthefjord!',
            detail: d
        }, function() {
            current_puzzle_runner = create_puzzle_runner(game_info.packs["tutorial"], "tutorial");
        }, true);
        $('.notTitle').hide(); // hide instructions elements that aren't supposed to be on the title screen (e.g. click to hide button)
    });
}

function setState_sandbox() {
    current_scene = 'transition';
    RuthefjordUI.State.goToSandbox(function() {
        storage.load('sandbox_world_data', function(wd) {
            RuthefjordUnity.Call.request_start_sandbox(wd);
        });
    });
}

function onProgramEdit() {
    var p = JSON.stringify(RuthefjordBlockly.getProgram());

    if (p !== program_state.last_program_sent) {
        if (program_state.run_state === 'stopped') {
            RuthefjordUnity.Call.set_program(p);
            program_state.last_program_sent = p;
            clearHighlights();
        }
    }

    if (current_scene === 'sandbox') {
        var prog = RuthefjordBlockly.getXML();
        storage.save('sandbox_program', prog);
    }
}

// startup
$(function() {
    RuthefjordUI.State.goToLoading();

    function initialize_unity() {
        var d = Q.defer();
        handler.onSystemStart = function() {
            d.resolve();
        };
        // this doesn't return a promise, unity will get back to us via hander.onSystemStart
        RuthefjordUnity.Player.initialize();
        return d.promise;
    }

    function load_save_data() {
        var d = Q.defer();
        storage.initialize(function() { d.resolve(); });
        return d.promise;
    }

    // set up callbacks for transitions between application state
    ////////////////////////////////////////////////////////////////////////////////

    var devSelectPack = $('#dev-select-pack');
    devSelectPack.change(function() {
        var val = devSelectPack.val();
        // HACK assumes opening line starts with '-'
        if (val[0] !== '-') {
            current_puzzle_runner = create_puzzle_runner(game_info.packs[val], "pack");
        }
    });

    $('#btn-header-clear-sandbox').on('click', function() {
        storage.remove('sandbox_program');
        storage.remove('sandbox_world_data');
        // HACK if they're in the sandbox, just reload it to force a clear
        if (current_scene == 'sandbox') {
            setState_sandbox();
        }
    });

    $('#btn-header-sandbox').on('click', setState_sandbox);
    $('#btn-back-sandbox').on('click', setState_sandbox);

    $('#btn-back-selector-puzzle').on('click', function() { current_puzzle_runner.onPuzzleFinish(); });

    function goToPacks() {
        RuthefjordUI.State.goToPackSelect(function () {
            RuthefjordUI.PackSelect.create(_.filter(game_info.packs,
                function(m) {
                    return !progress.is_pack_completed(m);
                }),
                function(pack) {
                    current_puzzle_runner = create_puzzle_runner(pack, "pack");
                });
        });
    }

    $('#btn-packs').on('click', goToPacks);
    $('#btn-back-selector-pack').on('click', goToPacks);

    function goToGallery() {
        function sandboxCallback(item) {
            current_scene = 'transition';
            RuthefjordUI.State.goToSandbox(function() {
                storage.load('sandbox_world_data', function(wd) {
                    RuthefjordUnity.Call.request_start_sandbox(wd);
                });
                sandboxProgAddon = item.program;
            });
        }
        var site = fermata.json(RUTHEFJORD_CONFIG.game_server.url);
        site("uploaded_project").get(function (err, data, headers) {
            if (!err) {
                if (data.objects && data.objects.length > 0) {
                    RuthefjordUI.Gallery.create(data.objects, sandboxCallback);
                    galleryRender = true;
                } else {
                    RuthefjordUI.State.goToGallery(function () {}); // just go to empty gallery
                }
            } else {
                alert("The Gallery server is unavailable.");
            }
        });
    }

    $('#btn-gallery').on('click', goToGallery);

    $('#btn-back-gallery').on('click', function () {RuthefjordUI.State.goToGallery(function () {})});

    $('#btn-share').on('click', function () {
        RuthefjordUI.Share.create(setState_sandbox);
    });

    // initialize subsystems (mainly unity and logging)
    ////////////////////////////////////////////////////////////////////////////////

    var promise_all = Q.all([
        content.initialize(),
        load_save_data(),
        initialize_unity(),
        RuthefjordBlockly.init(),
    ]);

    // fetch the uid from the GET params and pass that to logging initializer
    var uid = $.url().param('uid');
    RuthefjordLogging.initialize(uid);

    // set up some of the callbacks for code editing UI
    ////////////////////////////////////////////////////////////////////////////////

    $('#btn-run').on('click', function() {
        var newRS = program_state.run_state !== 'stopped' ? 'stopped' : 'executing';
        if (questLogger) { questLogger.logDoProgramRunStateChange(newRS); }
        RuthefjordUnity.Call.set_program_state({run_state: newRS});

    });

    $('#btn-workshop').on('click', function() {
        var newEM = program_state.edit_mode === 'workshop' ? 'persistent' : 'workshop';
        if (questLogger) { questLogger.logDoEditModeChange(newEM); }
        RuthefjordUnity.Call.set_program_state({edit_mode: newEM});
    });

    $('#btn-pause').on('click', function() {
        var oldRS = program_state.run_state;
        if (oldRS === 'executing' || oldRS === 'paused') {
            var newRS = oldRS === 'executing' ? 'paused' : 'executing';
            if (questLogger) { questLogger.logDoProgramRunStateChange(newRS); }
            RuthefjordUnity.Call.set_program_state({run_state: newRS});
        }
    });

    $('#btn-step').on('click', function() {
        RuthefjordUnity.Call.next_interesting_step();
    });

    // camera
    $('#camera-zoom-in').click(function(){RuthefjordUnity.Call.control_camera('zoomin');});
    $('#camera-zoom-out').click(function(){RuthefjordUnity.Call.control_camera('zoomout');});
    $('#camera-rotate-left').click(function(){RuthefjordUnity.Call.control_camera('rotateleft');});
    $('#camera-rotate-right').click(function(){RuthefjordUnity.Call.control_camera('rotateright');});
    $('#camera-tilt-up').click(function(){RuthefjordUnity.Call.control_camera('tiltup');});
    $('#camera-tilt-down').click(function(){RuthefjordUnity.Call.control_camera('tiltdown');});

    // undo button
    // TODO shouldn't this be in blockly/ruthefjord.js?
    $('#btn-undo').on('click', RuthefjordBlockly.undo);

    RuthefjordUI.Instructions.hide();

    RuthefjordUI.SpeedSlider.initialize(RuthefjordUnity.Call.set_program_execution_speed);
    RuthefjordUI.TimeSlider.initialize(RuthefjordUnity.Call.set_program_execution_time);

    $("#btn-time-slider-back").on('click', function() { 
        RuthefjordUI.TimeSlider.value(RuthefjordUI.TimeSlider.value() - 0.01);
        RuthefjordUnity.Call.set_program_execution_time(RuthefjordUI.TimeSlider.value());
    });
    $("#btn-time-slider-forward").on('click', function() { 
        RuthefjordUI.TimeSlider.value(RuthefjordUI.TimeSlider.value() + 0.01);
        RuthefjordUnity.Call.set_program_execution_time(RuthefjordUI.TimeSlider.value());
    });

    $("#btn-code-entry").on('click', function() {
        RuthefjordUnity.Call.parse_concrete_program($("#code-entry-area").val());
    })

    $("#btn-done").on('click', function() {
        RuthefjordUnity.Call.set_program(JSON.stringify(RuthefjordBlockly.getProgram()));
        RuthefjordUnity.Call.set_program_execution_time(1);
        RuthefjordUnity.Call.submit_solution();
    });

    // HACK to avoid button text wrapping on smaller screens
    if ($(document).width() < 1350) {
        $("html").css("font-size", "10pt");
    }

    // wait for all systems to start up, then go!
    promise_all.done(function() {
        // HACK add blockly change listener for saving
        Blockly.addChangeListener(onProgramEdit);

        console.info('EVERYTHING IS READY!');

        // HACK this needs to wait for the packs to be loaded
        _.each(game_info.packs, function(pack, id) {
            devSelectPack.append('<option value="' + id + '">' + id + '</option>');
        });

        progress.initialize(function() {
            if (progress.is_pack_completed(game_info.packs["tutorial"])) {
                setState_sandbox();
            } else {
                // setState_title();
                RuthefjordUI.State.goToConsent();
                $("#btn-consent-continue").on('click', function() {
                    RuthefjordLogging.logStudentConsented($("#chkbox-consent")[0].checked);
                    setState_title();
                });
            }
        });
    });
});

// SPECIFIC HANDLER FUNCTIONS

handler.onTitleButtonClicked = function(button) {
    switch (button) {
        case 'tutorial':
            setState_intro();
            break;
        default:
            throw new Error('uknown title button ' + button);
            break;
    }
}

var PUZZLE_FORMAT_VERSION = 1;

function start_editor(info) {

    if (info.puzzle.version !== PUZZLE_FORMAT_VERSION) {
        console.error("Invalid puzzle info version '" + info.puzzle.version + "'!");
        return;
    }

    // reset program dirty bit so we always send the new program to unity
    program_state.last_program_sent = undefined;

    if (info.is_starting) {
        var library = {
            current: progress.get_library(),
            puzzle: _.union(info.puzzle.library.required, info.puzzle.library.granted)
        };
        library.all = _.union(library.current, library.puzzle);

        var goals = info.puzzle.goals ? info.puzzle.goals : [];

        RuthefjordBlockly.setLevel(info.puzzle, library);
        RuthefjordUI.SpeedSlider.setVisible(_.contains(library.all, 'speed_slider'));
        RuthefjordUI.TimeSlider.setVisible(_.contains(library.all, 'time_slider'));
        RuthefjordUI.CameraControls.setVisible(library.all);
        RuthefjordUI.CubeCounter.setVisible(goals.some(function(g) { return g.type === "cube_count";}));
        RuthefjordUI.DoneButton.setVisible(goals.some(function(g) { return g.type === "submit";}));

        RuthefjordBlockly.history = [];

        // reset program execution speed, because the scene reload will have made Unity forget
        // FIXME use the unified API
        if (info.puzzle.name !== "101 Cubes") { // HACK to allow 101 Cubes to have a faster default execution speed
            RuthefjordUnity.Call.set_program_execution_speed(RuthefjordUI.SpeedSlider.value());
        }

        // clear old quest logger if it exists
        if (questLogger) {
            questLogger.logQuestEnd();
            questLogger = null;
        }
        // then start new quest logger if this is not an empty level
        questLogger = RuthefjordLogging.startQuest(info.puzzle.logging_id, info.checksum);

        // clear any existing addon blocks in the toolbox (so they don't get duplicated)
        RuthefjordBlockly.AddonCommands = [];
        if (info.puzzle.library.autoimports) {
            _.each(info.puzzle.library.autoimports, function(module) {
                _.each(JSON.parse(module.value).body, function(statement) {
                    if (statement.type === "proc") {
                        RuthefjordBlockly.generateBlock(statement.name, statement.name, statement.params)
                    }
                });
            });
            // get the imported blocks to show up in the toolbox
            RuthefjordBlockly.updateToolbox();
        }

        if (info.puzzle.program) {
            switch (info.puzzle.program.type) {
                case "json":
                    var program = JSON.parse(info.puzzle.program.value);
                    RuthefjordBlockly.setProgram(program);
                    break;
                case "xml":
                    RuthefjordBlockly.clearProgram();
                    if (info.puzzle.program.value) {
                        RuthefjordBlockly.loadBlocks(info.puzzle.program.value);
                    }
                    break;
                default:
                    console.error("Unknown program type '" + info.puzzle.program.type + "'!");
                    break;
            }
        } else {
            RuthefjordBlockly.clearProgram();
        }

        if (info.puzzle.winmsg) {
            win_msg = info.puzzle.winmsg;
        } else {
            win_msg = "Yay, you win!"
        }
    }

    RuthefjordUI.Instructions.show(info.puzzle.instructions, null, true);
}

// TODO remove duplicate code from this an onPuzzleChange
handler.onSandboxStart = function() {
    current_scene = "sandbox";

    storage.load('sandbox_program', function(sandbox_program) {
        var info = {
            checksum: 0,
            is_starting: true,
            puzzle: {
                version: PUZZLE_FORMAT_VERSION,
                logging_id: 11,
                library: {required:[],granted:[]},
                program: {type: 'xml', value: sandbox_program},
                instructions: {
                    summary: "Have fun and build stuff! Click {learn} to start unlocking new abilities.",
                    detail:
                        "Any cubes you place will stick around <b>permanently</b>. " +
                        "Click on {workshop} to make it so you can test code without cubes sticking around. " +
                        "You can also clear away all of your code and cubes by clicking {clear}."
                }
            }
        };

        start_editor(info);
    });

    if (sandboxProgAddon) {
        RuthefjordBlockly.loadBlocks(Blockly.UnityJSON.XMLOfJSON(JSON.parse(sandboxProgAddon)));
        sandboxProgAddon = "";
    }

    // display the concrete syntax entry in dev mode
    if (isDevMode) {
        $('.devModeOnly').show();
    }
}

handler.onPuzzleChange = function(json) {
    console.log('starting puzzle ' + json);
    current_scene = "puzzle";
    start_editor(JSON.parse(json));
};

function clearBlocklyClass (className) {
    var highlights = $('.' + className, $("#blockly").contents());
    for (var i = 0; i < highlights.length; i++) { // need to handle each element separately to avoid applying classes from first element to every element
        highlights.slice(i,i+1).attr('class', highlights.slice(i,i+1).attr('class').replace(" "+className, ""));
    };
}

function clearHighlights () {
    clearBlocklyClass("blocklyHighlighted");
    clearBlocklyClass("primaryHighlight");
    clearBlocklyClass("blocklyDebugHighlight");
}

handler.onProgramStateChange = function(data) {
    var json = JSON.parse(data);

    if ('edit_mode' in json) {
        console.log('on edit mode change');
        var em = json.edit_mode;
        program_state.edit_mode = em;
        RuthefjordUI.ModeButton.update(em === 'workshop');
        RuthefjordUI.TimeSlider.setEnabled(em === 'workshop');
        if (questLogger) { questLogger.logOnEditModeChanged(json.edit_mode); }
    }

    if ('run_state' in json) {
        var rs = json.run_state;
        console.log('on run state change: ' + rs);
        program_state.run_state = rs;
        RuthefjordUI.StepButton.update(rs === 'paused' && rs !== 'finished');
        RuthefjordUI.PauseButton.update(rs !== 'stopped' && rs !== 'finished', rs === 'paused');
        RuthefjordUI.RunButton.update(rs !== 'stopped', program_state.edit_mode === 'workshop');

        if (questLogger) { questLogger.logOnProgramRunStateChanged(rs, JSON.stringify(RuthefjordBlockly.getProgram())); }

        if (rs === 'stopped' && current_scene === 'sandbox') {
            RuthefjordUnity.Call.request_world_state();
        }

        // flush program edits on stop
        if (rs === 'stopped') {
            onProgramEdit();
        }
    }

    // clear current highlights when not paused or currently unpausing
    var highlights = $(".blocklyHighlighted", $("#blockly").contents());
    if (program_state.run_state !== 'paused' && json.run_state !== 'executing') {
        clearHighlights();
    }

    if ('current_state' in json) {
        var s = json.current_state;

        // highlight current block

        if (program_state.run_state === 'executing' && !Blockly.mainWorkspace.dragMode) {
            if (s.current_code_elements.length > 0) {
                var callStackIndex = 1;
                // add new highlights for currently executing block and all surrounding blocks
                var block = Blockly.mainWorkspace.getBlockById(s.current_code_elements[0].toString());
                block.svg_.addHighlight(true);
                while(block.getSurroundParent()) {
                    block.getSurroundParent().svg_.addHighlight();
                    if (block.getSurroundParent().type === "procedures_defnoreturn") {
                        // add highlight to the function call that we're in
                        block = Blockly.mainWorkspace.getBlockById(s.current_code_elements[callStackIndex++].toString());
                        block.svg_.addHighlight();
                    } else {
                        block = block.getSurroundParent();
                    }
                }
            } else {
                // clear final highlights 
                clearHighlights();
            }
        }

        // set time slider position

        RuthefjordUI.TimeSlider.value(parseFloat(s.execution_progress));
    }
}

handler.onStepHighlight = function(id) {
    // clear any existing highlights
    clearHighlights();
    // apply new highlight
    var block = Blockly.mainWorkspace.getBlockById(id.toString());
    if (block) {
        block.svg_.addHighlight(true);
    }
}

handler.onDebugHighlight = function(id) {
    // clear any existing highlights
    clearBlocklyClass("blocklyDebugHighlight");
    // apply new highlight
    var block = Blockly.mainWorkspace.getBlockById(id.toString());
    if (block) {
        Blockly.addClass_(block.svg_.svgGroup_, "blocklyDebugHighlight");
        block.svg_.svgGroup_.parentNode.appendChild(block.svg_.svgGroup_);
    }
}

handler.onSetColors = function(json) {
    console.info('on set colors!');
    var colors = JSON.parse(json);
    Blockly.FieldColour.COLOURS = colors;
    Blockly.FieldColour.COLUMNS = Math.min(colors.length, 8);
};

// sent the moment they "win" a puzzle
handler.onPuzzleComplete = function(puzzle_id) {
    progress.mark_puzzle_completed(puzzle_id, game_info.puzzles[puzzle_id]);
    if (questLogger) { questLogger.logOnPuzzledCompleted(); }
    RuthefjordUI.WinMessage.show(win_msg, win_btn_msg, function() { handler.onPuzzleFinish(puzzle_id); });
    var cheer = new Audio("media/cheer_3.mp3");
    cheer.play();
};

// sent when they exit a puzzle
handler.onPuzzleFinish = function(puzzle_id) {
    current_puzzle_runner.onPuzzleFinish();

    if (questLogger) {
        questLogger.logQuestEnd();
        questLogger = null;
    }
};

handler.onWorldDataStart = function() {
    world_data = "";
}

handler.onWorldDataChunkSend = function(chunk) {
    world_data += chunk;
}

handler.onWorldDataEnd = function() {
    console.info(world_data);
    storage.save('sandbox_world_data', world_data);
}

handler.onUnlockDevMode = function() {
    isDevMode = true;
    Blockly.mainWorkspace.maxBlocks = 5000;
};

handler.onCubeCount = function(count) {
    RuthefjordUI.CubeCounter.update(count);
}

handler.onRenderFinal = function(data) {
    var json = JSON.parse(data);
    document.getElementById(json.id).src = "data:image/png;base64," + json.src;
    if (galleryRender) {
        RuthefjordUI.Gallery.thumbsToRender.splice(RuthefjordUI.Gallery.thumbsToRender.indexOf(json.id), 1);
        if (RuthefjordUI.Gallery.thumbsToRender.length == 0) {
            RuthefjordUI.State.goToGallery(function () {});
            galleryRender = false;
        }
    } else {
        RuthefjordUI.State.goToShare(function () {});
    }
}

handler.onProgramParse = function(prog) {
    RuthefjordUnity.Call.set_program(prog);
    var program = JSON.parse(prog);
    RuthefjordBlockly.setProgram(program);
}

handler.onToSandbox = function() {
    setState_sandbox();
}

handler.onErrorMessages = function(errors) {
    console.log(errors);
    RuthefjordUI.Instructions.displayErrors(JSON.parse(errors));
}

return onRuthefjordEvent;
}());

function devmode() {
    onRuthefjordEvent('onUnlockDevMode');
}

function toSandbox() {
    onRuthefjordEvent('onToSandbox')
}
