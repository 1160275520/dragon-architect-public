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
        RuthefjordDisplay.hide();
        RuthefjordDisplay.exit_viewer_mode(); // disable view & keyboard controls (HACK: this is only actually necessary when leaving the viewer, but this seems like a good place to put it)
        $('#main-view-game, .instructions, .view-loading, #player-consent, #alpha-msg, #attention-arrow, .codeEditor, .puzzleModeUI, .sandboxModeUI, .puzzleSelector, .packSelector, .galleryAccess, .gallerySelector, .viewerModeUI, .shareModeUI, .devModeOnly, .dialogUI').hide();
    }

    var main_selector = '#main-view-game, #main-view-code';

    self.goToLoading = function() {
        hideAll();
        $('.view-loading').show();
    };

    self.goToConsent = function() {
        hideAll();
        $('#player-consent').show();
    };

    self.goToAlphaMsg = function() {
        hideAll();
        $('#alpha-msg').show();
    };

    self.goToTitle = function(cb) {
        current_state = 'title';

        hideAll();
        $('.codeEditor, #main-view-game').show();
        RuthefjordDisplay.show();
        $(main_selector).addClass('title');

        cb();
    };

    self.goToIntro = function(cb) {
        // title has been removed (for now)
        //if (current_state !== 'title') {
        //    throw new Error('can only transition to intro from title!');
        //}
        current_state = 'intro';

        hideAll();
        $('.codeEditor, #main-view-game').show();
        RuthefjordDisplay.show();
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
        $('.codeEditor, #main-view-game, .puzzleModeUI').show();
        RuthefjordDisplay.show();
        $(main_selector).removeClass('title');
        cb();
    };

    self.goToSandbox = function(cb) {
        hideAll();
        $('.codeEditor, #main-view-game, .sandboxModeUI').show();
        RuthefjordDisplay.show();
        $(main_selector).removeClass('title');
        cb();
    };

    self.goToPackSelect = function(cb) {
        hideAll();
        $('.packSelector').show();
        cb();
    };

    self.goToGallery = function(cb) {
        hideAll();
        $('.gallerySelector').show();
        cb();
    };

    self.goToViewer = function(cb) {
        hideAll();
        $('.viewerModeUI, #main-view-game').show();
        RuthefjordDisplay.show();
        RuthefjordDisplay.viewer_mode();
        $('#main-view-game').css('width', '800px').css('margin', '0 auto');
        RuthefjordDisplay.onWindowResize();
        cb();
    };

    self.goToShare = function(cb) {
        hideAll();
        $('.shareModeUI').show();
        cb();
    };

    return self;
}());


module.Share = (function() {
    var self = {};
    var url = RUTHEFJORD_CONFIG.server.url;

    var submit = function (cb) {
        var message = $("#share-message");
        if (self.title) {
            var project_uuid = RuthefjordLogging.create_random_uuid();

            var upload = {id: project_uuid, author: RuthefjordLogging.userid, name: self.title,
                          time: (new Date()).toUTCString(), program: JSON.stringify(RuthefjordBlockly.getProgram()),
                          screen: $("#share-thumb").attr('src'), world_data: "", group: RUTHEFJORD_CONFIG.gallery.group};
            fetch(url + "/uploaded_project", {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(upload)
            }).then(function (response) { console.log(response); cb();});
        } else {
            message.html("Please enter a title");
            message.show();
            message.stop().animate({opacity: '100'});
            message.fadeOut(2000, "swing", function () {message.html("");});
        }
    };

    self.create = function (cb) {
        self.title = "";
        $("#share-edit-title").text("(click to add a title)");
        $("#share-edit-title").editable(
            function(enteredText, unused) { self.title = enteredText; return enteredText; },
            {
                tooltip: 'Click to edit...',
                style: "font-size:95%",
                select: true, // text starts selected
                onblur: 'submit' // clicking outside keeps instead of cancels changes
            }
        );
        RuthefjordDisplay.screenshot("share-thumb");
        RuthefjordUI.State.goToShare(function () {});
        $("#btn-share-submit").off('click'); // clear previous handler
        $("#btn-share-submit").on('click', function () {submit(cb);});
    };

    return self;
}());

