
var HackcraftUI = (function(){ "use strict";
var module = {};

/**
 * UI state changes for the different application states (e.g., title, puzzle).
 * Does not handle any of the model, simply shows the correct basic elements.
 */
module.State = (function(){ "use strict";
    var self = {};
    var current_state;

    function hideAll() {
        HackcraftUnity.Player.hide();
        $('.codeEditor, .puzzleModeUI, .sandboxModeUI, .levelSelector').hide();
    }

    var main_selector = '#mainLeftSide, #mainRightSide';

    self.goToTitle = function(cb) {
        current_state = 'title';

        hideAll();
        $('.codeEditor').show();
        HackcraftUnity.Player.show();
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
        $('.levelSelector').show();
        $(main_selector).removeClass('title');
        cb();
    };

    self.goToPuzzle = function(cb) {
        hideAll();
        $('.codeEditor, .puzzleModeUI').show();
        HackcraftUnity.Player.show();
        $(main_selector).removeClass('title');
        cb();
    };

    self.goToSandbox = function(cb) {
        hideAll();
        $('.codeEditor, .sandboxModeUI').show();
        HackcraftUnity.Player.show();
        $(main_selector).removeClass('title');
        cb();
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
        renderer.layout(layout).run(graph, d3.select(".levelSelector svg g"));

        // color rectangles
        var nodes = d3.selectAll(".levelSelector .node")[0];

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

    function makeSmall() {
        isLarge = false;
        var instContainer = $("#instructionsContainer")[0];
        instContainer.onclick = null;

        $("#instructionsBackground").removeClass("instructionsShow");
        $("#instructionsBackground").addClass("instructionsHide");
        $("#instructions-detail").removeClass("detailShow");
        $("#instructions-detail").addClass("detailHide");

        var detail = $("#instructions-detail")[0];
        detail.style.height = '0px';

        setTimeout(function() {
            if (!isLarge) {
                instContainer.style.height = "auto";
                instContainer.onclick = makeLarge;
            }
        }, 1000);
    }

    function makeLarge() {
        isLarge = true;
        var blockly = document.getElementById('blockly').contentWindow.document.body;
        var rect = $("svg g", blockly)[0].getBoundingClientRect();
        var instContainer = $("#instructionsContainer")[0];
        instContainer.style.top = '0px';
        instContainer.style.left = rect.width + 'px';
        instContainer.style.width = (blockly.getBoundingClientRect().width - rect.width) + 'px';
        instContainer.style.height = "100%";
        instContainer.onclick = null;

        $("#instructionsBackground").removeClass("instructionsHide");
        $("#instructionsBackground").addClass("instructionsShow");
        $("#instructions-detail").removeClass("detailHide");
        $("#instructions-detail").addClass("detailShow");

        $("#instructions").addClass("speechBubble");
        var inst = $("#instructions")[0];
        inst.style.webkitAnimationPlayState = "paused";
        inst.style.animationPlayState = "paused";

        var dragon = $("#dragonIcon")[0];
        $("#dragonIcon").addClass("speechBubble");
        dragon.style.webkitAnimationPlayState = "paused";
        dragon.style.animationPlayState = "paused";

        var goal = $("#instructions-goal")[0];

        var detail = $("#instructions-detail")[0];
        detail.style.height = "auto";

        //Hackcraft.setInstructions(instructions);

        setTimeout(function () {
            if (isLarge) { 
                dragon.style.visibility = "visible";
                goal.style.visibility = "visible";
                detail.style.visibility = "visible";
                dragon.style.webkitAnimationPlayState = "running";
                dragon.style.animationPlayState = "running";
                inst.style.webkitAnimationPlayState = "running";
                inst.style.animationPlayState = "running";
                instContainer.onclick = makeSmall;
            }
        }, 1000);
    }

    self.hide = function() {
        $('#instructionsContainer').css('visibility', 'hidden');
    }

    self.show = function(instructions) {
        if (instructions) {
            $('#instructions-goal').html(instructions.summary);
            $('#instructions-detail').html(instructions.detail);
        }
        $('#instructionsContainer').css('visibility', 'visible');
        makeLarge();
    }

    return self;
}());

module.RunButton = (function() {
    var self = {};

    self.update = function(isRunning) {
        var b = $('#btn-run')[0];
        if (isRunning) {
            b.innerText = "Reset";
            b.style.backgroundColor = "#B03737";
        } else {
            b.innerText = "Go!";
            b.style.backgroundColor = "#37B03F";
        }
    };

    return self;
}());

module.SpeedSlider = (function() {
    var self = {};

    self.initialize = function(onChangeCallback) {
        $( "#slider" ).slider({
            value: 0.22,
            min: 0.0,
            max: 1.0,
            step: 0.05,
            slide: function( event, ui ) {
                onChangeCallback(ui.value);
            }
        });
        // start invisible
        self.setVisible(false);
    };

    self.setVisible = function(isVisible) {
        $('#sliderContainer').css('visibility', isVisible ? 'visible' : 'hidden');
    }

    self.value = function() {
        return $('#slider').slider("option", "value");
    };

    return self;
}());

return module;
}());

