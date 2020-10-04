var RuthefjordDisplay = (function() {
    "use strict";
    var self = {};

    var camera, viewer_camera, scene, renderer, stats, parent;
    var cubeGeo, targetGeo, cubeTargetMat;
    var cubes, robot, zLine, zLineMat, zCuePlane, robotTarget, targetShadow;
    var controls;

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

    self.viewer_mode = function() {
        if (parent) {
            viewer_camera.position.copy(camera.position);
            viewer_camera.lookAt(robot.position);
            var elem = parent[0];
            elem.requestPointerLock = elem.requestPointerLock || elem.mozRequestPointerLock || elem.webkitRequestPointerLock;
            elem.requestPointerLock();
            controlsEnabled = true;
            controls.enabled = true;
        }
    };

    self.exit_viewer_mode = function() {
        if (controls) { // may be called before controls is initialized
            controls.enabled = false;
            controlsEnabled = false;
        }
    };

    var controlsEnabled = false;
    var moveForward = false;
    var moveBackward = false;
    var strafeLeft = false;
    var strafeRight = false;
    var moveUp = false;
    var moveDown = false;
    var headingVel = 0;
    var orthoVel = 0;
    var vertVel = 0;

    var onKeyDown = function ( event ) {

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = true;
                break;

            case 37: // left
            case 65: // a
                strafeLeft = true;
                break;

            case 40: // down
            case 83: // s
                moveBackward = true;
                break;

            case 39: // right
            case 68: // d
                strafeRight = true;
                break;

            case 82: // r
            case 32: // space
                moveUp = true;
                break;

            case 70: // f
            case 16: // shift
                moveDown = true;
                break;
        }

    };

    var onKeyUp = function ( event ) {

        switch( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = false;
                break;

            case 37: // left
            case 65: // a
                strafeLeft = false;
                break;

            case 40: // down
            case 83: // s
                moveBackward = false;
                break;

            case 39: // right
            case 68: // d
                strafeRight = false;
                break;

            case 82: // r
            case 32: // space
                moveUp = false;
                break;

            case 70: // f
            case 16: // shift
                moveDown = false;
                break;
        }

    };

    $(document).on( 'keydown', onKeyDown);
    $(document).on( 'keyup', onKeyUp);
    /**
     * AXES
     * positive x is forward
     * positive y is left
     * positive z is up
     */

    self.init = function(parentSelector) {
        scene = new THREE.Scene();
        // camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);

        //new code for camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.set( 0, 75, 100 );

        self.clock = new THREE.Clock();
        self.oldTime = 0;
        cubes = {};
        cubes.targets = [];
        finalBotPos = new THREE.Vector3();
        finalBotQ = new THREE.Quaternion();

        renderer = new THREE.WebGLRenderer( {antialias: true} );
        parent = $(parentSelector);
        renderer.setSize(parent.width(), parent.height());
        // camera.aspect = parent.width() / parent.height();
        // camera.up.set(0,0,1);
        // camera.updateProjectionMatrix();
        parent.append(renderer.domElement);
        self.renderOut = false;

        viewer_camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
        viewer_camera.aspect = parent.width() / parent.height();
        viewer_camera.up.set(0,0,1);
        viewer_camera.updateProjectionMatrix();
        controls = new THREE.PointerLockControls( viewer_camera );
        scene.add( viewer_camera );

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
        var cubeLoader = new THREE.CubeTextureLoader();
        var cubeMap = cubeLoader.load(texes);
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
        var loader = new THREE.TextureLoader();
        cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        var tex = loader.load("media/canvas_cube.png");
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
        // tex = loader.load("media/outlined_cube.png");
        // tex.wrapS = THREE.RepeatWrapping;
        // tex.wrapT = THREE.RepeatWrapping;
        // tex.repeat.set(100, 100);
        // var material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        // var plane = new THREE.Mesh(geometry, material);
        // scene.add( plane );
        var texture = new THREE.CanvasTexture( generateTexture() );
        for ( var i = 0; i < 15; i ++ ) {

            var material = new THREE.MeshBasicMaterial( {
                color: new THREE.Color().setHSL( 0.3, 0.75, ( i / 15 ) * 0.4 + 0.1 ),
                map: texture,
                depthTest: false,
                depthWrite: false,
                transparent: true
            } );

            var mesh = new THREE.Mesh( geometry, material );
            mesh.position.y = i * 0.25;
            mesh.rotation.x = - Math.PI / 2;
            scene.add( mesh );
        }

        // robot
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        robot = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial( {color: "#f56e90"} ));
        var robotDir = new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,0),1,"#ff0000",0.5,0.2);
        robot.add(robotDir);
        zLineMat = new THREE.MeshBasicMaterial( {color: 0xf2c2ce} );
        geometry = new THREE.PlaneBufferGeometry(1, 1, 32);
        tex = loader.load("media/y-cue.png");
        material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        zCuePlane = new THREE.Mesh(geometry, material);
        scene.add(zCuePlane);
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
        window.addEventListener( 'resize', self.onWindowResize, false );
        self.clock.start();

        requestAnimationFrame(update); // change to render to omit fps display
    };

    //generate grass texture for plane
    function generateTexture() {

        var canvas = document.createElement( 'canvas' );
        canvas.width = 512;
        canvas.height = 512;

        var context = canvas.getContext( '2d' );

        for ( var i = 0; i < 20000; i ++ ) {

            context.fillStyle = 'hsl(0,0%,' + ( Math.random() * 50 + 50 ) + '%)';
            context.beginPath();
            context.arc( Math.random() * canvas.width, Math.random() * canvas.height, Math.random() + 0.15, 0, Math.PI * 2, true );
            context.fill();

        }

        context.globalAlpha = 0.075;
        context.globalCompositeOperation = 'lighter';

        return canvas;

    }

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

        if ( controlsEnabled ) {

            headingVel -= headingVel * 10.0 * dt;
            orthoVel -= orthoVel * 10.0 * dt;
            vertVel -= vertVel * 10.0 * dt;

            if ( strafeLeft ) orthoVel -= 4.0 * dt;
            if ( strafeRight ) orthoVel += 4.0 * dt;

            if ( moveUp ) vertVel += 4.0 * dt;
            if ( moveDown ) vertVel -= 4.0 * dt;

            if ( moveForward ) headingVel += 4.0 * dt;
            if ( moveBackward ) headingVel -= 4.0 * dt;

            var heading = new THREE.Vector3();
            var ortho = new THREE.Vector3();
            viewer_camera.getWorldDirection(heading);
            heading.z = 0; // just get the heading the in x-y plane
            heading.normalize();
            ortho.copy(heading);

            viewer_camera.position.add(heading.multiplyScalar(headingVel));
            viewer_camera.position.setZ(viewer_camera.position.z + vertVel);
            ortho.cross(RuthefjordWorldState.UP).multiplyScalar(orthoVel);
            viewer_camera.position.add(ortho);
        }

        render(dt, t);
        if (self.renderOut) {
            onRuthefjordEvent("onScreenshot", {id: self.renderOut.id, src: renderer.domElement.toDataURL()});
            self.renderOut = false;
        }
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

        if (controls.enabled) {
            renderer.render(scene, viewer_camera);
        } else {
            renderer.render(scene, camera);
        }
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

    self.getScreenCoordsForTargets = function() {
        var width = parent.width(), height = parent.height();
        var widthHalf = width / 2, heightHalf = height / 2;

        var vector = new THREE.Vector3();
        var dist;
        if (scene.getObjectById(robotTarget.id)) {
            vector.setFromMatrixPosition(robotTarget.matrixWorld);
            dist = camera.position.distanceTo(robotTarget.position);
        } else if (cubes.targets[0] && scene.getObjectById(cubes.targets[0].id)) {
            vector.setFromMatrixPosition(cubes.targets[0].matrixWorld);
            dist = camera.position.distanceTo(cubes.targets[0].position);
        } else { // default to the middle
            vector.x = widthHalf;
            vector.y = heightHalf;
            return vector;
        }
        vector.project(camera);

        vector.x = ( vector.x * widthHalf ) + widthHalf;
        vector.y = - ( vector.y * heightHalf ) + heightHalf;

        var vFOV = camera.fov * Math.PI / 180;      // convert vertical fov to radians
        vector.z = 2 * Math.tan( vFOV / 2 ) * dist; // visible height

        return vector;
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

    self.onWindowResize = function() {

        renderer.setSize(parent.width(), parent.height());
        camera.aspect = parent.width() / parent.height();
        camera.updateProjectionMatrix();
        viewer_camera.aspect = parent.width() / parent.height();
        viewer_camera.updateProjectionMatrix();

    };

    self.hide = function() {
        if (parent) {
            parent.hide();
        }
    };

    self.show = function() {
        if (parent) {
            parent.show();
            self.onWindowResize();
        }
    };

    return self;
}());