import * as THREE from "three";
import "./style.css";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
let container = document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
let cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

function animate() {
  requestAnimationFrame(animate);

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

// window resize event handler

function onHover() {
  console.log("hover");

  cube.material.color.setHex(0x00ff00);
}

// マウスアウト時に実行される関数
function onOut() {
  console.log("out");
  cube.material.color.setHex(0xff0000);
}

function onResize() {
  console.log("resize");
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// マウス座標を取得するためのRaycasterを生成
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// マウス座標を更新するための関数
function onMouseMove(event: MouseEvent) {
  event.preventDefault();

  // マウスの座標を正規化
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Raycasterでマウス位置から光線を飛ばし、衝突するオブジェクトを取得
  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0 && intersects[0].object === cube) { // マウスがCubeにホバーした場合
    cube.material.color.set(0x00ff00); // Cubeの色をグリーンにする
  } else {
    cube.material.color.set(0xff0000); // Cubeの色をレッドにする
  }
}
container.addEventListener("mousemove", onMouseMove, false);

window.addEventListener("resize", onResize);
// レンダリング関数

// マウスイベントリスナーを追加する
container.addEventListener("mouseover", onHover);
container.addEventListener("mouseout", onOut);

animate();
