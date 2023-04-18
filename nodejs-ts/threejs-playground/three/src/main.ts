
const appElement = document.querySelector<HTMLDivElement>('#appElement')!;
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';


//
// ➊ three.jsセットアップ
//

// ライブラリの読み込み
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 座表軸
const axes = new THREE.AxesHelper();

// シーンを初期化
const scene = new THREE.Scene();
scene.add(axes);

const gltfLoader = new GLTFLoader();
const url = './pdca_file_2.glb';
// q: このオブジェクトをx軸方向に毎秒回転するようにして欲しい
// a: このオブジェクトのrotationプロパティを毎フレーム更新する

gltfLoader.load(url, (gltf) => {
  const root = gltf.scene;
  // フレームが更新されるごとに実行する
  setInterval(() => {
    root.rotation.x += 0.002;
    root.rotation.y += 0.005;
    root.rotation.z += 0.02;
  }, 1);
  scene.add(root);
});


// カメラを初期化
const camera = new THREE.PerspectiveCamera(50, appElement.offsetWidth / appElement.offsetHeight);
camera.position.set(1, 1, 1);
camera.lookAt(scene.position);

// レンダラーの初期化
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0xffffff, 1.0); // 背景色
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(appElement.offsetWidth, appElement.offsetHeight);

// レンダラーをDOMに追加
appElement.appendChild(renderer.domElement);

// カメラコントローラー設定
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.maxPolarAngle = Math.PI * 0.5;
orbitControls.minDistance = 0.1;
orbitControls.maxDistance = 100;
orbitControls.autoRotate = true;     // カメラの自動回転設定
orbitControls.autoRotateSpeed = 0; // カメラの自動回転速度

// ➋ 描画ループを開始
renderer.setAnimationLoop(() => {
  // カメラコントローラーを更新
  orbitControls.update();

  // 描画する
  renderer.render(scene, camera);
});

