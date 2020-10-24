var RuthefjordTranslate = (function () {
    "use strict";
    var string = "";

    self.logJson = function () {
        console.log(JSON.stringify(RuthefjordBlockly.getProgram()));
    };

    self.extractCommands = function () {
        var program = RuthefjordBlockly.getProgram();
        var body = program['body'];
        var commands = [];
        for (var i = 0; i < body.length; i++){
            commands.push(body[i]);
        }

        return commands;
    };

    self.buildString = function () {
        var commands = extractCommands();
        buildStringHelper(commands);
    }

    self.buildStringHelper = function (commands) {
        console.log("In Helper! Commands are");
        console.log(commands.length);
        console.log(commands);
        for (var i = 0; i < commands.length; i++){
            var command = commands[i];
            var type = command['type'];
            console.log("looping");
            console.log(type);
            if (type == 'execute') {
                var name = command['name'];
                var args = command['args'];
                if (name == 'Forward') {
                    forward(args);
                } else if (name[0] == 'Left') {
                    left();
                } else if (name[0] == 'Right') {
                    right();
                } else if (name[0] == 'PlaceCube') {
                    placeCube(args);
                } else if (name[0] == 'RemoveCube') {
                    removeCube();
                } else if (name[0] == 'Up') {
                    up(args);
                } else if (name[0] == 'Down') {
                    down(args);
                } else if (name[0] == '$') {
                    console.log("execute a procedure");
                }
            }
            else if (type == 'procedure'){ //Procedure
                var body = command['body'];
                procedure(body);
            }
            else if (type == 'repeat'){ //Loop
                var number = command['number'];
                var body = command['body']['body'];
                loop(body);
            }
        }
    }

    //Each Block Type
    self.forward = function (args) {
        console.log("found a forward");
    }

    self.left = function () {
        console.log("found a left");
    }

    self.right = function () {
        console.log("found a right");
    }

    self.placeCube = function (args) {
        console.log("found a placeCube");
    }

    self.removeCube = function (args) {
        console.log("found a removeCube");
    }

    self.up = function (args) {
        console.log("found a up");
    }

    self.down = function (args) {
        console.log("found a down");
    }

    self.loop = function (body) {
        console.log("recursing on a loop");
        console.log(body)
        buildStringHelper(body);
    }

    self.procedure = function (body) {
        console.log("recursing on a procedure");
        console.log(body)
        buildStringHelper(body);
    }




    return self;
}());