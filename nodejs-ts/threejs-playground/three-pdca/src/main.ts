import './style.css'
import * as THREE from 'three'
import { Stats } from 'stats-js'
function init() {
  var stats = initStats();
  // create a scene, that will hold all our elements such as objects, cameras and lights.
  var scene = new THREE.Scene();

  let control = new function() {
    this.rotationSpeed = 0.02;
    this.bouncingSpeed = 0.03;
  }
  let gui = new dat.GUI();
  gui.add(control, 'rotationSpeed', 0, 0.5);
  gui.add(control, 'bouncingSpeed', 0, 0.5);




  // create a camera, which defines where we're looking at.
  var camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  // create a render and set the size
  var renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(new THREE.Color(0xeeeeee));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // show axes in the screen
  var axes = new THREE.AxisHelper(20);
  scene.add(axes);

  // create the ground plane
  var planeGeometry = new THREE.PlaneGeometry(60, 20);
  // var planeMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  var planeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
  var plane = new THREE.Mesh(planeGeometry, planeMaterial);

  // rotate and position the plane
  plane.rotation.x = -0.5 * Math.PI;
  plane.position.x = 15;
  plane.position.y = 0;
  plane.position.z = 0;
  plane.receiveShadow = true;

  // add the plane to the scene
  scene.add(plane);

  // create a cube
  var cubeGeometry = new THREE.BoxGeometry(4, 4, 4);
  var cubeMaterial = new THREE.MeshLambertMaterial({
    color: 0xff0000,
    wireframe: false,
  });
  var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

  // position the cube
  cube.position.x = -4;
  cube.position.y = 3;
  cube.position.z = 0;
  cube.castShadow = true;

  // add the cube to the scene
  scene.add(cube);

  // create a sphere
  var sphereGeometry = new THREE.SphereGeometry(4, 20, 20);
  var sphereMaterial = new THREE.MeshLambertMaterial({
    color: 0x7777ff,
    wireframe: false,
  });
  var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

  // position the sphere
  sphere.position.x = 20;
  sphere.position.y = 4;
  sphere.position.z = 2;
  sphere.castShadow = true;

  // add the sphere to the scene
  scene.add(sphere);

  // position and point the camera to the center of the scene
  camera.position.x = -30;
  camera.position.y = 40;
  camera.position.z = 30;
  camera.lookAt(scene.position);

  let spotLight = new THREE.SpotLight(0xffffff);
  // spotLight.postion.set(-20, 30, -5);
  spotLight.position.set(-20, 30, -5);
  spotLight.castShadow = true;

  scene.add(spotLight);
  // add the output of the renderer to the html element

  let steps = 0;
  function renderScene() {
    cube.rotation.x += control.rotationSpeed;;
    cube.rotation.z += control.rotationSpeed;;
    cube.rotation.y += control.rotationSpeed;;

    steps += control.bouncingSpeed;
    sphere.position.z = -5 + (10 * (Math.cos(steps)));
    sphere.position.y = 2 + (10 * (Math.abs(Math.sin(steps))));
    stats.update();
    requestAnimationFrame(renderScene);
    renderer.render(scene, camera);

  }
  function initStats() {
    var stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms
    stats.domElement.style.position = "absolute";

    stats.domElement.style.left = "0px";
    stats.domElement.style.top = "0px";
    document.getElementById("Stats-output").appendChild(stats.domElement);
    return stats
  }
  document
    .getElementById("WebGL-output")
    .appendChild(renderer.domElement);
  renderScene();

  // render the scene
  renderer.render(scene, camera);
}
window.onload = init;
