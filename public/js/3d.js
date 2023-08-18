import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js'; 


import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js'; 


const GeometryUtils = {

	// Merge two geometries or geometry and geometry from object (using object's transform)

	merge: function ( geometry1, geometry2, materialIndexOffset ) {

		console.warn( 'THREE.GeometryUtils: .merge() has been moved to Geometry. Use geometry.merge( geometry2, matrix, materialIndexOffset ) instead.' );

		var matrix;

		if ( geometry2 instanceof THREE.Mesh ) {

			geometry2.matrixAutoUpdate && geometry2.updateMatrix();

			matrix = geometry2.matrix;
			geometry2 = geometry2.geometry;

		}

		geometry1.merge( geometry2, matrix, materialIndexOffset );

	},

	// Get random point in triangle (via barycentric coordinates)
	// 	(uniform distribution)
	// 	http://www.cgafaq.info/wiki/Random_Point_In_Triangle

	randomPointInTriangle: function () {

		var vector = new THREE.Vector3();

		return function ( vectorA, vectorB, vectorC ) {

			var point = new THREE.Vector3();

			var a = Math.random();
			var b = Math.random();

			if ( ( a + b ) > 1 ) {

				a = 1 - a;
				b = 1 - b;

			}

			var c = 1 - a - b;

			point.copy( vectorA );
			point.multiplyScalar( a );

			vector.copy( vectorB );
			vector.multiplyScalar( b );

			point.add( vector );

			vector.copy( vectorC );
			vector.multiplyScalar( c );

			point.add( vector );

			return point;

		};

	}(),

	// Get random point in face (triangle)
	// (uniform distribution)

	randomPointInFace: function ( face, geometry ) {

		var vA, vB, vC;

		vA = geometry.vertices[ face.a ];
		vB = geometry.vertices[ face.b ];
		vC = geometry.vertices[ face.c ];

		return GeometryUtils.randomPointInTriangle( vA, vB, vC );

	},

	// Get uniformly distributed random points in mesh
	// 	- create array with cumulative sums of face areas
	//  - pick random number from 0 to total area
	//  - find corresponding place in area array by binary search
	//	- get random point in face

	randomPointsInGeometry: function ( geometry, n ) {

		var face, i,
			faces = geometry.faces,
			vertices = geometry.vertices,
			il = faces.length,
			totalArea = 0,
			cumulativeAreas = [],
			vA, vB, vC;

		// precompute face areas

		for ( i = 0; i < il; i ++ ) {

			face = faces[ i ];

			vA = vertices[ face.a ];
			vB = vertices[ face.b ];
			vC = vertices[ face.c ];

			face._area = GeometryUtils.triangleArea( vA, vB, vC );

			totalArea += face._area;

			cumulativeAreas[ i ] = totalArea;

		}

		// binary search cumulative areas array

		function binarySearchIndices( value ) {

			function binarySearch( start, end ) {

				// return closest larger index
				// if exact number is not found

				if ( end < start )
					return start;

				var mid = start + Math.floor( ( end - start ) / 2 );

				if ( cumulativeAreas[ mid ] > value ) {

					return binarySearch( start, mid - 1 );

				} else if ( cumulativeAreas[ mid ] < value ) {

					return binarySearch( mid + 1, end );

				} else {

					return mid;

				}

			}

			var result = binarySearch( 0, cumulativeAreas.length - 1 );
			return result;

		}

		// pick random face weighted by face area

		var r, index,
			result = [];

		var stats = {};

		for ( i = 0; i < n; i ++ ) {

			r = Math.random() * totalArea;

			index = binarySearchIndices( r );

			result[ i ] = GeometryUtils.randomPointInFace( faces[ index ], geometry );

			if ( ! stats[ index ] ) {

				stats[ index ] = 1;

			} else {

				stats[ index ] += 1;

			}

		}

		return result;

	},

	randomPointsInBufferGeometry: function ( geometry, n ) {

		var i,
			vertices = geometry.attributes.position.array,
			totalArea = 0,
			cumulativeAreas = [],
			vA, vB, vC;

		// precompute face areas
		vA = new THREE.Vector3();
		vB = new THREE.Vector3();
		vC = new THREE.Vector3();

		// geometry._areas = [];
		var il = vertices.length / 9;

		for ( i = 0; i < il; i ++ ) {

			vA.set( vertices[ i * 9 + 0 ], vertices[ i * 9 + 1 ], vertices[ i * 9 + 2 ] );
			vB.set( vertices[ i * 9 + 3 ], vertices[ i * 9 + 4 ], vertices[ i * 9 + 5 ] );
			vC.set( vertices[ i * 9 + 6 ], vertices[ i * 9 + 7 ], vertices[ i * 9 + 8 ] );

			area = THREE.GeometryUtils.triangleArea( vA, vB, vC );
			totalArea += area;

			cumulativeAreas.push( totalArea );

		}

		// binary search cumulative areas array

		function binarySearchIndices( value ) {

			function binarySearch( start, end ) {

				// return closest larger index
				// if exact number is not found

				if ( end < start )
					return start;

				var mid = start + Math.floor( ( end - start ) / 2 );

				if ( cumulativeAreas[ mid ] > value ) {

					return binarySearch( start, mid - 1 );

				} else if ( cumulativeAreas[ mid ] < value ) {

					return binarySearch( mid + 1, end );

				} else {

					return mid;

				}

			}

			var result = binarySearch( 0, cumulativeAreas.length - 1 );
			return result;

		}

		// pick random face weighted by face area

		var r, index,
			result = [];

		for ( i = 0; i < n; i ++ ) {

			r = Math.random() * totalArea;

			index = binarySearchIndices( r );

			// result[ i ] = THREE.GeometryUtils.randomPointInFace( faces[ index ], geometry, true );
			vA.set( vertices[ index * 9 + 0 ], vertices[ index * 9 + 1 ], vertices[ index * 9 + 2 ] );
			vB.set( vertices[ index * 9 + 3 ], vertices[ index * 9 + 4 ], vertices[ index * 9 + 5 ] );
			vC.set( vertices[ index * 9 + 6 ], vertices[ index * 9 + 7 ], vertices[ index * 9 + 8 ] );
			result[ i ] = THREE.GeometryUtils.randomPointInTriangle( vA, vB, vC );

		}

		return result;

	},

	// Get triangle area (half of parallelogram)
	// http://mathworld.wolfram.com/TriangleArea.html

	triangleArea: function () {

		var vector1 = new THREE.Vector3();
		var vector2 = new THREE.Vector3();

		return function ( vectorA, vectorB, vectorC ) {

			vector1.subVectors( vectorB, vectorA );
			vector2.subVectors( vectorC, vectorA );
			vector1.cross( vector2 );

			return 0.5 * vector1.length();

		};

	}(),

	center: function ( geometry ) {

		// console.warn( 'THREE.GeometryUtils: .center() has been moved to Geometry. Use geometry.center() instead.' );
		return geometry.center();

	}

};
// geoutils-----------------------------------------------------------------------------------------------------------

