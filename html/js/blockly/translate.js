var RuthefjordTranslate = (function () {
    "use strict";
    var codeString = "";
    var numIndents = 0;
    var indent = "    ";
    var forwardUsed = false;
    var leftUsed = false;
    var rightUsed = false;
    var upUsed = false;
    var downUsed = false;
    var placeCubeUsed = false;
    var removeCubeUsed = false;

    self.getPythonCode = function () {
        buildString();
        // console.log(codeString);
        var codeStringCopy = codeString;
        codeString = ""
        forwardUsed = false;
        leftUsed = false;
        rightUsed = false;
        upUsed = false;
        downUsed = false;
        placeCubeUsed = false;
        removeCubeUsed = false;
        return codeStringCopy;
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
        importStatements();
    }

    self.buildStringHelper = function (commands) {
        //console.log("In Helper! Commands are");
        // console.log(commands.length);
        // console.log(commands);
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
            else if (type == 'assign'){ //Set block
                var value = command['value']['value'];
                var name = command['name'];
                set(name,value);
                // console.log("value" + value);
                // console.log("name" + name);
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
        var forwardString = 'forward('.concat(args[0]['value'],')');
        codeString = codeString.concat(indent.repeat(numIndents),forwardString,'\n');
        forwardUsed = true;
    }

    self.left = function () {
        var leftString = 'left()';
        codeString = codeString.concat(indent.repeat(numIndents),leftString,'\n');
        leftUsed = true;
    }

    self.right = function () {
        var rightString = 'right()';
        codeString = codeString.concat(indent.repeat(numIndents),rightString,'\n');
        rightUsed = true;
    }

    self.set = function (name, value) {
        var setString = name.concat(' = ', value);
        codeString = codeString.concat(indent.repeat(numIndents),setString,'\n');
        //not a function so no need to mark it used
    }

    self.placeCube = function (args) {
        var colors = ['green','purple','red','blue','yellow','orange','black','white'];
        var colorNum = parseInt(args[0]['value']);
        var placeCubeString = 'placeCube('.concat(colors[colorNum],')');
        codeString = codeString.concat(indent.repeat(numIndents),placeCubeString,'\n');
        placeCubeUsed = true;
    }

    self.removeCube = function (args) {
        var removeCubeString = 'removeCube()'
        codeString = codeString.concat(indent.repeat(numIndents),removeCubeString,'\n');
        removeCubeUsed = true;
    }

    self.up = function (args) {
        var upString = 'up('.concat(args[0]['value'],')');
        codeString = codeString.concat(indent.repeat(numIndents),upString,'\n');
        upUsed = true;
    }

    self.down = function (args) {
        var downString = 'down('.concat(args[0]['value'],')');
        codeString = codeString.concat(indent.repeat(numIndents),downString,'\n');
        downUsed = true;
    }

    self.userProcedure = function (name) {
        var userProcedureString = name.substring(1).concat('()');
        codeString = codeString.concat(indent.repeat(numIndents),userProcedureString,'\n');
    }

    self.loop = function (body, number) {
        var loopString = 'for i in range('.concat(number,'):');
        codeString = codeString.concat(indent.repeat(numIndents),loopString,'\n');
        numIndents = numIndents + 1;
        buildStringHelper(body);
        numIndents = numIndents - 1;
    }

    self.procedure = function (body, name) {
        var procedureString = 'def '.concat(name.substring(1),'():');
        codeString = codeString.concat(indent.repeat(numIndents),procedureString,'\n');
        numIndents = numIndents + 1;
        buildStringHelper(body);
        numIndents = numIndents - 1;
        codeString = codeString.concat('\n');
    }

    self.importStatements = function () {
        var previous = false;
        var importString = "from DragonArchitect import ";
        if (forwardUsed) {
            importString = importString.concat("forward");
            previous = true;
        }
        if (leftUsed) {
            if (previous) {
                importString = importString.concat(", ");
            }
            importString = importString.concat("turnLeft");
            previous = true;
        }
        if (rightUsed) {
            if (previous) {
                importString = importString.concat(", ");
            }
            importString = importString.concat("turnRight");
            previous = true;
        }
        if (upUsed) {
            if (previous) {
                importString = importString.concat(", ");
            }
            importString = importString.concat("up");
            previous = true;
        }
        if (downUsed) {
            if (previous) {
                importString = importString.concat(", ");
            }
            importString = importString.concat("down");
            previous = true;
        }
        if (placeCubeUsed) {
            if (previous) {
                importString = importString.concat(", ");
            }
            importString = importString.concat("placeCube");
            previous = true;
        }
        if (removeCubeUsed) {
            if (previous) {
                importString = importString.concat(", ");
            }
            importString = importString.concat("removeCube");
        }
        codeString = importString.concat("\n\n",codeString);
    }



    return self;
}());