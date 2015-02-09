
var RuthefjordUI = (function(){ "use strict";
var module = {};

/**
 * UI state changes for the different application states (e.g., title, puzzle).
 * Does not handle any of the model, simply shows the correct basic elements.
 */
module.State = (function(){ "use strict";
    var self = {};
    var current_state;

    function hideAll() {
        RuthefjordUnity.Player.hide();
        $('.view-loading, .player-consent, .codeEditor, .puzzleModeUI, .sandboxModeUI, .puzzleSelector, .packSelector, .gallerySelector, .viewerModeUI, .shareModeUI, .devModeOnly, .dialogUI').hide();
    }

    var main_selector = '#main-view-game, #main-view-code';

    self.goToLoading = function() {
        hideAll();
        $('.view-loading').show();
    }

    self.goToConsent = function() {
        hideAll();
        $('.player-consent').show();
    }

    self.goToTitle = function(cb) {
        current_state = 'title';

        hideAll();
        $('.codeEditor').show();
        RuthefjordUnity.Player.show();
        $(main_selector).addClass('title');

        cb();
    };

    self.goToIntro = function(cb) {
        if (current_state !== 'title') {
            throw new Error('can only transition to intro from title!');
        }
        current_state = 'intro';

        $(main_selector).addClass('transition');
        $(main_selector).removeClass('title');

        setTimeout(function() {
            $(main_selector).removeClass('transition');
            cb();
        }, 1100);
    };

    self.goToSceneSelect = function(cb) {
        hideAll();
        $('.puzzleSelector').show();
        $(main_selector).removeClass('title');
        cb();
    };

    self.goToPuzzle = function(cb) {
        hideAll();
        $('.codeEditor, .puzzleModeUI').show();
        RuthefjordUnity.Player.show();
        $(main_selector).removeClass('title');
        cb();
    };

    self.goToSandbox = function(cb) {
        hideAll();
        $('.codeEditor, .sandboxModeUI').show();
        RuthefjordUnity.Player.show();
        $(main_selector).removeClass('title');
        cb();
    };

    self.goToPackSelect = function(cb) {
        hideAll();
        $('.packSelector').show();
        cb();
    }

    self.goToGallery = function(cb) {
        hideAll();
        $('.gallerySelector').show();
        cb();
    }

    self.goToViewer = function(cb) {
        hideAll();
        $('.viewerModeUI').show();
        RuthefjordUnity.Player.show();
        RuthefjordUI.CameraControls.viewMode();
        $('#main-view-game').css('width', '800px').css('margin', '0 auto');
        cb();
    }

    self.goToShare = function(cb) {
        hideAll();
        $('.shareModeUI').show();
        cb();
    }

    return self;
}());

module.Share = (function() {
    var self = {};

    self.title = "";
    var site = fermata.json(RUTHEFJORD_CONFIG.game_server.url);

    var submit = function (cb) {
        var message = $("#share-message");
        if (self.title) {
            $.ajax(RUTHEFJORD_CONFIG.game_server.url + '/getuid', {
                data: JSON.stringify({username:RuthefjordLogging.uid()}),
                contentType: 'application/json',
                type: 'POST'
            })
                .done(function(data) {
                    // from http://stackoverflow.com/a/2117523
                    var author_uuid = data.result.uuid;
                    var project_uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                        return v.toString(16);
                    });
                    var upload = {id: project_uuid, author: author_uuid, name: self.title, time: (new Date()).toUTCString(), program: JSON.stringify(RuthefjordBlockly.getProgram()), world_data: ""};
                    console.info(upload);
                    site('uploaded_project').post({"Content-Type":"application/json"}, upload, function (e,d) {console.log(e,d);});
                })
                .fail(function(data) {
                    // if THIS fails, give up and turn off logins
                    console.log("getting the user uuid failed D:")
                    cb();
                });

        } else {
            // message.html("Please enter a title");
            // message.show();
            // message.stop().animate({opacity: '100'});
            // message.fadeOut(2000, "easeInExpo", function () {message.html("");});
            alert("Please enter a title");
        }
    }

    self.create = function (cb) {
        $("#share-edit-title").editInPlace({
            callback: function(unused, enteredText) { self.title = enteredText; return enteredText; },
            show_buttons: false,
        });
        RuthefjordUnity.Call.render_final_frame({id:"share-thumb", program:JSON.stringify(RuthefjordBlockly.getProgram())});
        $("#btn-share-submit").on('click', function () {submit(cb);});
    }

    return self;
}());

