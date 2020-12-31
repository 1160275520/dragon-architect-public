var onRuthefjordEvent = (function(){ "use strict";

var handler = {};
var isDevMode = false;
// the packs/puzzles sent up on game start
var game_info;

var current_puzzle_runner;

var world_data;

var current_scene = "title";
var win_msg;
var win_btn_msg;

var dont_expand_instructions = false;

// flag and data for when code from a gallery item is added to the sandbox
var sandboxProgAddon = "";

var levelListeners = [];

function send_json_get_request(url) {
    return fetch(url, {
        method: 'get',
    }).then(function(response) {
        if (response.status === 200) {
            return response.json();
        } else {
            throw new Error(response.status + ' ' + response.statusText);
        }
    });
}

function send_json_put_request(url, params) {
    return fetch(url, {
        method: 'put',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    }).then(function(response) {
        if (response.status === 200) {
            return response.json();
        } else {
            throw new Error(response.status + ' ' + response.statusText);
        }
    });
}

var Storage = (function() {
    var mdl = {};
    var base_url = RUTHEFJORD_CONFIG.server.url;
    // if we find something lower than this, it's old data, just delete it!
    var STORAGE_VERSION = "1";

    var ServerStorage = function(userid) {
        var self = {};
        var remote_data;

        self.initialize = function() {
            return send_json_get_request(base_url + '/get_player/' + userid)
                .then(function(data) {
                    remote_data = data;
                }, function(error) {
                    console.error('Failed to create player data!');
                });
        };

        self.getItem = function(key) {
            return remote_data[key];
        };

        self.setItem = function(key, value) {
            var o = {};
            o[key] = value;
            send_json_put_request(base_url + '/player/' + remote_data.id, o);
            remote_data[key] = value;
        };

        self.removeItem = function (key) {
            var o = {};
            o[key] = null;
            send_json_put_request(base_url + '/player/' + remote_data.id, o);
            remote_data[key] = null;
        };

        self.clear = function () {
            for (var key in remote_data) {
                if (key !== 'id') {
                    self.removeItem(key);
                }
            }
        };

        return self;
    };

    var storageImpl;

    mdl.id = function() {
        return storageImpl.getItem('id');
    };

    mdl.initialize = function(userid, cb) {
        var isLocal = false;
        switch (RUTHEFJORD_CONFIG.server.storage) {
            case 'server':
                storageImpl = ServerStorage(userid);
                break;
            case 'local':
                storageImpl = window.localStorage;
                isLocal = true;
                break;
            case 'session':
                storageImpl = window.sessionStorage;
                isLocal = true;
                break;
            default: throw 'invalid storage type!';
        }

        // for local/session storage, check the version number and discard if necessary
        if (isLocal) {
            if (!storageImpl.getItem('version') || storageImpl.getItem('version') !== STORAGE_VERSION) {
                console.warn("Stored data is for an older version of the game! Deleting...");
                storageImpl.clear();
            }
            storageImpl.setItem('version', STORAGE_VERSION);
            cb();
        } else {
            storageImpl.initialize().then(function(){cb();});
        }
    };

    mdl.clear = function() {
        storageImpl.clear();
    };

    mdl.save = function(key, value) {
        if (typeof key !== "string") throw new TypeError("keys must be strings!");
        if (value !== null && typeof value !== "string") throw new TypeError("can only save string values!");
        //console.info("saving " + value + " at " + key);
        storageImpl.setItem(key, value);
    };

    mdl.load = function(key, cb) {
        //console.info("loading " + storageImpl.getItem(key) + " from " + key);
        cb(storageImpl.getItem(key));
    };

    mdl.remove = function(key) {
        storageImpl.removeItem(key);
    };

    return mdl;
}());

var content = (function() {
    var self = {};

    /** Returns a promise. */
    self.initialize = function() {
        game_info = {};

        var qm = Q($.get('content/packs.json'))
            .then(function(json) {
                game_info.packs = json;
                console.log(game_info.packs)
            });

        var qs = Q($.get('content/puzzles.json'))
            .then(function(json) {
                game_info.puzzles = json;
                // HACK we want these objects to have id as a property instead of being a mysterious key mapping.
                _.forEach(json, function(val, key) {
                    val.id = key;
                });
            });

        return Q.all([qm, qs]);
    };

    self.puzzles = function() { return _.values(game_info.puzzles); }

    return self;
}());

var progress = (function(){
    var self = {};

    var puzzles_completed = [];

    self.initialize = function(cb) {
        console.info('initializing progress!');
        // load the level progress from this session (if any)
        // console.info('loading saved puzzles!');
        Storage.load("puzzles_completed", function(x) {
            // console.log(x);
            if (x) {
                puzzles_completed = x.split(',');
            }
            cb();
        });
    };

    self.mark_puzzle_completed = function(id, puzzle) {
        if (!_.includes(puzzles_completed, id)) {
            puzzles_completed.push(id);
            Storage.save("puzzles_completed", puzzles_completed.toString());
        }
    };

    self.is_puzzle_completed = function(puzzle_id) {
        return isDevMode || _.includes(puzzles_completed, puzzle_id);
    };

    self.completed_puzzles = function() {
        return _.filter(content.puzzles(), function(p) { return self.is_puzzle_completed(p.id); });
    };

    self.is_pack_completed = function(pack) {
        return pack.nodes.every(self.is_puzzle_completed);
    };

    self.puzzles_remaining = function(pack) {
        return _.filter(pack.nodes, function(p) { return !self.is_puzzle_completed(p); }).length;
    };

    self.get_library = function() {
        var libs = _.map(self.completed_puzzles(), function(p) { return p.library.granted; });
        return _.uniq(_.flatten(libs));
    };

    return self;
}());

/**
 * Starts a pack.
 * Returns an object with the function 'onPuzzleFinish' that should be called when puzzleCompleted is sent from unity.
 * @param pack A pack object (from game_info.packs).
 * @param sceneSelectType one of {"tutorial", "pack"}.
 * Controls whether you are shuttled through levels automatically or get the graph scene selctor.
 */
function create_puzzle_runner(game_info, pack, sceneSelectType) {
    var self = {};
    var tutorialCounter = 0;

    function onPackComplete() {
        // console.error("TODO make this do something!");
        console.log("complete this pack! reload level map")
        _.forEach(game_info.packs, function(pack, id) {
            // if (pack.prereq==undefined || pack.prereq.every(function (packName) { return progress.is_pack_completed(packs[packName]); })){
            if (true) { // TODO check if pack should be added to the menu
                let item = $('<li>' + id + '</li>');
                item.click(function () {
                    current_puzzle_runner = create_puzzle_runner(game_info, pack, "pack");
                })
                $('#list-select-pack').append(item);}
        });
        setState_packs();
    }

    function setState_puzzle(id, finish_msg) {
        current_scene = 'transition';
        RuthefjordBlockly.isSandbox = false;
        var info = {id:id, puzzle:game_info.puzzles[id]};
        RuthefjordUI.State.goToPuzzle(function() {
            if (sceneSelectType === 'tutorial') {
                $('.hideTutorial').hide();
            }
            RuthefjordPuzzle.request_start_puzzle(info);
        });
        win_btn_msg = finish_msg;
    }

    self.onPuzzleFinish = function(first) { // first flag needed for jump to pack menu to work for completed packs
        switch (sceneSelectType) {
            case "pack":
                var packSelectCB = function (){};
                // adjust the instructions depending on if the pack is complete
                if (RUTHEFJORD_CONFIG.features.puzzles_only) {
                    console.log("pack case puzzle only")
                    if (progress.puzzles_remaining(pack) > 0 || first) {
                        console.log(pack);
                        $("#selector-puzzle-instructions").html('Play the levels below to unlock new abilities.');
                    } else {
                        setState_packs();
                        break;
                    }
                } else {
                    console.log("pack case not puzzle only")
                    if (progress.puzzles_remaining(pack) > 0 || first) {
                        $("#selector-puzzle-instructions").html('Play the levels below to unlock new abilities');
                    } else {
                        // setState_sandbox();
                        onPackComplete();
                        break;
                    }
                }
                // bring up the level select
                RuthefjordUI.State.goToSceneSelect(function() {
                    RuthefjordUI.LevelSelect.create(pack, game_info.puzzles, progress.is_puzzle_completed, function(pid) {
                            setState_puzzle(pid, progress.puzzles_remaining(pack) > 1 ? "Go to puzzle select" : "Go to sandbox");
                    });
                });
                packSelectCB();
                break;

            case "tutorial":
                if (RUTHEFJORD_CONFIG.features.puzzles_only) {
                    console.log("tutorial case puzzle only")
                    if (tutorialCounter < pack.nodes.length) {
                        // progress through tutorial using tutorialCounter
                        var finishType = "Go to next puzzle";
                        setState_puzzle(pack.nodes[tutorialCounter++], finishType);
                    } else {
                        // tutorial has been completed, bring up the pack select
                        setState_packs();
                    }
                } else {
                    console.log("tutorial case not puzzle only")
                    if (tutorialCounter < pack.nodes.length) {
                        // progress through tutorial using tutorialCounter
                        var finishType = pack.nodes.length - tutorialCounter === 1 ? "Go to the next level" : "Go to next puzzle";
                        setState_puzzle(pack.nodes[tutorialCounter++], finishType);
                    } else {
                        // tutorial has been completed, go to sandbox
                        // setState_sandbox();
                        onPackComplete();
                    }
                }
                break;

            default:
                throw new Error("invalid scene select type " + sceneSelectType);
        }
    };

    // call onPuzzleComplete to trigger the first puzzle
    self.onPuzzleFinish(true);

    return self;
}

// callback function that receives messages from unity, sends to handler
function onRuthefjordEvent(func, arg) {
    if (func !== 'onProgramStateChange') {
        // console.info('received Unity event ' + func);
    }
    handler[func](arg);
}

// NOTE: not currently used
function setState_title() {
    RuthefjordUI.State.goToTitle(function(){});
}

// NOTE: not currently used
function setState_intro() {
    var d = '<p>I\'m a Dragon who can build things out of cubes. I follow instructions written in <b>code</b>. Click anywhere to start learning <b>code</b>, so we can build things together!</p>' +
        '<button id="button_startTutorial">Get Started!</button>';

    RuthefjordUI.State.goToIntro(function(){
        RuthefjordUI.Instructions.show({
            summary: 'Welcome to Dragon Architect!',
            detail: d
        }, function() {
            current_puzzle_runner = create_puzzle_runner(game_info, game_info.packs["move dragon"], "tutorial");
        }, true);
        $('.notTitle').hide(); // hide instructions elements that aren't supposed to be on the title screen (e.g. click to hide button)
    });
}

function setState_sandbox() {
    current_scene = 'transition';
    RuthefjordBlockly.isSandbox = true;
    RuthefjordUI.State.goToSandbox(function() {
        Storage.load('sandbox_world_data', function(wd) {
            RuthefjordWorldState.setFromSave(wd);
            onRuthefjordEvent("onSandboxStart");
        });
    });
}

function setState_packs() {
    RuthefjordUI.State.goToPackSelect(function () {
        RuthefjordUI.PackSelect.create(game_info.packs,
            progress,
            function(pack) {
                current_puzzle_runner = create_puzzle_runner(game_info,pack, "pack");
            });
    });
}

function onProgramEdit() {
    if (RuthefjordManager.Simulator.run_state === RuthefjordManager.RunState.executing) {
        RuthefjordManager.Simulator.set_run_state(RuthefjordManager.RunState.stopped);
    }
    clearHighlights();

    if (current_scene === 'sandbox') {
        var prog = RuthefjordBlockly.getXML();
        Storage.save('sandbox_program', prog);
    }
}

// startup
$(function() {
    RuthefjordUI.confirmBackspaceNavigations();
    RuthefjordUI.State.goToLoading();

    // hide this message, will re-show if loading takes too long
    $('#msg-not-loading').hide();

    function load_save_data(userid) {
        var d = Q.defer();
        Storage.initialize(userid, function() { d.resolve(); });
        return d.promise;
    }

    function fetch_experimental_condition(userid) {
        var d = Q.defer();
        function assign_condition(cond) {
            console.info("got condition " + cond);
            // copy the experimental condition info the config object
            _.extend(RUTHEFJORD_CONFIG.features, RUTHEFJORD_CONFIG.feature_conditions[cond]);
            // RuthefjordLogging.logExperimentalCondition(RUTHEFJORD_CONFIG.experiment.id, cond);
            if (RUTHEFJORD_CONFIG.experiment.condition_in_storage) {
                Storage.save("experimental_condition", String(cond));
            }
            d.resolve();
        }

        if (RUTHEFJORD_CONFIG.experiment) {
            Storage.load("experimental_condition", function (cond) {
                // if (cond === null) {
                //     console.info("querying database for experimental condition");
                //     RuthefjordLogging.telemetry_client.query_experimental_condition({
                //         user: userid,
                //         experiment: RUTHEFJORD_CONFIG.experiment.id
                //     }).then(assign_condition);
                // } else {
                console.info("using experimental condition from " + RUTHEFJORD_CONFIG.server.storage);
                assign_condition(Number(cond));
                // }
            });
        } else {
            d.resolve();
        }

        return d.promise;
    }

    function initializeUi() {
        // set up callbacks for transitions between application state
        ////////////////////////////////////////////////////////////////////////////////

        var devSelectPack = $('#dev-select-pack');
        devSelectPack.change(function() {
            var val = devSelectPack.val();
            // HACK assumes opening line starts with '-'
            if (val[0] !== '-') {
                current_puzzle_runner = create_puzzle_runner(game_info, game_info.packs[val], "pack");
            }
        });

        $('#btn-clear-save-data').on('click', function() {
            Storage.clear();
        });

        $('#btn-header-clear-sandbox').on('click', function() {
            Storage.remove('sandbox_program');
            Storage.remove('sandbox_world_data');
            // HACK if they're in the sandbox, just reload it to force a clear
            if (current_scene == 'sandbox') {
                setState_sandbox();
            }
        });

        $('#btn-header-sandbox').on('click', setState_sandbox);
        $('#btn-back-sandbox').on('click', function() { dont_expand_instructions = true; setState_sandbox(); });

        $('#btn-back-selector-puzzle').on('click', function() { current_puzzle_runner.onPuzzleFinish(); });



        $('#btn-packs').on('click', setState_packs);
        $('#btn-back-selector-pack').on('click', setState_packs);

        function goToGallery() {
            function sandboxCallback(item) {
                current_scene = 'transition';
                dont_expand_instructions = true;
                RuthefjordUI.State.goToSandbox(function() {
                    sandboxProgAddon = item.program;
                    Storage.load('sandbox_world_data', function(wd) {
                        RuthefjordWorldState.setFromSave(wd);
                        onRuthefjordEvent("onSandboxStart");
                    });
                });
            }

            send_json_get_request(RUTHEFJORD_CONFIG.server.url + "/get_gallery/" + RUTHEFJORD_CONFIG.gallery.group)
            .then(function (data) {
                if (data.projects) {
                    RuthefjordUI.Gallery.create(data.projects, sandboxCallback);
                }
                RuthefjordUI.State.goToGallery(function () {});
            });
        }

        $('#btn-gallery').on('click', goToGallery);

        $('#btn-back-gallery').on('click', function () {RuthefjordUI.State.goToGallery(function () {})});

        $('#btn-share').on('click', function () {
            RuthefjordUI.Share.create(function () {
                dont_expand_instructions = true;
                setState_sandbox();
                var div = RuthefjordUI.Dialog.defaultElems("Your code has been shared!", "Got it");
                $(div).find("button").on('click', function () { RuthefjordUI.Dialog.destroy(); });
                var style = {width: '300px', top: '400px', left: '200px', "font-size": "20pt"};
                RuthefjordUI.Dialog.make(div, style);
            });
        });

        // set up some of the callbacks for code editing UI
        ////////////////////////////////////////////////////////////////////////////////

        $('#btn-run').on('click', function() {
            var newRS = RuthefjordManager.Simulator.run_state !== RuthefjordManager.RunState.stopped ? RuthefjordManager.RunState.stopped : RuthefjordManager.RunState.executing;
            if (RuthefjordLogging.activeTaskLogger) { RuthefjordLogging.activeTaskLogger.logDoProgramRunStateChange(newRS); }
            RuthefjordManager.Simulator.set_run_state(newRS);
        });

        $('#btn-workshop').on('click', function() {
            var newEM = RuthefjordManager.Simulator.edit_mode === RuthefjordManager.EditMode.workshop ? RuthefjordManager.EditMode.persistent : RuthefjordManager.EditMode.workshop;
            if (RuthefjordLogging.activeTaskLogger) { RuthefjordLogging.activeTaskLogger.logDoEditModeChange(newEM); }
            RuthefjordManager.Simulator.set_edit_mode(newEM);
        });

        $('#btn-revert').on('click', function() {
            var oldRS = RuthefjordManager.Simulator.run_state;
            if (oldRS === RuthefjordManager.RunState.executing || oldRS === RuthefjordManager.RunState.paused) {
                var newRS = oldRS === RuthefjordManager.RunState.executing ? RuthefjordManager.RunState.paused : RuthefjordManager.RunState.executing;
                if (RuthefjordLogging.activeTaskLogger) { RuthefjordLogging.activeTaskLogger.logDoProgramRunStateChange(newRS); }
                RuthefjordManager.Simulator.set_run_state(newRS);
            }
        });


        $('#btn-step').on('click', function() {
             if (RuthefjordLogging.activeTaskLogger) {
                 RuthefjordLogging.activeTaskLogger.logDoUiAction('button-one-step', 'click', null);
             }
             if (RuthefjordManager.Simulator.run_state === RuthefjordManager.RunState.stopped) {
                 RuthefjordManager.Simulator.set_program(RuthefjordBlockly.getProgram());
             }
             RuthefjordManager.Simulator.set_run_state(RuthefjordManager.RunState.paused);
             RuthefjordManager.Simulator.next_state();
         });

        // camera
        $('#camera-zoom-in').click(function(){RuthefjordDisplay.zoomCamera(0.8);});
        $('#camera-zoom-out').click(function(){RuthefjordDisplay.zoomCamera(1.2);});
        $('#camera-rotate-left').click(function(){RuthefjordDisplay.rotateCamera(45);});
        $('#camera-rotate-right').click(function(){RuthefjordDisplay.rotateCamera(-45);});
        $('#camera-tilt-up').click(function(){RuthefjordDisplay.tiltCamera(10);});
        $('#camera-tilt-down').click(function(){RuthefjordDisplay.tiltCamera(-10);});

        // undo button
        // TODO shouldn't this be in blockly/ruthefjord.js?
        $('#btn-undo').on('click', RuthefjordBlockly.undo);

        RuthefjordUI.Instructions.hide();

        RuthefjordUI.SpeedSlider.initialize(RuthefjordManager.Simulator.set_execution_speed);

        $("#btn-turbo").on('click', function () {
            var toggleState;

            if (RuthefjordUI.SpeedSlider.value() === 1) { // switch from turbo to normal
                toggleState = 1;
                RuthefjordUI.SpeedSlider.value(RuthefjordUI.SpeedSlider.DEFAULT_VALUE);
                RuthefjordManager.Simulator.set_execution_speed(RuthefjordUI.SpeedSlider.DEFAULT_VALUE);
                RuthefjordUI.TurboButton.update(false);
            } else { // switch from normal to turbo
                toggleState = 0;
                RuthefjordUI.SpeedSlider.value(1.0);
                RuthefjordManager.Simulator.set_execution_speed(1.0);
                RuthefjordUI.TurboButton.update(true);
            }

            if (RuthefjordLogging.activeTaskLogger) {
                RuthefjordLogging.activeTaskLogger.logDoUiAction('button-turbo', 'click', {toggle:toggleState});
            }
        });
        RuthefjordUI.TurboButton.update(false); // initialize button text

        RuthefjordUI.TimeSlider.initialize(RuthefjordManager.Simulator.set_execution_time);

        $("#btn-time-slider-back").on('click', function() {
            if (RuthefjordLogging.activeTaskLogger) {
                RuthefjordLogging.activeTaskLogger.logDoUiAction('button-time-slider-back', 'click', null);
            }
            RuthefjordUI.TimeSlider.value(RuthefjordUI.TimeSlider.value() - RuthefjordUI.TimeSlider.getStepSize());
            RuthefjordManager.Simulator.set_execution_time(RuthefjordUI.TimeSlider.value());
        });
        $("#btn-time-slider-forward").on('click', function() {
            if (RuthefjordLogging.activeTaskLogger) {
                RuthefjordLogging.activeTaskLogger.logDoUiAction('button-time-slider-forward', 'click', null);
            }
            RuthefjordUI.TimeSlider.value(RuthefjordUI.TimeSlider.value() + RuthefjordUI.TimeSlider.getStepSize());
            RuthefjordManager.Simulator.set_execution_time(RuthefjordUI.TimeSlider.value());
        });

        $("#btn-code-entry").on('click', function() {
            //RuthefjordUnity.Call.parse_concrete_program($("#code-entry-area").val());
        });

        $("#btn-done").on('click', function() {
            // things get weird if we are running
            RuthefjordManager.Simulator.set_run_state(RuthefjordManager.RunState.finished);
            //var prog = RuthefjordBlockly.getProgram();
            //RuthefjordManager.Simulator.set_program(prog);
            //RuthefjordManager.Simulator.set_execution_time(1);
            // HACK temporary
            RuthefjordManager.Simulator.get_final_state(RuthefjordBlockly.getProgram(), RuthefjordWorldState);
            RuthefjordPuzzle.check_submit_predicate();
        });
    }

    var isInitialized = false;
    setTimeout(function() {
        if (!isInitialized) {
            $('#msg-loading').hide();
            $('#msg-not-loading').show();
        }
    }, 15000);

    // fetch the uid from the GET params and pass that to logging initializer
    // then initialize logging, then load save data, then get the experimental condition, then do all the things
    var username;
    if (RUTHEFJORD_CONFIG.features.no_login_prompt) {
        var uri = new URI(document.URL);
        username = uri.search(true)['username'];
    } else {
        username = window.prompt("Please enter your usename", "");
    }

    RuthefjordLogging.userid = RuthefjordLogging.create_random_uuid();

    load_save_data(RuthefjordLogging.userid)
    .then(function() {
        // log the user id to link logging/game server accounts, then fetch experimental conditions (if any)
        // RuthefjordLogging.logPlayerLogin(Storage.id());
        return fetch_experimental_condition(RuthefjordLogging.userid);
    })
    .then(function() {
        initializeUi();

        return Q.all([
            content.initialize(),
            RuthefjordBlockly.init(),
            RuthefjordWorldState.init(),
            RuthefjordDisplay.init($("#three-js")[0]),
        ]);
    }).then(function() {
        // set up default values, needs to happen here to ensure Blocky has been loaded
        RuthefjordManager.Simulator.set_edit_mode(RuthefjordManager.EditMode.persistent);
        RuthefjordManager.Simulator.clear_run_state();

        // set up nav menu behavior, also needs to be after blockly
        var show_menu_fn = function() {
            var icon = $("#menu-icon");
            icon.css('background', 'rgba(58,134,179,0.8)');
            $("#menu-nav").show();
            icon.off('click');
            icon.click(hide_menu_fn);
        };

        var hide_menu_fn = function () {
            var icon = $("#menu-icon");
            icon.css('background', '');
            $("#menu-nav").hide();
            icon.off('click');
            icon.click(show_menu_fn);
        };

        $("#menu-nav button").click(hide_menu_fn);
        $(window).click(hide_menu_fn); // clicking anywhere dismisses the menu...
        $("body", $("#blockly").contents()).click(hide_menu_fn);
        $("#menu-btn").click(function(event){
            event.stopPropagation();
        }); // ...except clicking on part the menu itself
        $("#menu-icon").click(show_menu_fn);
        $("#menu-icon").hide(); // menu hidden initially since nothing in it will be visible

        isInitialized = true;

        // turn off gallery elements if diabled
        if (!RUTHEFJORD_CONFIG.features.is_debugging) {
            $('.tools-debug').hide();
        } else {
            $('.tools-no-debug').hide();
        }

        if (RUTHEFJORD_CONFIG.features.workshop_only) {
            $('#btn-workshop').removeClass('sandboxModeUI');
            $('#btn-workshop').hide();
        }

        _.forEach(RUTHEFJORD_CONFIG.hide_packs, function (packName) {
            delete game_info.packs[packName]
        });

        if (RUTHEFJORD_CONFIG.features.puzzles_only) {
            $('#btn-back-sandbox').removeClass();
            $('#btn-back-sandbox').hide();
        }

        if (RUTHEFJORD_CONFIG.features.sandbox_only) {
            $('#btn-packs').removeClass();
            $('#btn-packs').hide();
        }

        console.info('EVERYTHING IS READY!');

        // HACK add blockly change listener for saving
        Blockly.getMainWorkspace().addChangeListener(onProgramEdit);

        // HACK this needs to wait for the packs to be loaded
        console.log("level map")
        console.log(game_info.packs);
        _.forEach(game_info.packs, function(pack, id) {
                $('#dev-select-pack').append('<option value="' + id + '">' + id + '</option>');
        });

        _.forEach(game_info.packs, function(pack, id) {
            if (pack.prereq){
                console.log(pack)
                console.log(pack.prereq)
                // for (var i = 0; i < pack.prereq.length; i++) {
                //     console.log(pack.prereq[i])
                // }
                // console.log(progress.is_pack_completed(packs["up"]))
                // console.log(pack.prereq.every(true))
                console.log(pack.prereq.every(function (packName) { return progress.is_pack_completed(packs[packName]); }))
            }

        if (pack.prereq==undefined || pack.prereq.every(function (packName) { return progress.is_pack_completed(packs[packName]); })){
            // if (pack.prereq==undefined) { // TODO check if pack should be added to the menu
                let item = $('<li>' + id + '</li>');
                item.click(function () {
                    current_puzzle_runner = create_puzzle_runner(game_info, pack, "pack");
                })
                $('#list-select-pack').append(item);}
                    });

        progress.initialize(function() {
            if (progress.is_pack_completed(game_info.packs["move dragon"])) {
                RuthefjordUI.State.goToAlphaMsg();
                if (RUTHEFJORD_CONFIG.features.puzzles_only) {
                    $("#btn-alpha-continue").on('click', function() {
                        setState_packs();
                    });
                } else {
                    $("#btn-alpha-continue").on('click', function() {
                        setState_sandbox();
                    });
                }
            } else {
                RuthefjordUI.State.goToConsent();
                $("#btn-consent-continue").on('click', function() {
                    // RuthefjordLogging.logStudentConsented($("#chkbox-consent")[0].checked, parseInt($("#player-consent").attr("data-tosid")));
                    RuthefjordUI.State.goToAlphaMsg();
                    if (RUTHEFJORD_CONFIG.features.sandbox_only) {
                        $("#btn-alpha-continue").on('click', function() {
                            setState_sandbox();
                        });
                    } else {
                        $("#btn-alpha-continue").on('click', function() {
                            current_puzzle_runner = create_puzzle_runner(game_info, game_info.packs["move dragon"], "tutorial");
                        });
                    }
                });
                current_puzzle_runner = create_puzzle_runner(game_info, game_info.packs["move dragon"], "tutorial");
            }
        });
        RuthefjordBlockly.game_info = game_info;
        RuthefjordBlockly.progress = progress;
    }, function(error) {
        console.error("Initialization failed! Program not starting! Error is below:");
        console.error(error);
    });
});

// SPECIFIC HANDLER FUNCTIONS

function clear_level_listeners() {
    _.forEach(levelListeners, function (listener) {
        Blockly.getMainWorkspace().removeChangeListener(listener);
    });
    levelListeners = [];
}

var PUZZLE_FORMAT_VERSION = 2;

function start_editor(info) {

    if (info.puzzle.format_version !== PUZZLE_FORMAT_VERSION) {
        console.error("Invalid puzzle info version '" + info.puzzle.version + "'!");
        return;
    }

    if (info.is_starting) {
        var library = {
            current: progress.get_library(),
            puzzle: _.union(info.puzzle.library.required, info.puzzle.library.granted)
        };
        library.all = _.union(library.current, library.puzzle);

        //var goals = info.puzzle.goals ? info.puzzle.goals : [];

        RuthefjordBlockly.setLevel(info.puzzle, library);
        if (!RUTHEFJORD_CONFIG.features.debugging_always && !RUTHEFJORD_CONFIG.features.unlock_all) {
            RuthefjordUI.SpeedSlider.setVisible(_.includes(library.all, 'speed_slider'));
            RuthefjordUI.TimeSlider.setVisible(_.includes(library.all, 'time_slider'));
        }
        RuthefjordUI.CameraControls.setVisible(_.includes(library.all, 'camera_controls'));
        RuthefjordUI.CubeCounter.setVisible(info.puzzle.goal && info.puzzle.goal.type === "cube_count");
        RuthefjordUI.DoneButton.setVisible(info.puzzle.goal && info.puzzle.goal.type === "submit");
        RuthefjordUI.UndoButton.update();
        RuthefjordUI.DeleteButton.update();
        RuthefjordUI.TrashButton.update();


        _.includes(library.all, 'gallery') ? $(".galleryAccess").show() : $(".galleryAccess").hide();

        // only show navigation menu if there's something visible in it
        if ($("#menu-nav").find("button").map(function(i, x) {return $(x).css("display")}).toArray().some(function(x) {return x !== "none";})) {
            $("#menu-icon").show();
        } else {
            $("#menu-icon").hide();
        }

        // clear old quest logger if it exists
        if (RuthefjordLogging.activeTaskLogger) {
            RuthefjordLogging.activeTaskLogger.logTaskEnd();
        }
        // then start new quest logger if this is not an empty level
        // RuthefjordLogging.startTask(info.puzzle.logging_id, info.checksum, info.puzzle.name);
        // RuthefjordLogging.activeTaskLogger.logLevelSetupCallStart("start_editor", info);

        // clear any existing addon blocks in the toolbox (so they don't get duplicated)
        RuthefjordBlockly.AddonCommands = {};
        // clear existing addons from simulator globals
        RuthefjordManager.Simulator.init();
        if (info.puzzle.library.autoimports) {
            var addons = [];
            var qs = [];
            _.forEach(info.puzzle.library.autoimports, function(module) {
                qs.push(Q($.get(module.value)).then(function (json) {
                    addons.push(json);
                    _.forEach(json.body, function(statement) {
                        if (statement.type === "procedure") {
                            RuthefjordBlockly.generateBlock(statement.name, statement.name, statement.params)
                        }
                    });
                }));
            });
            Q.all(qs).then(function () {
                // get the imported blocks to show up in the toolbox
                RuthefjordBlockly.updateToolbox();
                // add imports to simulator globals
                RuthefjordManager.Simulator.init(addons);
            });
        }

        clear_level_listeners();
        // check procedures only flag
        if (info.puzzle.procedures_only) {
            levelListeners.push(Blockly.getMainWorkspace().addChangeListener(RuthefjordBlockly.proceduresOnly));
        }

        if (info.puzzle.program) {
            switch (info.puzzle.program.type) {
                case "file":
                    Q($.get(info.puzzle.program.value)).then(function (program) {
                        RuthefjordBlockly.setProgram(program);
                    }, function (error) {
                        console.log(error);
                    });
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

        // reset history to prevent undo from restoring whatever code happened to be around before
        RuthefjordBlockly.history = [];

        if (info.puzzle.winmsg) {
            win_msg = info.puzzle.winmsg;
        } else {
            win_msg = ["Yay, you win!", "Nice work!", "Great job!", "Way to go!", "Fantastic!"][Math.floor(Math.random() * 5)];
        }
    }
    // HACK we have to wait long enough for a render to happen, so we get the right screen coordinates
    // setTimeout(function () {RuthefjordUI.Instructions.show(info.puzzle.instructions, null);}, 1000);
    RuthefjordUI.Instructions.show(info.puzzle.instructions);
    // RuthefjordLogging.activeTaskLogger.logLevelSetupCallEnd("start_editor", null);
}

handler.onSandboxStart = function() {
    current_scene = "sandbox";

    clear_level_listeners();
    RuthefjordPuzzle.clear_puzzle(); // clear win predicate and puzzle targets
    RuthefjordManager.Simulator.clear_run_state();

    var summary = "Have fun and build stuff!";
    if (!RUTHEFJORD_CONFIG.features.sandbox_only) {
        summary += ' Use <img class="instructions-img" src="media/menu_btn.png" style="vertical-align:middle" data-uiid="#menu-btn"/> and go to {learn} to start unlocking new abilities.'
    }

    Storage.load('sandbox_program', function(sandbox_program) {
        var info = {
            checksum: 0,
            is_starting: true,
            puzzle: {
                format_version: PUZZLE_FORMAT_VERSION,
                logging_id: "ee3d8d04-1bd0-4517-b5ed-e52f47f86dd0",
                library: {required:[],granted:[]},
                program: {type: 'xml', value: sandbox_program},
                instructions: {
                    targets: [
                        {
                            type: 'general',
                            text: summary,
                        }
                    ]
                },
                name: "sandbox"
            }
        };

        if (RUTHEFJORD_CONFIG.features.workshop_only) {
            info.puzzle.instructions.detail = "";
        }

        start_editor(info);
    });

    if (sandboxProgAddon) {
        RuthefjordBlockly.loadBlocks(Blockly.JSONLangOps.XMLOfJSON(JSON.parse(sandboxProgAddon)));
        sandboxProgAddon = "";
    }

    // if (RUTHEFJORD_CONFIG.features.debugging_always && RuthefjordUI.DebugFeatureInfo.hasNext()) {
    //     RuthefjordUI.DebugFeatureInfo.showNext();
    // }

    // enforce workshop_only feature if necessary
    if (RUTHEFJORD_CONFIG.features.workshop_only) {
        RuthefjordManager.Simulator.set_edit_mode(RuthefjordManager.EditMode.workshop);
    }

    // display the concrete syntax entry in dev mode
    if (isDevMode) {
        $('.devModeOnly').show();
    }
};

handler.onPuzzleChange = function(info) {
    // console.log('starting puzzle ' + json);
    current_scene = "puzzle";
    start_editor(info);
};

function clearBlocklyClass (className) {
    var highlights = $('.' + className, $("#blockly").contents());
    for (var i = 0; i < highlights.length; i++) { // need to handle each element separately to avoid applying classes from first element to every element
        highlights.slice(i,i+1).attr('class', highlights.slice(i,i+1).attr('class').replace(className, ""));
    }
}

function clearHighlights () {
    clearBlocklyClass("blocklyHighlighted");
    clearBlocklyClass("primaryHighlight");
    clearBlocklyClass("blocklyDebugHighlight");
}

handler.onProgramStateChange = function(type) {

    if (type === 'edit_mode') {
        var em = RuthefjordManager.Simulator.edit_mode;
        // console.log('on edit mode change: ' + em);
        RuthefjordUI.StepButton.update(RuthefjordManager.Simulator.run_state !== RuthefjordManager.RunState.finished && em === RuthefjordManager.EditMode.workshop);
        RuthefjordUI.ModeButton.update(em === RuthefjordManager.EditMode.workshop);
        RuthefjordUI.TimeSlider.setEnabled(em === RuthefjordManager.EditMode.workshop);
        if (RuthefjordLogging.activeTaskLogger) { RuthefjordLogging.activeTaskLogger.logOnEditModeChanged(em); }
    }

    if (type === 'run_state') {
        var rs = RuthefjordManager.Simulator.run_state;
        // console.log('on run state change: ' + rs);
        RuthefjordUI.StepButton.update(rs !== RuthefjordManager.RunState.finished && RuthefjordManager.Simulator.edit_mode === RuthefjordManager.EditMode.workshop);
        RuthefjordUI.PauseButton.update(rs !== RuthefjordManager.RunState.stopped && rs !== RuthefjordManager.RunState.finished, rs === RuthefjordManager.RunState.paused);
        RuthefjordUI.RunButton.update(rs !== RuthefjordManager.RunState.stopped, RuthefjordManager.Simulator.edit_mode === RuthefjordManager.EditMode.workshop);

        if (RuthefjordLogging.activeTaskLogger) { RuthefjordLogging.activeTaskLogger.logOnProgramRunStateChanged(rs, JSON.stringify(RuthefjordBlockly.getProgram())); }

        if (rs === RuthefjordManager.RunState.stopped && current_scene === 'sandbox') {
            Storage.save('sandbox_world_data', RuthefjordWorldState.save());
        }
    }

    // clear current highlights when not paused or currently unpausing
    if (RuthefjordManager.Simulator.run_state !== RuthefjordManager.RunState.paused && !(type === 'run_state' && RuthefjordManager.Simulator.run_state === RuthefjordManager.RunState.executing)) {
        clearHighlights();
    }

    if (type === 'current_state') {
        // clear current highlights before setting new ones
        clearHighlights();
        // highlight current block
        if (Blockly.dragMode_ === 0) { // make sure we're not currently modifying the code (I don't think this can currently happen, but better safe than sorry)
            //console.log(RuthefjordManager.Simulator.current_code_elements);
            if (RuthefjordManager.Simulator.current_code_elements.length > 0) {
                var callStackIndex = RuthefjordManager.Simulator.current_code_elements.length - 2;
                // add new highlights for currently executing block and all surrounding blocks
                var block = Blockly.getMainWorkspace().getBlockById(_.last(RuthefjordManager.Simulator.current_code_elements));
                if (block) {
                    block.addHighlight(true);
                    while(block.getSurroundParent()) {
                        block.getSurroundParent().addHighlight();
                        if (block.getSurroundParent().type === "procedures_defnoreturn" || block.getSurroundParent().type === "procedures_noargs_defnoreturn") {
                            // add highlight to the function call that we're in
                            block = Blockly.getMainWorkspace().getBlockById(RuthefjordManager.Simulator.current_code_elements[callStackIndex--]);
                            block.addHighlight();
                        } else {
                            block = block.getSurroundParent();
                        }
                    }
                }
            }
        }
    }
};

handler.onLockedToolboxClick = function(block) {
    RuthefjordUI.UnlockBlockMsg.show(block.svgGroup_, function () {
        current_puzzle_runner = create_puzzle_runner(game_info, game_info.packs[block.packName], "pack");
    });
};

handler.onStepHighlight = function(id) {
    // clear any existing highlights
    clearHighlights();
    // apply new highlight
    var block = Blockly.getMainWorkspace().getBlockById(id.toString());
    if (block) {
        block.addHighlight(true);
    }
};

handler.onDebugHighlight = function(id) {
    // clear any existing highlights
    clearBlocklyClass("blocklyDebugHighlight");
    // apply new highlight
    var block = Blockly.getMainWorkspace().getBlockById(id.toString());
    if (block) {
        Blockly.addClass_(block.svgGroup_, "blocklyDebugHighlight");
        block.svgGroup_.parentNode.appendChild(block.svgGroup_);
        var taskLogger = RuthefjordLogging.activeTaskLogger;
        if (taskLogger) {
            taskLogger.logDoUiAction("debug-cube-highlight", 'start', null);
        }
    }
};

// sent the moment they "win" a puzzle
handler.onPuzzleComplete = function(puzzle_id) {
    progress.mark_puzzle_completed(puzzle_id, game_info.puzzles[puzzle_id]);
    if (RuthefjordLogging.activeTaskLogger) { RuthefjordLogging.activeTaskLogger.logOnPuzzledCompleted(); }
    RuthefjordUI.WinMessage.show(win_msg, win_btn_msg, function() { handler.onPuzzleFinish(puzzle_id); });
    // var cheer = new Audio("media/cheer_3.mp3");
    // cheer.play();
};

// sent when they exit a puzzle
handler.onPuzzleFinish = function(puzzle_id) {
    current_puzzle_runner.onPuzzleFinish();

    if (RuthefjordLogging.activeTaskLogger) {
        RuthefjordLogging.activeTaskLogger.logTaskEnd();
    }
};

handler.onWorldDataStart = function() {
    world_data = "";
};

handler.onWorldDataChunkSend = function(chunk) {
    world_data += chunk;
};

handler.onWorldDataEnd = function(extra) {
    //console.log(extra);
    //console.info(world_data);
    //console.info(JSON.parse(world_data));
    //console.info(atob(JSON.parse(world_data).cubes.data));
    var extra_data = JSON.parse(extra);
    switch(extra_data.mode) {
        case "save":
            Storage.save('sandbox_world_data', world_data);
            break;
        case "render":
            var world = JSON.parse(world_data);

            // process cube data
            // convert base64 to byte array
            var byteCharacters = atob(world.cubes.data);
            var byteNumbers = new Uint8Array(byteCharacters.length);
            var i;
            for (i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            // convert byte array to int array
            var intArray = new Array(byteNumbers.length / 4);
            for (i = 0; i < intArray.length; i++) {
                var o = i*4;
                intArray[i] = byteNumbers[o] << 0 | byteNumbers[o+1] << 8 | byteNumbers[o+2] << 16 | byteNumbers[o+3] << 24
            }

            RuthefjordDisplay.setDisplayFromWorld(world.robots[0], intArray, extra_data.dt);
    }
};


handler.onUnlockDevMode = function() {
    isDevMode = true;
    Blockly.getMainWorkspace().maxBlocks = 5000;
};

handler.onCubeCount = function(count) {
    RuthefjordUI.CubeCounter.update(count);
};

handler.onScreenshot = function(data) {
    document.getElementById(data.id).src = data.src;
    RuthefjordUI.State.goToShare(function () {});
};

handler.onProgramParse = function(prog) {
    RuthefjordManager.Simulator.set_program(prog);
    var program = JSON.parse(prog);
    RuthefjordBlockly.setProgram(program);
};

handler.onToSandbox = function() {
    setState_sandbox();
};

handler.onErrorMessages = function(errors) {
    console.log(errors);
    RuthefjordUI.Instructions.displayErrors(JSON.parse(errors));
};

return onRuthefjordEvent;
}());

function devmode() {
    onRuthefjordEvent('onUnlockDevMode');
}

function toSandbox() {
    onRuthefjordEvent('onToSandbox')
}
