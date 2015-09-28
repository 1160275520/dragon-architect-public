var RuthefjordDisplay = (function() {
    "use strict";
    var module = {};

    var camera, scene, renderer, clock;
    var cubeGeo;
    var cubes, robot;
    var WobblePeriod = 4.0;
    var WobbleMagnitude = 0.05;
    var UP = new THREE.Vector3(0,0,1);
    var relativeCamPos = new THREE.Vector3(-10,0,12);
    var relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
    var robotOffset = new THREE.Vector3(0.5,0.5,1.5);
    var cubeOffset = new THREE.Vector3(0.5,0.5,0.5);
    // the colors are 1-indexed for some reason
    var cubeMats = ["dummy"];
    var cubeColors = [0x1ca84f, 0xa870b7, 0xff1a6d, 0x00bcf4, 0xffc911, 0xff6e3d, 0x000000, 0xffffff];

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
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        clock = new THREE.Clock();
        cubes = {};

        renderer = new THREE.WebGLRenderer();
        var dims = parent.getBoundingClientRect();
        console.log(dims);
        renderer.setSize(dims.width, dims.height);
        camera.aspect = dims.width / dims.height;
        camera.up.set(0,0,1);
        camera.updateProjectionMatrix();
        parent.appendChild(renderer.domElement);

        cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        var tex = THREE.ImageUtils.loadTexture("../media/canvas_cube.png");
        cubeColors.forEach(function (color) {
            cubeMats.push(new THREE.MeshLambertMaterial({color:color, map:tex}))
            cubes[color] = {count:0, meshes:[]};
        });

        var geometry = new THREE.PlaneBufferGeometry(100, 100, 32);
        tex = THREE.ImageUtils.loadTexture("../media/outlined_cube.png");
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set( 100, 100 );
        var material = new THREE.MeshBasicMaterial( {map: tex, side: THREE.DoubleSide} );
        var plane = new THREE.Mesh( geometry, material );
        scene.add( plane );

        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        material = new THREE.MeshLambertMaterial( {color: 0xf56e90} );
        robot = new THREE.Mesh(geometry, material);
        var robotDir = new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,0,0),1,0xff0000,0.5,0.2);
        robot.add(robotDir);
        scene.add(robot);

        var light = new THREE.DirectionalLight(0xffffff, 1.74);
        //light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
        light.position.set(0.56,-0.32,0.77);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));

        camera.position.copy(relativeCamPos);
        camera.lookAt(new THREE.Vector3(0,0,0));
        module.rotateCamera(-10);

        //plane.rotation.x += Math.PI / 2;
        robot.position.copy(robotOffset);

        clock.start();
        requestAnimationFrame(render);
    };

    function render() {
        var t = clock.getElapsedTime();
        var z = WobbleMagnitude * Math.sin(t * 4 * Math.PI / WobblePeriod);
        var y = WobbleMagnitude * Math.cos(t * 2 * Math.PI / WobblePeriod);
        var v = new THREE.Vector3(0, y, z);

        camera.position.copy( v.add(relativeCamPos).add(robot.position) );
        camera.lookAt(robot.position);

        renderer.render( scene, camera );
        requestAnimationFrame(render);
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
    module.setWorld = function(bot, grid) {
        // set robot position and direction
        robot.position.fromArray(YZXFromXYZ(bot.pos)).add(robotOffset);
        var dir = new THREE.Vector3();
        dir.fromArray(YZXFromXYZ(bot.dir));
        robot.quaternion.setFromUnitVectors(new THREE.Vector3( 1, 0, 0 ), dir); // 1,0,0 is default direction

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

    module.zoomCamera = function(scale) {
        if ((relativeCamPosMag > 5 && scale < 1) || (relativeCamPosMag < 100 && scale > 1)) { // limits on how far or close camera can zoom
            relativeCamPos.multiplyScalar(scale);
            relativeCamPosMag = relativeCamPos.length() - 0.5;
        }
    };

    return module;
}());