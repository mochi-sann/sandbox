import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";

export async function deleteImage(pdfDoc1Bytes: Uint8Array) {
  console.log("hoge world");
  const pdfDoc = await PDFDocument.load(pdfDoc1Bytes);

  // 各ページを処理
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    // ページ内の描画オペレーションを取得
    const operations = page.node.normalizedEntries().Contents?.asArray() || [];

    // 描画オペレーションをフィルタして画像関連の操作を削除
    const filteredOperations = operations.filter(
      (op) => !["Do", "BI", "EI"].includes(op.clone()),
    );

    // 操作を上書き
    page.node.normalizedEntries().Contents = filteredOperations;
  }

  // 新しいPDFデータを生成
  const modifiedPdfBytes = await pdfDoc.save();

  // 新しいPDFを保存
  await fs.writeFile("new out.pdf", modifiedPdfBytes);

  console.log(`画像を削除したPDFを保存しました: `);
}
