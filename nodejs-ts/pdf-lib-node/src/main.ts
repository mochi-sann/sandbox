import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";

const main = async () => {
  const pdfDoc = await PDFDocument.create();

  // ページを追加
  const page = pdfDoc.addPage([600, 400]);

  const pngImageBytes = fs.readFileSync("./src/test.png");
  // 画像を読み込む（JPEGやPNG形式をサポート）
  const pngImage = await pdfDoc.embedPng(pngImageBytes); // PNG形式の場合
  // const jpgImage = await pdfDoc.embedJpg(imageBytes); // JPEG形式の場合

  // 画像サイズを取得
  const { width, height } = pngImage;

  const fontSize = 30;
  page.drawText("Creating PDFs in typescript is awesome!", {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    color: rgb(0, 0.53, 0.71),
  });
  // 画像をページに描画
  page.drawImage(pngImage, {
    x: 50,
    y: 200,
    width: width / 2,
    height: height / 2,
  });

  // PDFバイトを保存
  const pdfBytes = await pdfDoc.save();

  // ファイルに書き出し
  fs.writeFileSync("output_with_image.pdf", pdfBytes);
  console.log("PDF saved as output_with_image.pdf");
};
main();