module.Gallery = (function() {
    var self = {};

    self.thumbsToRender = [];

    function renderThumb(item, thumbId) {
        self.thumbsToRender.push(thumbId);
        RuthefjordUnity.Call.render_final_frame({id:thumbId, program:item.program});
    }

    function makeItem(item, sandboxCallback) {
        var span = document.createElement("span");
        span.id = 'item_' + item.name;
        $(span).addClass('galleryItem');
        var title = document.createElement("p");
        title.innerHTML = item.name;
        var div = document.createElement("div");
        $(span).append(title);
        $(span).append(div);

        var content = document.createElement("div");
        var thumb = document.createElement("img");
        thumb.id = span.id + '_thumb';
        renderThumb(item, thumb.id);
        $(content).append(thumb);
        
        var controls = document.createElement("div");
        var viewBtn = document.createElement("button");
        viewBtn.innerHTML = "View";
        $(viewBtn).addClass("control-btn galleryButton");
        function viewItem() {
            RuthefjordUnity.Call.set_program(item.program);
            RuthefjordUnity.Call.set_program_execution_time(1);
            RuthefjordUI.State.goToViewer(function () {});
        }
        $(viewBtn).on('click', viewItem);
        var codeBtn = document.createElement("button");
        codeBtn.innerHTML = "Get Code";
        $(codeBtn).addClass("control-btn galleryButton");
        function getCode() {
            sandboxCallback(item);
        }
        $(codeBtn).on('click', getCode);
        $(controls).append(viewBtn);
        $(controls).append(codeBtn);
        $(controls).css("flex-direction", "");
        
        $(div).append(content);
        $(div).append(controls);
        return span;
    }

    self.create = function(items, sandboxCallback) {
        var selector = $(".galleryItems");
        selector.empty();
        _.each(items, function(item) {
            if (item.name) {
                var i = makeItem(item, sandboxCallback);
                selector.append(i);
            }
        });
    }

    return self;
}());

module.PackSelect = (function() {
    var self = {};

    function makePack(pack) {
        var span = document.createElement("span");
        span.id = 'pack_' + pack.name;
        $(span).addClass('packOption');
        var title = document.createElement("p");
        title.innerHTML = pack.name;
        $(title).css("font-weight", "700");
        $(title).css("padding-bottom", "5px");
        $(span).append(title);
        $(span).append("<u>You will learn how to:</u>");
        var learnList = document.createElement("ul");
        _.each(pack.learn, function(item) {
            var e = document.createElement("li");
            e.innerHTML = item;

            $(learnList).append(e);
        })
        $(span).append(learnList);
        return span;
    }

    self.create = function(packs, onSelectCallback) {
        var selector = $(".packOptions");
        selector.empty();
        _.each(packs, function(pack) {
            if (pack.name) {
                var m = makePack(pack, onSelectCallback);
                $(m).on('click', function () {
                    onSelectCallback(pack); 
                });
                selector.append(m);
            }
        });
    }

    return self;
}());

module.LevelSelect = (function() {
    var self = {};

    /**
     * @param isSceneCompleted A function : scene id (string) -> bool that
     * indicates whether the scene with the given id has been completed.
     * @param onSelectCallback Invoked when a level is selected.
     * Will pass in one argument, an object with the following structure:
     * { id: <id of level>, puzzle: <PuzzleInfo object> }
     */
    self.create = function(pack, scenes, isSceneCompleted, onSelectCallback) {
        // TODO move hard-coded graph spec to config file of some kind
        var colors = {
            teal: "#5BA68D",
            brown: "#A6875B",
            purple: "#995BA6",
            green: "#5BA65B",
            gray: "#777777",
            orange: "#FFB361"
        };

        var graph = new dagre.Digraph();

        _.each(pack.nodes, function(id) {
            graph.addNode(id, {label: scenes[id].name, id: id});
        });

        _.each(pack.edges, function(edge) {
            graph.addEdge(null, edge[0], edge[1]);
        });

        // perform layout
        var renderer = new dagreD3.Renderer();
        renderer.zoom(false);
        var layout = dagreD3.layout()
                            .rankDir("LR");
        renderer.layout(layout).run(graph, d3.select(".puzzleSelector svg g"));

        // color rectangles
        var nodes = $(".puzzleSelector .node");

        // setup onclick behavior
        var SANDBOX_LEVEL_ID = 'tutorial.sandbox';

        var COLOR_MAP = {
            completed: "green",
            available: "orange",
            unavailable: "gray"
        };

        nodes.each(function (index) { 
            var x = $(this)[0];
            if (graph.predecessors(x.id).every(isSceneCompleted)) {
                x.onclick = function() {
                    onSelectCallback(x.id);
                };
                if (isSceneCompleted(x.id)) {
                    x.childNodes[0].style.fill = colors[COLOR_MAP.completed];
                } else {
                    x.childNodes[0].style.fill = colors[COLOR_MAP.available];
                }
            } else {
                x.childNodes[0].style.fill = colors[COLOR_MAP.unavailable];
            }
        });
    };

    return self;
}());

