var RuthefjordTranslate = (function () {
    "use strict";
    var codeString = "";
    var numIndents = 0;
    var indent = "    ";

    self.getPythonCode = function () {
        buildString();
        console.log(codeString);
        return codeString;
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
        //console.log("In Helper! Commands are");
        //console.log(commands.length);
        //console.log(commands);
        for (var i = 0; i < commands.length; i++){
            var command = commands[i];
            var type = command['type'];
            //console.log("looping");
            //console.log(type);
            if (type == 'execute') {
                var name = command['name'];
                var args = command['args'];
                //console.log(name);
                if (name == 'Forward') {
                    forward(args);
                } else if (name == 'Left') {
                    left();
                } else if (name == 'Right') {
                    right();
                } else if (name == 'PlaceCube') {
                    placeCube(args);
                } else if (name == 'RemoveCube') {
                    removeCube();
                } else if (name == 'Up') {
                    up(args);
                } else if (name == 'Down') {
                    down(args);
                } else if (name[0] == '$') {
                    userProcedure(name);
                    //console.log("execute a procedure");
                }
            }
            else if (type == 'procedure'){ //Procedure
                var body = command['body'];
                var name = command['name'];
                procedure(body, name);
            }
            else if (type == 'repeat'){ //Loop
                var number = command['number'];
                var body = command['body'];
                //console.log(body);
                loop(body, number['value']);
            }
        }
    }

    //Each Block Type
    self.forward = function (args) {
        //console.log("found a forward");
        var forwardString = 'forward('.concat(args[0]['value'],')');
        codeString = codeString.concat(indent.repeat(numIndents),forwardString,'\n');
        //console.log(forwardString);
        //console.log(numIndents);
    }

    self.left = function () {
        //console.log("found a left");
        var leftString = 'left()';
        codeString = codeString.concat(indent.repeat(numIndents),leftString,'\n');
    }

    self.right = function () {
        //console.log("found a right");
        var rightString = 'right()';
        codeString = codeString.concat(indent.repeat(numIndents),rightString,'\n');
    }

    self.placeCube = function (args) {
        //console.log("found a placeCube");
        var colors = ['green','purple','red','blue','yellow','orange','black','white'];
        var colorNum = parseInt(args[0]['value']);
        var placeCubeString = 'placeCube('.concat(colors[colorNum],')');
        //console.log(placeCubeString);
        codeString = codeString.concat(indent.repeat(numIndents),placeCubeString,'\n');
    }

    self.removeCube = function (args) {
        //console.log("found a removeCube");
        var removeCubeString = 'removeCube()'
        codeString = codeString.concat(indent.repeat(numIndents),removeCubeString,'\n');
    }

    self.up = function (args) {
        //console.log("found a up");
        var upString = 'up('.concat(args[0]['value'],')');
        //console.log(upString);
        codeString = codeString.concat(indent.repeat(numIndents),upString,'\n');
    }

    self.down = function (args) {
        //console.log("found a down");
        var downString = 'down('.concat(args[0]['value'],')');
        //console.log(downString);
        codeString = codeString.concat(indent.repeat(numIndents),downString,'\n');
    }

    self.userProcedure = function (name) {
        var userProcedureString = name.substring(1).concat('()');
        codeString = codeString.concat(indent.repeat(numIndents),userProcedureString,'\n');
    }

    self.loop = function (body, number) {
        //console.log("recursing on a loop");
        //console.log(body);
        var loopString = 'for i in range('.concat(number,'):');
        codeString = codeString.concat(indent.repeat(numIndents),loopString,'\n');
        numIndents = numIndents + 1;
        buildStringHelper(body);
        numIndents = numIndents - 1;
    }

    self.procedure = function (body, name) {
        //console.log("recursing on a procedure");
        //console.log(body);
        var procedureString = 'def '.concat(name.substring(1),'():');
        codeString = codeString.concat(indent.repeat(numIndents),procedureString,'\n');
        numIndents = numIndents + 1;
        buildStringHelper(body);
        numIndents = numIndents - 1;
        codeString = codeString.concat('\n');
    }




    return self;
}());