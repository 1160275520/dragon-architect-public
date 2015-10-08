RuthefjordWorldState = (function() {
    "use strict";
    var self = {};

    self.UP = new THREE.Vector3(0,0,1);
    self.DOWN = new THREE.Vector3(0,0,-1);

    self.robot = {};
    // grid maps three-element arrays representing x y z position to integers representing color
    self.grid = {};

    self.init = function() {
        self.robot.pos = new THREE.Vector3();
        self.robot.dir = new THREE.Vector3();
    };

    self.save = function() {
        var botSave = {pos:self.robot.pos.clone(), dir:self.robot.dir.clone()};
        var gridSave = JSON.parse(JSON.stringify(self.grid));
        return {bot:botSave, grid:gridSave};
    };

    self.restoreFromSave = function(save) {
        self.robot = save.bot;
        self.grid = save.grid;
    };

    return self;
}());