module.Instructions = (function() {

    var self = {};
    var isLarge = false;
    var arrowTarget = "";

    var imgFileMap = {
        forward: "media/blockSvgs/forward.svg",
        left: "media/blockSvgs/left.svg",
        right: "media/blockSvgs/right.svg",
        placecube: "media/blockSvgs/placecube.svg",
        removecube: "media/blockSvgs/removecube.svg",
        up: "media/blockSvgs/up.svg",
        down: "media/blockSvgs/down.svg",
        repeat: "media/blockSvgs/repeat.svg",
        repeat4: "media/blockSvgs/repeat4.svg",
        repeat5: "media/blockSvgs/repeat5.svg",
        repeat9: "media/blockSvgs/repeat9.svg",
        squareProc: "media/blockSvgs/squareProc.svg",
        go: "media/goButton.png",
        rotateCW: "media/rotateCWButton.png",
        rotateCCW: "media/rotateCCWButton.png",
        camera: "media/cameraControls.png",
        learn: "media/learnButton.png",
        workshop: "media/workshopButton.png",
        clear: "media/clearSandboxButton.png",
        speedSlider: "media/speedSlider.png",
        done: "media/doneButton.png",
        castle: "media/blockSvgs/castle.svg",
        wall: "media/blockSvgs/wall.svg",
        tower: "media/blockSvgs/tower.svg",
        towerlayer: "media/blockSvgs/towerlayer.svg",
        towertop: "media/blockSvgs/towertop.svg",
        wallsheet: "media/blockSvgs/wallsheet.svg",
        walltop: "media/blockSvgs/walltop.svg"
    }

    var uiIdMap = {
        go: "btn-run",
        rotateCW: "camera-rotate-right",
        rotateCCW: "camera-rotate-left",
        camera: "camera-controls",
        learn: "btn-packs",
        workshop: "btn-workshop",
        clear: "btn-header-clear-sandbox",
        speedSlider: "speed-slider",
        done: "btn-done"
    }

    function makeImgHtml(file, uiId) {
        var html = "<object class=\"instructions-img\" data=\"" + file + "\" style=\"vertical-align:middle\"";
        if (uiId) {
            html += " data-uiId=\"#" + uiId + "\"";
        } 
        html += "></object>";
        return html;
    }

    // replace each word inside {} with the corresponding html produced by makeImgHtml (if applicable)
    function processTemplate(str) {
        return str.replace(/{(\w+)}/g, function(match, id) {
            return typeof imgFileMap[id] != 'undefined'
                ? makeImgHtml(imgFileMap[id], uiIdMap[id]) 
                : match
            ;
        });
    }

    // set up click handlers for images in the instructions to cause an arrow to point to the actual UI element 
    // when the image is clicked
    function makeImgOnClick() {
        $(".instructions-img").each(function() {
            if ($(this).attr("data-uiId")) {
                var uiElem = $($(this).attr("data-uiId"));
                $(this).on('click', function (ev) {
                    ev.stopPropagation();
                    if (arrowTarget === "" || arrowTarget !== $(this).attr("data-uiId")) {
                        arrowTarget = $(this).attr("data-uiId");
                        var arrow = $("#attention-arrow");
                        arrow.css("display", "block");
                        module.Arrow.positionLeftOf(uiElem);
                        arrow.stop().animate({opacity: '100'});
                        arrow.fadeOut(5000, "easeInExpo", function() { arrowTarget = ""; });
                    } else {
                        // shrink instructions in response to multiple clicks on same element
                        setSize(false, null, true)(); 
                    }
                });
            }
        });
    }

    function setOnExpandAnimationDone(f) {
        setTimeout(f, 1000);
    }

    function setSize(doMakeLarge, clickCallback, doAnimate) {

        return function() {
            isLarge = doMakeLarge;
            var container = $("#instructions-container")[0];
            container.onclick = null;

            if (doAnimate) {
                $("#instructions-display").removeClass("no-transition");
            } else {
                $("#instructions-display").addClass("no-transition");
            }

            if (doMakeLarge) {
                $("#instructions-display").addClass("expanded");
                $("#btn-instructions-hide").show();
            } else {
                $("#instructions-display").removeClass("expanded");
                $("#btn-instructions-hide").hide();
            }

            function onDone() {
                if (isLarge === doMakeLarge) {
                    $("#instructions-reminder").html(isLarge ? "(Shrink)" : "(Expand)");
                    container.onclick = clickCallback ? clickCallback : setSize(!doMakeLarge, null, true);
                }
                // iframes can't use click handlers, so we put ours on the body inside
                if (isLarge && !clickCallback) {
                    $('#blockly').contents().find("body").on('click', setSize(false, null, true));
                } else {
                    $('#blockly').contents().find("body").off('click');
                }
            }

            if (doAnimate) {
                setOnExpandAnimationDone(onDone);
            } else {
                onDone();
            }
        }
    }

    self.hide = function() {
        $('#instructions-container').css('visibility', 'hidden');
    }

    self.show = function(instructions, cb, doStartLarge) {
        // clear old instructions
        $('#instructions-goal').html("");
        $('#instructions-detail').html("");
        self.displayErrors();
        // load new instructions, if any
        if (instructions) {
            $('#instructions-goal').html(processTemplate(instructions.summary));
            $('#instructions-detail').html(processTemplate(instructions.detail));
        }
        $('#instructions-container').css('visibility', 'visible');
        setSize(doStartLarge, cb, false)();
        makeImgOnClick();
    }

    self.displayErrors = function(errors) {
        var list = $("#instructions-errors-list");
        // clear old errors
        $("#instructions-errors-title").html("");
        $("#instructions-errors-title").removeClass("populated");
        list.html("");
        list.removeClass("populated");
        // load new errors, if any
        if (errors) {
            $("#instructions-errors-title").html("Here are some things to fix:");
            _.each(errors, function(error) {
                var item = document.createElement("li");
                $(item).html(error);
                list[0].appendChild(item);
            });
            $("#instructions-errors-title").addClass("populated");
            list.addClass("populated");
            setSize(true, null, true)();
        }
    }

    return self;
}());