// Options
const particleCount = 70000;
		
const particleSize = .3;

const defaultAnimationSpeed = 1,
		morphAnimationSpeed = 18,
	  	color = '#FFFFFF';

// Triggers
const triggers = document.getElementsByTagName('span')

// Renderer
var renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize( window.innerWidth, window.innerHeight * 0.4 );
document.body.appendChild( renderer.domElement );

// Ensure Full Screen on Resize
function fullScreen () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight * 0.4);
}

window.addEventListener('resize', fullScreen, false)

// Scene
var scene = new THREE.Scene();

// Camera and position
var camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );

camera.position.y = -45;
camera.position.z = 45;

// Lighting
var light = new THREE.AmbientLight( 0xFFFFFF, 1 );
scene.add( light );

// Orbit Controls
// var controls = new OrbitControls( camera );
var controls = new OrbitControls( camera, renderer.domElement );
controls.update();

// Particle Vars
var particles = new THREE.Geometry();

var texts = [];

var pMaterial = new THREE.PointsMaterial({
			size: particleSize,
});

// Texts
var loader = new THREE.FontLoader();
var typeface = 'https://dl.dropboxusercontent.com/s/bkqic142ik0zjed/swiss_black_cond.json?';

loader.load( typeface, ( font ) => {
	Array.from(triggers).forEach((trigger, idx) => {
		
		texts[idx] = {};
		
		texts[idx].geometry = new THREE.TextGeometry( trigger.textContent, {
			font: font,
			size: window.innerWidth * 0.02,
			height: 4,
			curveSegments: 10,
		});
		
		GeometryUtils.center( texts[idx].geometry )
			

		texts[idx].particles = new THREE.Geometry();

        // texts[idx].points = THREE.GeometryUtils.randomPointsInGeometry(texts[idx].geometry, particleCount);
		texts[idx].points = GeometryUtils.randomPointsInGeometry(texts[idx].geometry, particleCount);
        // texts[idx].points = THREE.BufferGeometryUtils.mergeBufferGeometries(texts[idx].geometry, particleCount);

		createVertices(texts[idx].particles, texts[idx].points)

		enableTrigger(trigger, idx);
		
	});
});

