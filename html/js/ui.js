
var HackcraftUI = (function(){ "use strict";
var module = {};

module.LevelSelect = (function() {
    var self = {};

    /**
     * @param onSelectCallback Invoked when a level is selected.
     * Will pass in one argument, an object with the following structure:
     * { id: <id of level>, puzzle: <PuzzleInfo object> }
     */
    self.create = function(module, scenes, onSelectCallback) {
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
        var SANDBOX_LEVEL_ID = 'tl_final';

        function is_completed(level) {
            //return levelsCompleted.indexOf(level) !== -1;
            return true;
        }

        var COLOR_MAP = {
            completed: "green",
            available: "orange",
            unavailable: "gray"
        };

        nodes.forEach(function (x) { 
            if (graph.predecessors(x.id).every(is_completed)) {
                x.onclick = function() {
                    onSelectCallback({id:x.id, puzzle:scenes[x.id]});
                };
                if (is_completed(x.id)) {
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

    function makeSmall() {
        var instContainer = $("#instructionsContainer")[0];
        instContainer.onclick = null;

        $("#instructionsBackground").removeClass("instructionsShow");
        $("#instructionsBackground").addClass("instructionsHide");
        $("#instructions-detail").removeClass("detailShow");
        $("#instructions-detail").addClass("detailHide");

        var detail = $("#instructions-detail")[0];
        detail.style.height = '0px';

        setTimeout(function() {
            // instContainer.style.width = "50px";
            instContainer.style.height = "auto";
            instContainer.onclick = makeLarge;
        }, 1000);
    }

    function makeLarge() {
        var rect = $("svg g")[0].getBoundingClientRect();
        var instContainer = $("#instructionsContainer")[0];
        instContainer.style.top = '0px';
        instContainer.style.left = rect.width + 'px';
        instContainer.style.width = ($("#blockly")[0].getBoundingClientRect().width - rect.width) + 'px';
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
            dragon.style.visibility = "visible";
            goal.style.visibility = "visible";
            detail.style.visibility = "visible";
            dragon.style.webkitAnimationPlayState = "running";
            dragon.style.animationPlayState = "running";
            inst.style.webkitAnimationPlayState = "running";
            inst.style.animationPlayState = "running";
            instContainer.onclick = makeSmall;
        }, 1000);
    }

    self.hide = function() {
        $('#instructions-goal').css('visibility', 'hidden');
    }

    self.show = function(instructions) {
        if (instructions) {
            $('#instructions-goal').html(instructions.summary);
            $('#instructions-detail').html(instructions.detail);
        }
        makeLarge();
    }

    return self;
}());

return module;
}());

