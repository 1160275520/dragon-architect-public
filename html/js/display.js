var RuthefjordDisplay = (function() {
    "use strict";
    var self = {};

    var camera, scene, renderer, stats, parent;
    var cubeGeo, targetGeo, cubeTargetMat;
    var cubes, robot, zLine, zLineMat, zCuePlane, robotTarget, targetShadow;

    // constants
    var WOBBLE_PERIOD = 4.0;
    var WOBBLE_MAGNITUDE = 0.05;
    var TRANSLATION_SMOOTHNESS = 1.5; // The relative speed at which the camera will catch up.
    var ROTATION_SMOOTHNESS = 5.0; // The relative speed at which the camera will catch up.
    var MAX_ANIMATION_TIME = 0.2; // if animation would take longer than this, take this time and then just sit idle
    var MIN_ANIMATION_TIME = 0.1; // if animation would take less than this, just don't bother animating anything


    // positioning
    var relativeCamPos = new THREE.Vector3(-10,0,12);
    var relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
    var robotOffset = new THREE.Vector3(0.5,0.5,1.5);
    var cubeOffset = new THREE.Vector3(0.5,0.5,0.5);

    // the colors are 1-indexed for some reason
    var cubeMats = [];
    self.cubeColors = ["#1ca84f", "#a870b7", "#ff1a6d", "#00bcf4", "#ffc911", "#ff6e3d", "#000000", "#ffffff"];

    //animation
    var animStatus = false;
    var animTime, waitTime, finalBotPos, finalBotQ;

    function radiansOfDegrees(deg) {
        return deg / 180 * Math.PI;
    }

    /**
     * AXES
     * positive x is forward
     * positive y is left
     * positive z is up
     */

    self.init = function(parentSelector) {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
        self.clock = new THREE.Clock();
        self.oldTime = 0;
        cubes = {};
        cubes.targets = [];
        finalBotPos = new THREE.Vector3();
        finalBotQ = new THREE.Quaternion();

        renderer = new THREE.WebGLRenderer( {antialias: true} );
        parent = $(parentSelector);
        renderer.setSize(parent.width(), parent.height());
        camera.aspect = parent.width() / parent.height();
        camera.up.set(0,0,1);
        camera.updateProjectionMatrix();
        parent.append(renderer.domElement);
        self.renderOut = false;

        // FPS display
        stats = new Stats();
        stats.setMode( 0 ); // 0: fps, 1: ms, 2: mb
        // align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        // @ifdef DEV
        parent.append(stats.domElement);
        // @endif

        // skybox
        var path = "media/skybox/";
        var format = ".jpg";
        // it's not clear to me three js does what it says it does with the six images, but I've got everything lining
        // up via trial and error
        var texes = [path + "px" + format, path + "nx" + format,
            path + "py" + format, path + "ny" + format,
            path + "pz" + format, path + "nz" + format];
        var cubeMap = THREE.ImageUtils.loadTextureCube(texes);
        //cubeMap.format = THREE.RGBFormat;
        // code from http://blog.romanliutikov.com/post/58705840698/skybox-and-environment-map-in-threejs
        var shader = THREE.ShaderLib['cube']; // init cube shader from built-in lib
        shader.uniforms['tCube'].value = cubeMap; // apply textures to shader

        // create shader material
        var skyBoxMaterial = new THREE.ShaderMaterial( {
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: shader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        });

        // create skybox mesh
        var skybox = new THREE.Mesh(
            new THREE.CubeGeometry(1000, 1000, 1000),
            skyBoxMaterial
        );

        scene.add(skybox);

        // cube geometry, materials
        cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        var tex = THREE.ImageUtils.loadTexture("media/canvas_cube.png");
        _.forEach(self.cubeColors, function (color) {
            cubeMats.push(new THREE.MeshLambertMaterial({color:color, map:tex}));
            cubes[color] = {meshes:[]};
        });
        targetGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        cubeTargetMat = new THREE.MeshLambertMaterial({color:"#4078E6", transparent: true, opacity:0.5});
        robotTarget = new THREE.Mesh(targetGeo, new THREE.MeshLambertMaterial({color:"#df67be", transparent: true, opacity:0.5}));
        targetShadow = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1, 32),
            new THREE.MeshBasicMaterial({color:"#686868", transparent: true, opacity: 0.31, side: THREE.DoubleSide}));

        // ground plane
        var geometry = new THREE.PlaneBufferGeometry(100, 100, 32);
        tex = THREE.ImageUtils.loadTexture("media/outlined_cube.png");
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(100, 100);
        var material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        var plane = new THREE.Mesh(geometry, material);
        scene.add( plane );

        // robot
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        material = new THREE.MeshLambertMaterial( {color: "#f56e90"} );
        robot = new THREE.Mesh(geometry, material);
        var robotDir = new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,0),1,"#ff0000",0.5,0.2);
        robot.add(robotDir);
        zLineMat = new THREE.MeshBasicMaterial( {color: 0xf2c2ce} );
        geometry = new THREE.PlaneBufferGeometry(1, 1, 32);
        tex = THREE.ImageUtils.loadTexture("media/y-cue.png");
        material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        zCuePlane = new THREE.Mesh(geometry, material);
        scene.add(zCuePlane);
        //zCuePlane.rotateOnAxis(new THREE.Vector3(1,0,0), Math.PI/2);
        scene.add(robot);

        // lights
        var light = new THREE.DirectionalLight("#ffffff", 1.74);
        //light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
        light.position.set(-0.56,-0.32,0.77);
        scene.add(light);
        scene.add(new THREE.AmbientLight("#404040"));

        // camera init
        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0,0,0));
        self.rotateCamera(-10);

        robot.position.copy(robotOffset);

        self.clock.start();
        requestAnimationFrame(update); // change to render to omit fps display
    };

    self.screenshot = function(id) {
        self.renderOut = {id: id};
    };

    // necessary for fps display
    var update = function () {
        stats.begin();
        var t = self.clock.getElapsedTime();
        var dt = Math.min(t - self.oldTime, 0.1);
        self.oldTime = t;
        //if (dt > 0.1) {
        //    console.error("large dt", dt);
        //} else {
            var transition_time = RuthefjordManager.Simulator.update(dt, t, RuthefjordWorldState);
            RuthefjordPuzzle.check_win_predicate();
            if (RuthefjordWorldState.dirty) {
                self.setDisplayFromWorld(transition_time);
            }
            render(dt, t);
            if (self.renderOut) {
                console.log(renderer.domElement.toDataURL());
                onRuthefjordEvent("onScreenshot", {id: self.renderOut.id, src: renderer.domElement.toDataURL()});
                self.renderOut = false;
            }
        //}
        stats.end();
        requestAnimationFrame(update);
    };

    function makeZLine() {
        scene.remove(zLine);
        if (zLine) {
            zLine.geometry.dispose();
        }
        var grid = RuthefjordWorldState.grid;
        // find nearest filled cell below robot
        // use robot.position (instead of RuthefjordWorldState.robot.pos), so height is correct when animating
        // use Math.floor to compensate for robotOffset
        var height = robot.position.z;
        for (var z = Math.floor(robot.position.z); z >= 0; z--) {
            if (grid.hasOwnProperty([Math.floor(robot.position.x), Math.floor(robot.position.y), z])) {
                height -= z + (robotOffset.z - cubeOffset.z);
                break;
            }
        }
        var geometry = new THREE.CylinderGeometry(0.1, 0.1, height, 32);
        zLine = new THREE.Mesh(geometry, zLineMat);
        zLine.position.copy(robot.position);
        zLine.translateZ(-height / 2);
        zLine.rotateOnAxis(new THREE.Vector3(1,0,0), Math.PI / 2);
        scene.add(zLine);
        zCuePlane.position.copy(robot.position);
        zCuePlane.translateZ(-height + 0.1); // offset a bit to avoid z-fighting
    }

    function render(tDelta, tTotal) {
        var z = WOBBLE_MAGNITUDE * Math.sin(tTotal * 4 * Math.PI / WOBBLE_PERIOD);
        var y = WOBBLE_MAGNITUDE * Math.cos(tTotal * 2 * Math.PI / WOBBLE_PERIOD);
        var v = new THREE.Vector3(0, y, z);

        switch (animStatus) {
            case "waiting":
                waitTime -= tDelta;
                if (waitTime > 0) {
                    break;
                }
                tDelta += waitTime; // wait time is negative, carry over into animating
                animStatus = "animating";
                // deliberate case fall-through since wait time is up if we get here
            case "animating":
                robot.position.lerp(finalBotPos, Math.min(tDelta / animTime, 1));
                robot.quaternion.slerp(finalBotQ, Math.min(tDelta / animTime, 1));
                animTime -= tDelta;
                if (animTime <= 0) {
                    robot.position.copy(finalBotPos);
                    robot.quaternion.copy(finalBotQ);
                    animStatus = "done";
                }
                break;
        }
        makeZLine();

        var newCamPos = v.add(relativeCamPos).add(robot.position);
        camera.position.lerp(newCamPos, TRANSLATION_SMOOTHNESS * tDelta);

        // Couldn't figure out how to reimplement technique from Unity code
        // There's probably something better than my hack
        var oldCamQ = camera.quaternion.clone();
        camera.lookAt(robot.position);
        var newCamQ = camera.quaternion.clone();
        camera.quaternion.copy(oldCamQ);
        camera.quaternion.slerp(newCamQ, ROTATION_SMOOTHNESS * tDelta);

        renderer.render( scene, camera );
    }

    function Vector3FromString(str) {
        var ret = new THREE.Vector3();
        ret.fromArray(JSON.parse("["+str+"]"));
        return ret;
    }

    self.setDisplayFromWorld = function(dt) {
        var bot = RuthefjordWorldState.robot;
        var grid = RuthefjordWorldState.grid;

        if (bot) {
            // set robot goal position and direction
            finalBotPos.copy(bot.pos).add(robotOffset);
            finalBotQ.setFromUnitVectors(new THREE.Vector3(1, 0, 0), bot.dir); // 1,0,0 is default direction
            waitTime = dt*0.1;
            animTime = Math.min(dt*0.9, MAX_ANIMATION_TIME);
            animStatus = "waiting";
            if (animTime < MIN_ANIMATION_TIME) {
                animTime = 0;
                animStatus = "animating";
            }
            RuthefjordWorldState.dirty = false;
        }

        if (grid) {
            // set cubes
            // clear removed cubes, establish list of available meshes
            var available = [];
            var available_index = 0;
            var filled = {};
            // loop over existing meshes
            self.cubeColors.forEach(function (color) {
                available[color] = [];
                cubes[color].meshes.forEach(function (obj) {
                    if (!grid.hasOwnProperty(obj.pos)) { // previously allocated & positioned mesh no longer present
                        scene.remove(obj.mesh);
                        obj.pos = null;
                    } else {
                        filled[obj.pos] = true; // record this position as already filled
                    }
                    if (obj.pos === null) {
                        available[color].push(obj); // mesh unassigned, available to be positioned
                    }
                });
            });
            // loop over positions that need meshes
            for (var cubePos in grid) {
                var color = self.cubeColors[grid[cubePos]];
                // check if mesh already in place
                if (!filled[cubePos]) {
                    var cube;
                    if (available[color][available_index]) { // use existing mesh
                        cube = available[color][available_index++];
                        cube.pos = cubePos;
                    } else { // no free existing mesh, allocate a new mesh
                        cube = {
                            mesh: new THREE.Mesh(cubeGeo, cubeMats[grid[cubePos]]),
                            pos: cubePos
                        };
                        cubes[color].meshes.push(cube);
                    }
                    // add mesh to scene, position mesh
                    scene.add(cube.mesh);
                    cube.mesh.position.copy(Vector3FromString(cubePos)).add(cubeOffset);
                }
            }
        }
    };

    self.addRobotTarget = function(pos) {
        robotTarget.position.copy(pos).add(robotOffset);
        targetShadow.position.copy(robotTarget.position);
        targetShadow.position.setZ(0.01);
        scene.add(robotTarget);
        scene.add(targetShadow);
    };

    self.addCubeTargets = function(grid) {
        cubes.targets = [];
        for (var cubePos in grid) {
            var target = new THREE.Mesh(targetGeo, cubeTargetMat);
            target.position.copy(Vector3FromString(cubePos)).add(cubeOffset);
            cubes.targets.push(target);
            scene.add(target);
        }
    };

    self.clearTargets = function() {
        scene.remove(robotTarget);
        scene.remove(targetShadow);
        cubes.targets.forEach(function (target) {
            scene.remove(target);
        });
        cubes.targets = [];
    };

    self.rotateCamera = function(degrees) {
        var q = new THREE.Quaternion();
        q.setFromAxisAngle(RuthefjordWorldState.UP, radiansOfDegrees(degrees));
        relativeCamPos.applyQuaternion(q);
    };

    // degrees should be <= 10
    self.tiltCamera = function(degrees) {
        if (Math.abs(degrees) > 10) {
            console.warn("tilting by more than 10 degrees in a single step may bypass safeguards");
        }
        var curDot = relativeCamPos.clone().normalize().dot(RuthefjordWorldState.UP);
        if ((curDot > 0.05 || degrees > 0) && (curDot < 0.95 || degrees < 0)) {
            var q = new THREE.Quaternion();
            q.setFromAxisAngle(relativeCamPos.clone().cross(RuthefjordWorldState.UP).normalize(), radiansOfDegrees(degrees));
            relativeCamPos.applyQuaternion(q);
        }
    };

    // scale should be > 0
    self.zoomCamera = function(scale) {
        if ((relativeCamPosMag > 5 && scale < 1) || (relativeCamPosMag < 100 && scale > 1)) { // limits on how far or close camera can zoom
            relativeCamPos.multiplyScalar(scale);
            relativeCamPosMag = relativeCamPos.length() - 0.5;
        }
    };

    self.hide = function() {
        $(parent).hide();
    };

    self.show = function() {
        $(parent).show();
        renderer.setSize(parent.width(), parent.height());
        camera.aspect = parent.width() / parent.height();
        camera.updateProjectionMatrix();
    };

    return self;
}());