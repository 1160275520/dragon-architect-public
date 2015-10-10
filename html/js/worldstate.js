RuthefjordWorldState = (function() {
    "use strict";
    var self = {};

    self.UP = new THREE.Vector3(0,0,1);
    self.DOWN = new THREE.Vector3(0,0,-1);

    self.robot = {};
    // grid maps strings of three-element arrays representing x y z position to integers representing color
    self.grid = {};

    self.init = function() {
        self.robot.pos = new THREE.Vector3(0,0,0);
        self.robot.dir = new THREE.Vector3(1,0,0);
        self.dirty = false;
    };

    // returns a JSON string representing the world state
    self.save = function() {
        var botSave = {pos:self.robot.pos.clone(), dir:self.robot.dir.clone()};
        var gridSave = JSON.parse(JSON.stringify(self.grid));
        return JSON.stringify({bot:botSave, grid:gridSave});
    };

    // loads the world state from a JSON string
    self.restoreFromSave = function(save) {
        if (save) {
            save = JSON.parse(save);
            self.robot = {};
            self.robot.pos = new THREE.Vector3(save.bot.pos.x, save.bot.pos.y, save.bot.pos.z);
            self.robot.dir = new THREE.Vector3(save.bot.dir.x, save.bot.dir.y, save.bot.dir.z);
            self.grid = save.grid;
            self.dirty = true;
        }
    };

    return self;
}());