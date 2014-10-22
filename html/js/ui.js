
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
        $('.view-loading, .codeEditor, .puzzleModeUI, .sandboxModeUI, .puzzleSelector, .moduleSelector').hide();
    }

    var main_selector = '#main-view-game, #main-view-code';

    self.goToLoading = function() {
        hideAll();
        $('.view-loading').show();
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
        module.CubeCounter.setVisible(false);
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

    self.goToModuleSelect = function(cb) {
        hideAll();
        $('.moduleSelector').show();
        cb();
    }

    return self;
}());

module.ModuleSelect = (function() {
    var self = {};

    function makeModule(module) {
        var span = document.createElement("span");
        span.id = 'module_' + module.name;
        $(span).addClass('moduleOption');
        var title = document.createElement("p");
        title.innerHTML = module.name;
        $(title).css("font-weight", "700");
        $(title).css("padding-bottom", "5px");
        $(span).append(title);
        $(span).append("<u>You will learn how to:</u>");
        var learnList = document.createElement("ul");
        _.each(module.learn, function(item) {
            var e = document.createElement("li");
            e.innerHTML = item;

            $(learnList).append(e);
        })
        $(span).append(learnList);
        return span;
    }

    self.create = function(modules, onSelectCallback) {
        var selector = $(".moduleOptions");
        selector.empty();
        _.each(modules, function(module) {
            if (module.name) {
                var m = makeModule(module, onSelectCallback);
                $(m).on('click', function () {
                    onSelectCallback(module); 
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
    self.create = function(module, scenes, isSceneCompleted, onSelectCallback) {
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

        _.each(module.nodes, function(id) {
            graph.addNode(id, {label: scenes[id].name, id: id});
        });

        _.each(module.edges, function(edge) {
            graph.addEdge(null, edge[0], edge[1]);
        });

        // perform layout
        var renderer = new dagreD3.Renderer();
        renderer.zoom(false);
        var layout = dagreD3.layout()
                            .rankDir("LR");
        renderer.layout(layout).run(graph, d3.select(".puzzleSelector svg g"));

        // color rectangles
        var nodes = d3.selectAll(".puzzleSelector .node")[0];

        // setup onclick behavior
        var SANDBOX_LEVEL_ID = 'tutorial.sandbox';

        var COLOR_MAP = {
            completed: "green",
            available: "orange",
            unavailable: "gray"
        };

        nodes.forEach(function (x) { 
            if (graph.predecessors(x.id).every(isSceneCompleted)) {
                x.onclick = function() {
                    onSelectCallback(x.id);
                };
                if (isSceneCompleted(x.id)) {
                    x.children[0].style.fill = colors[COLOR_MAP.completed];
                } else {
                    x.children[0].style.fill = colors[COLOR_MAP.available];
                }
            } else {
                x.children[0].style.fill = colors[COLOR_MAP.unavailable];
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
        placeblock: "media/blockSvgs/placeblock.svg",
        removeblock: "media/blockSvgs/removeblock.svg",
        up: "media/blockSvgs/up.svg",
        down: "media/blockSvgs/down.svg",
        repeat: "media/blockSvgs/repeat.svg",
        repeat4: "media/blockSvgs/repeat4.svg",
        repeat5: "media/blockSvgs/repeat5.svg",
        repeat9: "media/blockSvgs/repeat9.svg",
        go: "media/goButton.png",
        rotateCW: "media/rotateCWButton.png",
        rotateCCW: "media/rotateCCWButton.png",
        camera: "media/cameraControls.png",
        learn: "media/learnButton.png",
        workshop: "media/workshopButton.png",
        clear: "media/clearSandboxButton.png",
        speedSlider: "media/speedSlider.png"
    }

    var uiIdMap = {
        go: "btn-run",
        rotateCW: "camera-rotate-right",
        rotateCCW: "camera-rotate-left",
        camera: "camera-controls",
        learn: "btn-modules",
        workshop: "btn-workshop",
        clear: "button_header_clear_sandbox",
        speedSlider: "speed-slider"
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
        if (instructions) {
            $('#instructions-goal').html(processTemplate(instructions.summary));
            $('#instructions-detail').html(processTemplate(instructions.detail));
        }
        $('#instructions-container').css('visibility', 'visible');
        setSize(doStartLarge, cb, false)();
        makeImgOnClick();
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
        console.log('setting to ' + isVisible.toString());
        $('#cube-counter').css('display', isVisible ? 'block' : 'none');
        var n = 0;
        $('#cube-counter').html(n.toString() + " cubes placed.");
    };

    self.update = function(count) {
        $('#cube-counter').html(count + " cubes placed.");
    }

    return self;
}());

module.Dialog = (function() {
    self = {};

    self.show = function(content, style) {
        var dialog = document.getElementById('dialog');

        // Copy all the specified styles to the dialog.
        for (var name in style) {
          dialog.style[name] = style[name];
        }
        dialog.appendChild(content);
        dialog.style.visibility = 'visible';
        dialog.style.zIndex = 1;
    }

    self.hide = function () {
        var dialog = document.getElementById('dialog');
        dialog.style.visibility = 'hidden';
    }

    return self;
}());

return module;
}());

