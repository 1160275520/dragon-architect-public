var RuthefjordDisplay = (function() {
    "use strict";
    var module = {};

    var camera, scene, renderer, clock, stats;
    var cubeGeo;
    var cubes, robot;

    // constants
    var wobblePeriod = 4.0;
    var wobbleMagnitude = 0.05;
    var translationSmoothness = 1.5;         // The relative speed at which the camera will catch up.
    var rotationSmoothness = 5.0;         // The relative speed at which the camera will catch up.
    var UP = new THREE.Vector3(0,0,1);

    // positioning
    var relativeCamPos = new THREE.Vector3(-10,0,12);
    var relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
    var robotOffset = new THREE.Vector3(0.5,0.5,1.5);
    var cubeOffset = new THREE.Vector3(0.5,0.5,0.5);

    // the colors are 1-indexed for some reason
    var cubeMats = ["dummy"];
    var cubeColors = [0x1ca84f, 0xa870b7, 0xff1a6d, 0x00bcf4, 0xffc911, 0xff6e3d, 0x000000, 0xffffff];

    //animation
    var animating = false;
    var animTime, finalBotPos, finalBotQ;

    function radiansOfDegrees(deg) {
        return deg / 180 * Math.PI;
    }

    /**
     * AXES
     * positive x is forward
     * positive y is left
     * positive z is up
     */

    module.init = function(parent) {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
        clock = new THREE.Clock();
        cubes = {};
        finalBotPos = new THREE.Vector3();
        finalBotQ = new THREE.Quaternion();

        renderer = new THREE.WebGLRenderer( {antialias: true} );
        var dims = parent.getBoundingClientRect();
        renderer.setSize(dims.width, dims.height);
        camera.aspect = dims.width / dims.height;
        camera.up.set(0,0,1);
        camera.updateProjectionMatrix();
        parent.appendChild(renderer.domElement);

        // FPS display
        stats = new Stats();
        stats.setMode( 0 ); // 0: fps, 1: ms, 2: mb
        // align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        parent.appendChild(stats.domElement);

        // skybox
        var path = "../media/skybox/";
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
        var tex = THREE.ImageUtils.loadTexture("../media/canvas_cube.png");
        cubeColors.forEach(function (color) {
            cubeMats.push(new THREE.MeshLambertMaterial({color:color, map:tex}));
            cubes[color] = {count:0, meshes:[]};
        });

        // ground plane
        var geometry = new THREE.PlaneBufferGeometry(100, 100, 32);
        tex = THREE.ImageUtils.loadTexture("../media/outlined_cube.png");
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set( 100, 100 );
        var material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        var plane = new THREE.Mesh( geometry, material );
        scene.add( plane );

        // robot
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        material = new THREE.MeshLambertMaterial( {color: 0xf56e90} );
        robot = new THREE.Mesh(geometry, material);
        var robotDir = new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,0),1,0xff0000,0.5,0.2);
        robot.add(robotDir);
        scene.add(robot);

        // lights
        var light = new THREE.DirectionalLight(0xffffff, 1.74);
        //light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
        light.position.set(-0.56,-0.32,0.77);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));

        // camera init
        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0,0,0));
        module.rotateCamera(-10);

        robot.position.copy(robotOffset);

        clock.start();
        requestAnimationFrame(update); // change to render to omit fps display
    };

    // necessary for fps display
    var update = function () {
        stats.begin();
        render();
        stats.end();
        requestAnimationFrame(update);
    };

    function render() {
        // this MUST be called before getElapsedTime
        // since it returns the time since getDelta OR getElapsedTime was called (three js docs are wrong)
        var tDelta = clock.getDelta();
        var t = clock.getElapsedTime();
        var z = wobbleMagnitude * Math.sin(t * 4 * Math.PI / wobblePeriod);
        var y = wobbleMagnitude * Math.cos(t * 2 * Math.PI / wobblePeriod);
        var v = new THREE.Vector3(0, y, z);

        if (animating) {
            robot.position.lerp(finalBotPos, Math.min(tDelta / animTime, 1));
            robot.quaternion.slerp(finalBotQ, Math.min(tDelta / animTime, 1));
            animTime -= tDelta;
            if (animTime <= 0) {
                robot.position.copy(finalBotPos);
                robot.quaternion.copy(finalBotQ);
                animating = false;
            }
        }

        var newCamPos = v.add(relativeCamPos).add(robot.position);
        camera.position.lerp(newCamPos, translationSmoothness * tDelta);

        // Couldn't figure out how to reimplement technique from Unity code
        // There's probably something better than my hack
        var oldCamQ = camera.quaternion.clone();
        camera.lookAt(robot.position);
        var newCamQ = camera.quaternion.clone();
        camera.quaternion.copy(oldCamQ);
        camera.quaternion.slerp(newCamQ, rotationSmoothness * tDelta);

        renderer.render( scene, camera );
        //requestAnimationFrame(render); // include to omit fps display
    }

    // until the Unity backend is discarded, we have to transform the axes it uses to the axes we use
    function YZXFromXYZ(arr) {
        /**
         * input is:
         * positive x is right
         * positive y is up
         * positive z is forward
         */
        return [arr[2], -arr[0], arr[1]];
    }

    // grid is int array where each set of 4 ints is x,y,z,color of a cube
    module.setWorld = function(bot, grid, dt) {
        // skip any remaining animation from previous setWorld
        if (animating) {
            robot.position.copy(finalBotPos);
            robot.quaternion.copy(finalBotQ);
            animating = false;
        }
        // set robot goal position and direction
        finalBotPos.fromArray(YZXFromXYZ(bot.pos)).add(robotOffset);
        var dir = new THREE.Vector3();
        dir.fromArray(YZXFromXYZ(bot.dir));
        finalBotQ.setFromUnitVectors(new THREE.Vector3( 1, 0, 0 ), dir); // 1,0,0 is default direction
        if (dt === 0) {
            robot.position.copy(finalBotPos);
            robot.quaternion.copy(finalBotQ);
        } else if (!robot.position.equals(finalBotPos) || !robot.quaternion.equals(finalBotQ)) {
            animTime = dt;
            animating = true;
        }

        // set cubes
        // clear previous cubes, reset counts
        cubeColors.forEach(function (color) {
            cubes[color].meshes.forEach(function (mesh) {
                scene.remove(mesh);
            });
            cubes[color].count = 0;
        });
        // add cubes to scene
        for(var i = 0; i < grid.length; i += 4) {
            var color = cubeColors[grid[i+3] - 1]; // color parameters are 1-indexed
            // add a new mesh, if necessary
            if (cubes[color].count >= cubes[color].meshes.length) {
                cubes[color].meshes.push(new THREE.Mesh(cubeGeo, cubeMats[grid[i+3]]));
            }
            var cube = cubes[color].meshes[(cubes[color].count)++];
            scene.add(cube);
            cube.position.fromArray(YZXFromXYZ([grid[i], grid[i+1], grid[i+2]])).add(cubeOffset);
        }
    };

    module.rotateCamera = function(degrees) {
        var q = new THREE.Quaternion();
        q.setFromAxisAngle(UP, radiansOfDegrees(degrees));
        relativeCamPos.applyQuaternion(q);
    };

    // degrees should be <= 10
    module.tiltCamera = function(degrees) {
        if (Math.abs(degrees) > 10) {
            console.warn("tilting by more than 10 degrees in a single step may bypass safeguards");
        }
        var curDot = relativeCamPos.clone().normalize().dot(UP);
        if ((curDot > 0.05 || degrees > 0) && (curDot < 0.95 || degrees < 0)) {
            var q = new THREE.Quaternion();
            q.setFromAxisAngle(relativeCamPos.clone().cross(UP).normalize(), radiansOfDegrees(degrees));
            relativeCamPos.applyQuaternion(q);
        }
    };

    // scale should be > 0
    module.zoomCamera = function(scale) {
        if ((relativeCamPosMag > 5 && scale < 1) || (relativeCamPosMag < 100 && scale > 1)) { // limits on how far or close camera can zoom
            relativeCamPos.multiplyScalar(scale);
            relativeCamPosMag = relativeCamPos.length() - 0.5;
        }
    };

    return module;
}());