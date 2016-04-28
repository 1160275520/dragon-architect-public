var RuthefjordWorldState = (function() {
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
        self.grid = {};
        self.dirty = false;
    };

    // returns a JSON string representing the world state
    self.save = function() {
        return JSON.stringify(self.clone());
    };

    // loads the world state from a JSON string
    self.setFromSave = function(save) {
        if (save) {
            self.setFromClone(JSON.parse(save));
        }
    };

    self.setFromClone = function(c) {
        if (c) {
            self.robot = {};
            self.robot.pos = new THREE.Vector3(c.robot.pos.x, c.robot.pos.y, c.robot.pos.z);
            self.robot.dir = new THREE.Vector3(c.robot.dir.x, c.robot.dir.y, c.robot.dir.z);
            self.grid = c.grid;
            self.dirty = true;
        }
    };

    self.clone = function() {
        var c = {};
        c.robot = {
            pos: self.robot.pos.clone(),
            dir: self.robot.dir.clone()
        };
        c.grid = JSON.parse(JSON.stringify(self.grid));
        return c;
    };

    // this is dumb, but it didn't seem possible to have the thing clone returns
    // have its own clone method without completely changing how I've set this up
    self.cloneState = function(state) {
        var c = {};
        c.robot = {
            pos: state.robot.pos.clone(),
            dir: state.robot.dir.clone()
        };
        c.grid = JSON.parse(JSON.stringify(state.grid));
        return c;
    };

    return self;
}());