// const selectors = document.querySelectorAll("button.emoji");
// const selectors = document.querySelectorAll("#misskey_app > div > div.xFdHz > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div > div > div > div > div:nth-child(14)")
const selectors = document.querySelector(
  "#misskey_app > div.mk-app > div > div.contents > main > div > div:nth-child(2) > div > div > div > div > div:nth-child(8)",
);
const img_btns = selectors.querySelectorAll(".xC3bi");

let emoji_list = [];
for (const el of img_btns) {
  const imgSrc = el.querySelector("img").getAttribute("src");
  // await downloadImage(imgSrc)
  // console.log(imgSrc)
  const name = el.querySelector(".xm2Hz").textContent;
  const tags = el.querySelector(".xmITz").textContent || "";
  const newEmoji = {
    url: imgSrc,
    name: name || "",
    tags: tags,
  };
  
  emoji_list.push(newEmoji);
}

console.log(JSON.stringify(emoji_list));
