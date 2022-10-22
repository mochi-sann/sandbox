import { gsap, Bounce, Power0 } from "gsap";

// 個数
const MAX = 100;

// 適当に要素をたくさん用意する
// const rects = [];
// for (let i = 0; i < MAX; i++) {
//   const rect = document.createElement("div");
//   rect.className = "rect";
//   rect.style.width = `100px`;
//   rect.style.height = `100px`;
//   rect.style.left = `calc(100vw * ${i / MAX})`;
//   document.body.appendChild(rect);
//   rects.push(rect);
// }
//
// // タイムラインを作成する
// const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
// rects.forEach((rect, index) => {
//   // トゥイーンインスタンスを追加する
//   gsap.to(rect, {
//     duration: 3,
//     y: (window.innerHeight * 3) / 4,
//     ease: Bounce.easeOut,
//     delay: Math.random(),
//     yoyo: true,
//   }),
//     0;
// });
window.addEventListener("DOMContentLoaded", () => {
  gsap.defaults({
    repeat: -1, // 無限に繰り返し
    repeatDelay: 0.5, // 繰り返し時に0.5秒の待機,
    backgroundColor: "#ffffff",
    ease: "power4.inOut",
    scale: 1,
    opacity: 1,
  });

  gsap.to(".example-repeat .rect", {
    x: 200,
    duration: 2,
    repeat: -1, // 無限に繰り返し
    repeatDelay: 0.5, // 繰り返し時に0.5秒の待機,
  });

  gsap.to(".example-yoyo .rect", {
    x: 200,
    scale: 0.4,

    backgroundColor: "#aeb3be",
    duration: 2,
    repeat: -1, // 無限に繰り返し
    yoyo: true, // 反転
    opacity: 0.2,
    ease: "ease.out",
  });
});
