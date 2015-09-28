var RuthefjordDisplay = (function() {
    "use strict";
    var module = {};

    var camera, scene, renderer, clock;
    var cubeGeo;
    var cubes, robot;
    var WobblePeriod = 4.0;
    var WobbleMagnitude = 0.05;
    var UP = new THREE.Vector3(0,1,0);
    var relativeCamPos = new THREE.Vector3(0,12,10);
    var relativeCamPosMag = relativeCamPos.length() - 0.5; // -0.5 is an undocumented part of unity version, preserving it here
    var robotOffset = new THREE.Vector3(0.5,1.5,0.5);
    var cubeOffset = new THREE.Vector3(0.5,0.5,0.5);
    // the colors are 1-indexed for some reason
    var cubeMats = ["dummy"];
    var cubeColors = [0x1ca84f, 0xa870b7, 0xff1a6d, 0x00bcf4, 0xffc911, 0xff6e3d, 0x000000, 0xffffff];

    function radiansOfDegrees(deg) {
        return deg / 180 * Math.PI;
    }

    module.init = function(parent) {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        clock = new THREE.Clock();
        cubes = [];

        renderer = new THREE.WebGLRenderer();
        var dims = parent.getBoundingClientRect();
        console.log(dims);
        renderer.setSize(dims.width, dims.height);
        camera.aspect = dims.width / dims.height;
        camera.updateProjectionMatrix();
        parent.appendChild(renderer.domElement);

        cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        var tex = THREE.ImageUtils.loadTexture("../media/canvas_cube.png");
        cubeColors.forEach(function (color) {
            cubeMats.push(new THREE.MeshLambertMaterial({color:color, map:tex}))
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
        var robotDir = new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,0),1,0xff0000,0.5,0.2);
        robot.add(robotDir);
        scene.add(robot);

        var light = new THREE.DirectionalLight(0xffffff, 1.74);
        light.position.set(0.32,0.77,-0.56); // rotating 0,0,-1 by 50 about x then 330 about y
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));

        camera.position.copy(relativeCamPos);
        camera.rotation.x = Math.PI / 4;
        camera.lookAt(new THREE.Vector3(0,0,0));
        module.rotateCamera(10);

        plane.rotation.x += Math.PI / 2;
        robot.position.copy(robotOffset);

        clock.start();
        requestAnimationFrame(render);
    };

    function render() {
        var t = clock.getElapsedTime();
        var y = WobbleMagnitude * Math.sin(t * 4 * Math.PI / WobblePeriod);
        var x = WobbleMagnitude * Math.cos(t * 2 * Math.PI / WobblePeriod);
        var v = new THREE.Vector3(x, y, 0);

        camera.position.copy( v.add(relativeCamPos).add(robot.position) );
        camera.lookAt(robot.position);

        renderer.render( scene, camera );
        requestAnimationFrame(render);
    }

    // grid is int array where each set of 4 ints is x,y,z,color of a cube
    // CURRENTLY IGNORES CUBE COLOR
    module.setWorld = function(bot, grid) {
        // set robot position and direction
        robot.position.fromArray(bot.pos).add(robotOffset);
        var dir = new THREE.Vector3();
        dir.fromArray(bot.dir);
        robot.quaternion.setFromUnitVectors(new THREE.Vector3( 0, 0, -1 ), dir); // 0,0,-1 is default direction

        // set cubes
        // clear previous cubes
        cubes.forEach(function (cube) {
            scene.remove(cube);
        });
        // prep cube buffer
        while (cubes.length < grid.length / 4) {
            cubes.push(new THREE.Mesh(cubeGeo, cubeMats[1]));
        }
        // add cubes to scene
        for(var i = 0; i < grid.length; i += 4) {
            var cube = cubes[i/4];
            scene.add(cube);
            cube.position.set(grid[i], grid[i+1], grid[i+2]).add(cubeOffset);
        }
    };

    module.rotateCamera = function(degrees) {
        var q = new THREE.Quaternion();
        q.setFromAxisAngle(UP, radiansOfDegrees(degrees));
        relativeCamPos.applyQuaternion(q);
    };

    module.tiltCamera = function(degrees) {
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