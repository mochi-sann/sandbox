


//
// ➊ three.jsセットアップ
//

// ライブラリの読み込み
//
import * as THREE from 'three';
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;

let conatiner = document.body;

init();
function init() {
  // カメラの作成
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 15000);
  // シーンの作成
  scene = new THREE.Scene();


  //geometry
  const size = 250
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 50 });
  // for 2500 cubes
  for (let i = 0; i < 2500; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = ((Math.random() * 2.0) - 1.0) * 8000;
    mesh.position.y = ((Math.random() * 2.0) - 1.0) * 8000;
    mesh.position.z = ((Math.random() * 2.0) - 1.0) * 8000;

    scene.add(mesh);

  }
  // ライトの作成
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  scene.add(directionalLight);


  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  conatiner.appendChild(renderer.domElement);

  renderer.render(scene, camera);

}