module.Gallery = (function() {
    var self = {};

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
        thumb.id = item.id;
        thumb.src = item.screen;
        $(content).append(thumb);

        var controls = document.createElement("div");
        var viewBtn = document.createElement("button");
        viewBtn.innerHTML = "View";
        $(viewBtn).addClass("control-btn galleryButton");
        function viewItem() {
            // HACK: could clobber some important state, probably not a problem in workshop mode
            RuthefjordWorldState.init();
            RuthefjordManager.Simulator.get_final_state(JSON.parse(item.program), RuthefjordWorldState);
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
        _.forEach(items, function(item) {
            if (item.name) {
                var i = makeItem(item, sandboxCallback);
                selector.append(i);
            }
        });
    };

    return self;
}());


// TODO move hard-coded graph spec to config file of some kind
var colors = {
    teal: "#5BA68D",
    brown: "#A6875B",
    purple: "#995BA6",
    green: "#5BA65B",
    gray: "#777777",
    orange: "#FFB361"
};

module.PackSelect = (function() {
    var self = {};

    function makePack(pack, isCompleted) {
        var span = document.createElement("span");
        span.id = 'pack_' + pack.name;
        $(span).addClass('packOption');
        if (isCompleted) {
            span.style.background = colors.green;
        } else {
            span.style.background = colors.orange;
        }
        var title = document.createElement("p");
        title.innerHTML = pack.name;
        $(title).css("font-weight", "700");
        $(title).css("padding-bottom", "5px");
        $(span).append(title);
        if (pack.learn && pack.learn.length > 0) {
            $(span).append("<u>You will learn how to:</u>");
            var learnList = document.createElement("ul");
            _.forEach(pack.learn, function(item) {
                var e = document.createElement("li");
                e.innerHTML = item;
                $(learnList).append(e);
            });
            $(span).append(learnList);
        }
        return span;
    }

    self.create = function(packs, progress, onSelectCallback) {
        var selector = $(".packOptions");
        selector.empty();
        _.forEach(packs, function(pack) {
            if (pack.name && (!pack.prereq || pack.prereq.every(function (packName) { return progress.is_pack_completed(packs[packName]); }))) {
                var m = makePack(pack, progress.is_pack_completed(pack));
                $(m).on('click', function () {
                    onSelectCallback(pack);
                });
                selector.append(m);
            }
        });
    };

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

        var graph = new dagreD3.graphlib.Graph().setGraph({rankdir: 'LR'});

        _.forEach(pack.nodes, function(id) {
            graph.setNode(id, {label: scenes[id].name, id: id});
        });

        graph.setDefaultEdgeLabel(function() { return {}; });
        _.forEach(pack.edges, function(edge) {
            graph.setEdge(edge[0], edge[1], {lineInterpolate: "basis"});
        });

        // render graph
        var renderer = new dagreD3.render();
        renderer(d3.select(".puzzleSelector svg g"), graph);

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

        // set up image of back to sandbox button
        $(".instructions-img").each(function() {
            if ($(this).attr("data-uiid")) {
                var uiElem = $($(this).attr("data-uiid"));
                $(this).on('click', function (ev) {
                    ev.stopPropagation();
                    var arrowTarget = $(this).attr("data-uiid");
                    var arrow = $("#attention-arrow");
                    arrow.css("display", "block");
                    module.Arrow.positionLeftOf(uiElem);
                    arrow.stop().animate({opacity: '100'});
                    arrow.fadeOut(5000, "swing", function() { arrowTarget = ""; });
                });
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
        SquareProc: "media/blockSvgs/SquareProc.svg",
        UpCubeCall: "media/blockSvgs/UpCubeCall.svg",
        FixedCastleProc: "media/blockSvgs/FixedCastleProc.svg",
        FixedTowerProc: "media/blockSvgs/FixedTowerProc.svg",
        FixedWallProc: "media/blockSvgs/FixedWallProc.svg",
        go: "media/goButton.png",
        rotateCW: "media/rotateCWButton.png",
        rotateCCW: "media/rotateCCWButton.png",
        camera: "media/cameraControls.png",
        learn: "media/learnButton.png",
        workshop: "media/workshopButton.png",
        clear: "media/clearSandboxButton.png",
        speedSlider: "media/speedSlider.png",
        done: "media/doneButton.png",
        pinkboxGround: "media/pinkboxGround.png",
        pinkboxUp: "media/pinkboxUp.png",
        castle: "media/blockSvgs/castle.svg",
        wall: "media/blockSvgs/wall.svg",
        tower: "media/blockSvgs/tower.svg",
        towerlayer: "media/blockSvgs/towerlayer.svg",
        towertop: "media/blockSvgs/towertop.svg",
        wallsheet: "media/blockSvgs/wallsheet.svg",
        walltop: "media/blockSvgs/walltop.svg",
        pillarProc: "media/blockSvgs/pillarProc.svg",
        procDef: "media/blockSvgs/procDef.svg",
        bridge: "media/bridge.png",
        cube: "media/cube.png",
        purple_cube: "media/purple_cube.png",
    };

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
    };

    function makeImgHtml(file, uiId) {
        var html = "<object class=\"instructions-img\" data=\"" + file + "\" style=\"vertical-align:middle\"";
        if (uiId) {
            html += " data-uiid=\"#" + uiId + "\"";
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
            if ($(this).attr("data-uiid")) {
                var uiElem = $($(this).attr("data-uiid"));
                $(this).on('click', function (ev) {
                    ev.stopPropagation();
                    if (arrowTarget === "" || arrowTarget !== $(this).attr("data-uiid")) {
                        arrowTarget = $(this).attr("data-uiid");
                        var arrow = $("#attention-arrow");
                        arrow.css("display", "block");
                        module.Arrow.positionLeftOf(uiElem);
                        arrow.stop().animate({opacity: '100'});
                        arrow.fadeOut(5000, "swing", function() { arrowTarget = ""; });
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
        $('#instructions-display').hide();
    };

    function makeInstructions(target, container, dragon, content, next) {
        // position and show box
        var coords, offset, block, reverse, rect;
        var editor = $("#blockly");
        switch (target.type) {
            case "ui":
                coords = $(target.name).offset();
                offset = {left: -2 * RuthefjordUI.Arrow.width(), top: -dragon.height()};
                coords.height = $(target.name).innerHeight();
                break;
            case "world":
                // for now we assume the only world target is either a robot target or a cube target
                var vec = RuthefjordDisplay.getScreenCoordsForTargets();
                var threejs = $("#three-js").offset();
                coords = {left: vec.x + threejs.left, top: vec.y + threejs.top, height:0};
                offset = {left: -2 * RuthefjordUI.Arrow.width(), top: -dragon.height()};
                break;
            case "general":
                container.css('left', (editor.width() / 2 + editor.offset().left) + 'px');
                container.css('top', (editor.height() / 2 + editor.offset().top) + 'px');
                break;
            case "block":
                block = RuthefjordBlockly.instructions_block;
                if (block) {
                    coords = $(block.svgGroup_).offset();
                    rect = $(block.svgGroup_).get()[0].getBoundingClientRect();
                    coords.left += editor.offset().left + rect.width;
                    coords.top += editor.offset().top;
                    coords.height = rect.height;
                    reverse = true;
                    offset = {left: 20, top: dragon.height()};
                } else {
                    throw new Error("no block set as instructions_block");
                }
                break;
            case "toolbox":
                var toolbox = Blockly.getMainWorkspace().flyout_;
                block = $(_.find(toolbox.workspace_.getAllBlocks(), function (b) { return b.type === target.name}).svgGroup_);
                rect = block.get()[0].getBoundingClientRect();
                coords = block.offset();
                coords.left += editor.offset().left + rect.width;
                coords.top += editor.offset().top;
                coords.height = rect.height;
                reverse = true;
                offset = {left: 20, top: dragon.height()};
                break;
            default:
                throw new Error(target.type + " not a recognized target type");
        }
        if (coords) {
            container.css('left', (coords.left + offset.left) + 'px');
            container.css('top', (coords.top + offset.top) + 'px');
        }
        function showContent() {
            container.off('transitionend');
            container.off('click');
            // animate and show content
            dragon.show({duration: 1000, queue: false});
            content.show({duration: 1000, queue: false, complete: function () {
                makeImgOnClick();
                var text = $("<p>" + processTemplate(target.text) + "</p>");
                var current_text = $("p", content).first();
                current_text.css('font-size', '11pt');
                current_text.css('padding-top', '20px');
                current_text.css('height', '');
                content.prepend(text);
                var h = text.innerHeight();
                text.css("opacity", 0);
                text.css("height", "0px");
                text.animate({opacity:1, height:h+"px"}, 1000, function () {
                    if (coords) {
                        RuthefjordUI.Arrow.show(coords, reverse);
                    }
                    if (next) {
                        next();
                    }
                    container.on('click', function () {
                        container.off('click');
                        if (next) {
                            if (self.timeouts) {
                                _.forEach(self.timeouts, function (id) {
                                    clearTimeout(id);
                                });
                                self.timeouts = [];
                                container.finish();
                                dragon.finish();
                                content.finish();
                                $("p", content).finish();
                            }
                            next(true);
                        }
                    });
                });
            }});
        }
        if (container.is(":visible")) {
            container.off('transitionend');
            container.on('transitionend', showContent);
        } else {
            container.show({duration: 400, queue: false, start: function () {
                container.css('transition', '');
                container.css('-webkit-transition', '');
            }, done: function () {
                container.css('transition', 'all 1s');
                container.css('-webkit-transition', 'all 1s');
            }});
            showContent();
        }
    }

    function scheduleInstructions(targets, cb, now) {
        if (targets && targets.length > 0) {
            var target = targets[0];
            var remaining = targets.slice(1);
            var fn = remaining.length > 0 ? function (n) {scheduleInstructions(remaining, cb, n);} :
                function (n) { self.timeouts.push(setTimeout(function () {self.goHome()}, n ? 1 : 5000)); };
            if (now) {
                cb(target, fn);
            } else if (target.delay) {
                self.timeouts.push(setTimeout(function () {
                    cb(target, fn);
                }, target.delay));
            } else {
                cb(target, fn);
            }
        }
    }

    self.show = function(instructions) {
        // setup
        if (self.timeouts) {
            _.forEach(self.timeouts, function (id) {
                clearTimeout(id);
            });
        }
        self.timeouts = [];
        var container = $('#instructions-display');
        container.finish();
        container.hide();
        container.css('width', '250px');
        var dragon = $("#instructions-icon");
        dragon.finish();
        dragon.hide();
        var content = $('#instructions-goal');
        content.finish();
        $("p", content).finish();
        content.empty();
        content.hide();
        RuthefjordUI.Arrow.hide();

        self.targets = instructions.targets;

        scheduleInstructions(instructions.targets, function (target, next) {
            makeInstructions(target, container, dragon, content, next);
        });
    };

    self.goHome = function() {
        var container = $('#instructions-display');
        var neighbor = $("#game-controls-bar-bottom");
        container.off('click');
        container.css('left', neighbor.offset().left + 'px');
        container.css('top', (neighbor.offset().top + neighbor.innerHeight()) + 'px');
        container.css('width', neighbor.innerWidth() + 'px');
        var instructions = $("p", $("#instructions-goal"));
        instructions.css('height', '');
        instructions = instructions.get().reverse();
        if (self.targets && self.targets.length === instructions.length) {
            for (var i = 0; i < self.targets.length; i++) {
                if (self.targets[i].home_text) {
                    instructions[i].innerHTML = processTemplate(self.targets[i].home_text);
                }
            }
        }
    };

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
            _.forEach(errors, function(error) {
                var item = document.createElement("li");
                $(item).html(error);
                list[0].appendChild(item);
            });
            $("#instructions-errors-title").addClass("populated");
            list.addClass("populated");
            setSize(true, null, true)();
        }
    };

    return self;
}());

module.Arrow = (function() {
    var self = {};

    self.positionLeftOf = function(uiElem) {
        var arrow = $("#attention-arrow");
        arrow.css("top", (uiElem.offset().top - arrow.height()/2 + uiElem.outerHeight()/2) + 'px');
        arrow.css("left", (uiElem.offset().left - arrow.width()) + 'px');
        arrow.css("animation-name", "trash-arrow");
        arrow.css("-webkit-animation-name", "trash-arrow");
    };

    self.positionAt = function(top, left, height) {
        var arrow = $("#attention-arrow");
        arrow.css("top", (top - arrow.height()/2 + height/2) + 'px');
        arrow.css("left", (left - arrow.width()) + 'px');
        arrow.css("animation-name", "trash-arrow");
        arrow.css("-webkit-animation-name", "trash-arrow");
    };

    self.show = function(coords, reverse) {
        var arrow = $("#attention-arrow");
        arrow.css("display", "block");
        arrow.css("opacity", 0);
        arrow.css("top", (coords.top - arrow.height()/2 + coords.height/2) + 'px');
        if (reverse) {
            arrow.css("animation-name", "trash-arrow-reverse");
            arrow.css("-webkit-animation-name", "trash-arrow-reverse");
            arrow.css("left", (coords.left + 10) + 'px');
        } else {
            arrow.css("animation-name", "trash-arrow");
            arrow.css("-webkit-animation-name", "trash-arrow");
            arrow.css("left", (coords.left - arrow.width()) + 'px');
        }
        arrow.stop().animate({opacity: 1});
        arrow.fadeOut(5000, "swing");
    };

    self.hide = function() {
        $("#attention-arrow").hide();
    };

    self.width = function() {
        return $("#attention-arrow").width();
    };

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

module.TurboButton = (function() {
    var self = {};

    self.update = function(isTurbo) {
        update_button('#btn-turbo', true, isTurbo, "Go Turbo Speed", "Go Normal Speed");
    };

    return self;
}());

module.ModeButton = (function() {
    var self = {};

    self.update = function(isWorkshopMode) {
        update_button('#btn-workshop', true, isWorkshopMode, "Enter Workshop", "Exit Workshop");
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

module.UndoButton = (function () {
    var self = {};

    self.update = function () {
        var btn = $('#btn-undo');
        btn.css('top', Blockly.getMainWorkspace().trashcan.top_ - btn.outerHeight(true));
    };

    return self;
}());

module.CameraControls = (function() {
    var self = {};

    self.setVisible = function(isVisible) {
        var camera_controls = $('#camera-controls');
        var control_bar = $("#game-controls-bar-top");
        isVisible ? camera_controls.show() : camera_controls.hide();
        control_bar.show();
        // check if we should hide or show the area containing camera controls (by checking if everything in it is hidden)
        if (control_bar.children().toArray().every(function (e) { return $(e).is(":hidden");})) {
            control_bar.hide();
            $("#three-js").css("margin-top", "5px"); // make sure this margin is there since the control bar won't provide it
        } else {
            control_bar.show();
            $("#three-js").css("margin-top", ""); // get rid of this margin since the control bar will provide it
        }
    };

    return self;
}());

/// a horizontal slider.
/// elemName is the name used for logging ui actions.
function Slider(elemName, selector, labels, allElems, default_val) {
    var self = {};
    self.MIN_STEP_SIZE = 0.01;
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
            value: default_val,
            min: 0.0,
            max: 1.0,
            step: self.MIN_STEP_SIZE,
            tooltip: 'hide'
        });
        slider.on("change", function(changeEvent) {
            var questLogger = RuthefjordLogging.activeTaskLogger;
                if (questLogger) {
                    questLogger.logDoUiAction(elemName, 'change', changeEvent.value);
                }
            onChangeCallback(changeEvent.value.newValue);
        });
        //slider.on("slideStart", function(slideEvent) {
        //    var questLogger = RuthefjordLogging.activeTaskLogger;
        //    if (questLogger) {
        //        questLogger.logDoUiAction(elemName, 'start', null);
        //    }
        //});
        //slider.on("slideStop", function(slideEvent) {
        //    var questLogger = RuthefjordLogging.activeTaskLogger;
        //    if (questLogger) {
        //        questLogger.logDoUiAction(elemName, 'stop', null);
        //    }
        //});
    };

    self.setStepSize = function(s) {
        slider.slider("setAttribute", "step", s);
    };

    self.getStepSize = function() {
        return slider.slider("getAttribute", "step");
    };

    self.setVisible = function(isVisible) {
        $(allElems.join(', ')).css('visibility', isVisible ? 'visible' : 'hidden');
    };

    self.setEnabled = function(isEnabled) {
        if (isEnabled) {
            slider.slider("enable");
            $(allElems.join(', ')).removeClass("disabled");
        } else {
            slider.slider("disable");
            $(allElems.join(', ')).addClass("disabled");
        }
        container.attr('title', isEnabled ? '' : "Can only use time slider in workshop mode.");
    };

    self.isEnabled = function() {
        return slider.slider("isEnabled");
    };

    self.value = function(x) {
        if (x === undefined) {
            return slider.slider("getValue");
        } else {
            slider.slider("setValue", x, false, false);
        }
    };

    return self;
}

module.SpeedSlider = Slider('speed-slider', '#speed-slider', ['Slow', ' <----- Speed ----->', 'Fast'], ["#speed-controls"], 0.25);

module.TimeSlider = Slider('time-slider', '#time-slider', ['Start', '<----- Time ----->', 'End'], ["#time-controls", ".btn-time-slider"], 0);

module.CubeCounter = (function() {
    var self = {};

    self.setVisible = function(isVisible) {
        //$('#cube-counter').css('display', isVisible ? 'block' : 'none');
        //var n = 0;
        //$('#cube-counter').html(n.toString() + " cubes placed.");
    };

    self.update = function(count) {
        $('#cube-counter').html(count + " cubes placed.");
    };

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
    var self = {};

    self.make = function(content, style) {
        // clear out any old contents
        module.Dialog.destroy();

        var dialog = $('#dialog');

        // Copy all the specified styles to the dialog.
        _.forEach(style, function(value, key) {
            dialog.css(key, value);
        });
        dialog.prepend(content);

        dialog.show();
    };

    self.defaultElems = function(msg, btn_msg) {
        var div = $('<div></div>');
        div.addClass("dialog-content");
        var dialogContent = $('<span></span>');
        dialogContent.append(document.createTextNode(msg));
        dialogContent.css("display", "block");
        dialogContent.css("text-align", "center");
        dialogContent.css("padding", "5px 0");

        var btn = $('<button></button>');
        btn.css("margin", "0 auto");
        btn.css("display", "block");
        btn.addClass("control-btn");
        btn.html(btn_msg);

        div.append(dialogContent);
        div.append(btn);
        return div;
    };

    self.destroy = function () {
        $(".dialog-content").remove();
        $(dialog).hide();
    };

    return self;
}());

module.WinMessage = (function() {
    var self = {};

    self.show = function(msg, btn_msg, cb) {
        var div = RuthefjordUI.Dialog.defaultElems(msg, btn_msg);
        var timeout = setTimeout(function () { RuthefjordUI.Dialog.destroy(); cb(); }, 5000);
        var btn = div.find("button");
        btn.css('font-size', '20pt');
        btn.on('click', function () { clearTimeout(timeout); RuthefjordUI.Dialog.destroy(); cb(); });
        var style = {width: '300px', top: '400px', left: '200px', "font-size": "30pt"};
        RuthefjordUI.Dialog.make(div, style);
    };

    return self;
}());

module.UnlockBlockMsg = (function() {
    var self = {};

    self.show = function(svg, cb) {
        var div = $('<div></div>');
        div.addClass("dialog-content");
        var btn = $('<button></button>');
        btn.css("font-size", "15pt");
        btn.addClass("control-btn");
        btn.html("Click here to unlock");
        btn.on('click', function () { RuthefjordUI.Dialog.destroy(); cb(); });
        div.append(btn);
        var rect = svg.getBoundingClientRect();
        var style = {width: '240px', top: (rect.top + $("#code-area").position().top) + 'px', left: (rect.left + 50) + 'px'};
        var dialog = $("#dialog");
        dialog.stop(true, true);
        RuthefjordUI.Dialog.make(div, style);
        dialog.fadeOut(4000, "swing", function() { RuthefjordUI.Dialog.destroy(); });
    };

    return self;
}());

module.DebugFeatureInfo = (function() {
    var self = {};
    var nextFeatureIndex = 0;
    self.features = [
        ["#time-slider", "Drag this slider to go to the beginning and end of your program"],
        // ["NONE", "Click on any cube to see which code block placed it"],
        ["#btn-step", "This button lets you run your program one block at a time"],
        ["#speed-slider", "Drag this slider to speed up or slow down your program"]
    ];

    self.hasNext = function() {
        return nextFeatureIndex < self.features.length;
    };

    self.showNext = function() {
        if (nextFeatureIndex >= self.features.length) {
            console.error("All debug features already covered!");
            return;
        }

        var uiElem;
        if (self.features[nextFeatureIndex][0] !== "NONE") {
            uiElem = $(self.features[nextFeatureIndex][0]);
        }
        var msg = self.features[nextFeatureIndex][1];
        nextFeatureIndex++;

        var div = RuthefjordUI.Dialog.defaultElems(msg, "Got it!");
        $(div).find('span').css('padding-bottom', '20px');

        var arrow = $("#attention-arrow");
        if (uiElem) {
            arrow.css("display", "block");
            module.Arrow.positionLeftOf(uiElem);
            arrow.stop().animate({opacity: '100'});
        }

        $(div).find("button").on('click', function () { RuthefjordUI.Dialog.destroy(); arrow.fadeOut(1000, "swing", function() { }); });

        var style = {width: '300px', top: '400px', left: '200px', "font-size": "20pt"};
        if (uiElem) {
            var rect = uiElem[0].getBoundingClientRect();
            style.top = rect.top + 'px';
            style.left = (rect.left - 450) + 'px';
        }

        RuthefjordUI.Dialog.make(div, style);
    };

    return self;
}());

module.confirmBackspaceNavigations = function() {
    // http://stackoverflow.com/a/22949859/2407309
    var isBackspacePressed = false;
    $(document).keydown(function(event){
        if (event.which == 8) {
            isBackspacePressed = true;
        }
    });
    $(document).keyup(function(event){
        if (event.which == 8) {
            isBackspacePressed = false;
        }
    });
    $(window).on('beforeunload', function(){
        if (isBackspacePressed) {
            isBackspacePressed = false;
            return "Are you sure you want to leave this page?"
        }
    });
};

return module;
}());