// Particles
for (var p = 0; p < particleCount; p++) {
	var vertex = new THREE.Vector3();
			vertex.x = 0;
			vertex.y = 0;
			vertex.z = 0;

	particles.vertices.push(vertex);
}

function createVertices (emptyArray, points) {
	for (var p = 0; p < particleCount; p++) {
		var vertex = new THREE.Vector3();
				vertex.x = points[p]['x'];
				vertex.y = points[p]['y'];
				vertex.z = points[p]['z'];

		emptyArray.vertices.push(vertex);
	}
}

function enableTrigger(trigger, idx){
	
	
	trigger.setAttribute('data-disabled', false);
	
	trigger.addEventListener('click', () => {
		morphTo(texts[idx].particles, trigger.dataset.color);
	})
	
	if (idx == 0) {
		morphTo(texts[idx].particles, trigger.dataset.color);
	}
}

var particleSystem = new THREE.Points(
    particles,
    pMaterial
);

particleSystem.sortParticles = true;

// Add the particles to the scene
scene.add(particleSystem);

// Animate
const normalSpeed = (defaultAnimationSpeed/100),
			fullSpeed = (morphAnimationSpeed/100)

let animationVars = {
	speed: normalSpeed,
	color: color,
	rotation: -45
}


function animate() {
	
	particleSystem.rotation.y += animationVars.speed;
	particles.verticesNeedUpdate = true; 
	
	camera.position.z = animationVars.rotation;
	camera.position.y = animationVars.rotation;
	camera.lookAt( scene.position );
	
	particleSystem.material.color = new THREE.Color( animationVars.color );
	
	window.requestAnimationFrame( animate );
	renderer.render( scene, camera );
}

animate();

function morphTo (newParticles, color = '#FFFFFF') {
	
	TweenMax.to(animationVars, .1, {
		ease: Power4.easeIn, 
		speed: fullSpeed, 
		onComplete: slowDown
	});
	
	TweenMax.to(animationVars, 2, {
		ease: Linear.easeNone, 
		color: color
	});
	
	
	// particleSystem.material.color.setHex(color);
	
	for (var i = 0; i < particles.vertices.length; i++){
		TweenMax.to(particles.vertices[i], 2, {
			ease: Elastic.easeOut.config( 0.1, .3), 
			x: newParticles.vertices[i].x,
			y: newParticles.vertices[i].y, 
			z: newParticles.vertices[i].z
		})
	}
	
	// console.log(animationVars.rotation)
	
	TweenMax.to(animationVars, 2, {
		ease: Elastic.easeOut.config( 0.1, .3), 
		rotation: animationVars.rotation == 45 ? -45 : 45,
	})
}
function slowDown () {
	TweenMax.to(animationVars, 0.3, {ease:
Power2.easeOut, speed: normalSpeed, delay: 0.2});
}