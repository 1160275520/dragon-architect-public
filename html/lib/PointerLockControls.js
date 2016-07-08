/**
 * @author mrdoob / http://mrdoob.com/
 * modified for Dragon Architect by Aaron Bauer July 7, 2016
 */

THREE.PointerLockControls = function ( camera ) {

	var scope = this;

	camera.rotation.order = "ZYX"
	camera.rotation.set( 0, 0, 0 );

	var onMouseMove = function ( event ) {

		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		camera.rotation.z -= movementX * 0.0015;
		camera.rotation.x -= movementY * 0.0015;

		camera.rotation.x = Math.max( 0.25, Math.min( Math.PI - 0.25, camera.rotation.x ) );
	};

	this.dispose = function() {
		document.removeEventListener( 'mousemove', onMouseMove, false );
	};

	document.addEventListener( 'mousemove', onMouseMove, false );

	this.enabled = false;
};