module.Arrow = (function() {
    var self = {};

    self.positionLeftOf = function(uiElem) {
        var arrow = $("#attention-arrow");
        arrow.css("top", (uiElem.offset().top - arrow.height()/2 + uiElem.outerHeight()/2) + 'px')
        arrow.css("left", (uiElem.offset().left - arrow.width()) + 'px');
    }

    self.positionAt = function(top, left, height) {
        var arrow = $("#attention-arrow");
        arrow.css("top", (top - arrow.height()/2 + height/2) + 'px')
        arrow.css("left", (left - arrow.width()) + 'px');
    }

    return self;
}());

function update_button(selector, isEnabled, isActive, inactiveText, activeText) {
    var b = $(selector);
    if (isEnabled) {
        b.removeClass('disabled');
        if (isActive) {
            b.html(activeText);
            b.addClass('active');
        } else {
            b.html(inactiveText);
            b.removeClass('active');
        }
    } else {
        b.html(inactiveText);
        b.addClass('disabled');
    }
}

module.RunButton = (function() {
    var self = {};

    self.update = function(isRunning, isWorkshopMode) {
        var at = isWorkshopMode ? "Reset" : "Stop";
        update_button('#btn-run', true, isRunning, "Go!", at);
    };

    return self;
}());

module.ModeButton = (function() {
    var self = {};

    self.update = function(isWorkshopMode) {
        update_button('#btn-workshop', true, isWorkshopMode, "Enter Workshop Mode", "Exit Workshop Mode");
    };

    return self;
}());

module.PauseButton = (function() {
    var self = {};

    self.update = function(isEnabled, isPaused) {
        update_button('#btn-pause', isEnabled, isPaused, "Pause", "Resume");
    };

    return self;
}());

