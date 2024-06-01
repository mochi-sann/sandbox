//
// ➊ three.jsセットアップ
//

// ライブラリの読み込み
//
import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as dat from "dat.gui";

let conatiner = document.body;
const gui = new dat.GUI();

var param = { x_routetion_speed: 0.01,  y_routetion_speed: 0.01 };
gui.add(param, "x_routetion_speed", -0.1, 0.1);
gui.add(param, "y_routetion_speed", -0.1, 0.1);

function init() {
  const canvasElement = document.querySelector("#canvas") as Element
  const renderer = new THREE.WebGLRenderer({
    canvas:  canvasElement,
  });
  const width = 960;
  const height = 540;
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; 
  controls.dampingFactor = 0.2;

  // カメラの初期座標を設定（X座標:0, Y座標:0, Z座標:0）
  camera.position.set(0, 0, 1000);
  const geometry = new THREE.BoxGeometry(400, 400, 400);
  // const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
  const material = new THREE.MeshNormalMaterial();

  const box = new THREE.Mesh(geometry, material);
  scene.add(box);
  const light = new THREE.DirectionalLight(0xffffff);
  light.intensity = 2; // 光の強さを倍に
  light.position.set(1, 1, 1);
  scene.add(light);

  renderer.render(scene, camera);

  tick();
  function tick() {
    requestAnimationFrame(tick);
    box.rotation.x += param.x_routetion_speed;
    box.rotation.y += param.y_routetion_speed;
    renderer.render(scene, camera);
  }
}

init();
