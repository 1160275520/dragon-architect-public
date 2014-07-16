
var HackcraftUI = (function(){ "use strict";
var HackcraftUI = {};

HackcraftUI.instructions = (function() {

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

return HackcraftUI;
}());