module.StepButton = (function() {
    var self = {};

    self.update = function(isEnabled) {
        update_button('#btn-step', isEnabled, false, "One Step", "One Step");
    };

    return self;
}());

module.CameraControls = (function() {
    var self = {};

    self.cameraMode = "gamemode";

    self.setVisible = function(components) {
        var isRotate = _.contains(components, 'camera_rotate');
        var isTilt = _.contains(components, 'camera_tilt');
        $('.camera-controls-rotate').css('display', isRotate ? 'inline-block' : 'none');
        $('.camera-controls-tilt').css('display', isTilt ? 'inline-block' : 'none');
    }

    self.toggleMode = function() {
        if (self.cameraMode === "gamemode") {
            self.cameraMode = "viewmode";
        } else {
            self.cameraMode = "gamemode";
        }
    }

    self.viewMode = function() {
        self.cameraMode = "viewmode";
        RuthefjordUnity.Call.control_camera(RuthefjordUI.CameraControls.cameraMode);
    }

    self.gameMode = function() {
        self.cameraMode = "gamemode";
        RuthefjordUnity.Call.control_camera(RuthefjordUI.CameraControls.cameraMode);
    }

    return self;
}());

function Slider(selector, labels) {
    var self = {};
    var container;
    var slider;

    self.initialize = function(onChangeCallback) {
        container = $(selector);

        container.addClass('slider-container');

        container.append(
            '<div class="slider-labels">' +
                '<span style="text-align: left;">' + labels[0] + '</span>' +
                '<span style="text-align: center;">' + labels[1] + '</span>' +
                '<span style="text-align: right;">' + labels[2] + '</span>' +
            '</div>');

        slider = $('<div/>');

        container.append(slider);

        slider.slider({
            value: 0.22,
            min: 0.0,
            max: 1.0,
            step: 0.01,
            slide: function( event, ui ) {
                onChangeCallback(ui.value);
            }
        });
    };

    self.setVisible = function(isVisible) {
        container.css('visibility', isVisible ? 'visible' : 'hidden');
    };

    self.setEnabled = function(isEnabled) {
        slider.slider("option", "disabled", !isEnabled);
        container.attr('title', isEnabled ? '' : "Can only use time slider in workshop mode.");
    }

    self.value = function(x) {
        if (x === undefined) {
            return slider.slider("option", "value");
        } else {
            slider.slider("value", x);
        }
    };

    return self;
}

module.SpeedSlider = Slider('#speed-slider', ['Slow', 'Medium', 'Fast']);

module.TimeSlider = Slider('#time-slider', ['Beginning', 'Middle', 'End']);

module.CubeCounter = (function() {
    var self = {};

    self.setVisible = function(isVisible) {
        $('#cube-counter').css('display', isVisible ? 'block' : 'none');
        var n = 0;
        $('#cube-counter').html(n.toString() + " cubes placed.");
    };

    self.update = function(count) {
        $('#cube-counter').html(count + " cubes placed.");
    }

    return self;
}());

module.DoneButton = (function() {
    var self = {};

    self.setVisible = function(isVisible) {
        $('#btn-done').css('display', isVisible ? 'block' : 'none');
    };

    return self;
}());

module.Dialog = (function() {
    self = {};

    self.make = function(content, style) {
        // clear out any old contents
        module.Dialog.destroy();
        
        var dialog = document.getElementById('dialog');

        // Copy all the specified styles to the dialog.
        for (var name in style) {
          dialog.style[name] = style[name];
        }
        dialog.appendChild(content);

        $(dialog).show();
    }

    self.destroy = function () {
        $(".dialog-content").remove();
        $(dialog).hide();
    }

    return self;
}());

module.WinMessage = (function() {
    var self = {};

    self.show = function(msg, btn_msg, cb) {
        var div = document.createElement('div');
        $(div).addClass("dialog-content");
        var dialogContent = document.createElement('span');
        dialogContent.appendChild(document.createTextNode(msg));
        var btn = document.createElement('button');
        btn.style["font-size"] = "20pt";
        $(btn).addClass("control-btn");
        $(btn).html(btn_msg);
        $(btn).on('click', function () { module.Dialog.destroy(); cb(); });
        div.appendChild(dialogContent);
        div.appendChild(btn);
        var style = {width: '450px', top: '400px', left: '200px', "font-size": "30pt"};
        RuthefjordUI.Dialog.make(div, style);
    }

    return self;
}());

return module;
}());

