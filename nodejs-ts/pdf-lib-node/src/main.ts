import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";

const main = async () => {
  console.log("Hello World!");

  // PDF Creation
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 30;
  page.drawText("Creating PDFs in typescript is awesome!", {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    font: timesRomanFont,
    color: rgb(0, 0.53, 0.71),
  });
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("output.pdf", pdfBytes);
  console.log("PDF saved as output.pdf");

  // Load and embed a PNG image
  try {
    const pngImageBytes = fs.readFileSync("./src/test.png");

    const pngImage = await pdfDoc.embedPng(pngImageBytes);

    // Calculate the dimensions of the PNG image scaled down to 50%
    const pngDims = pngImage.scale(0.5);

    // Get the first page of the PDF

    // Draw the image on the page
      page.drawImage(pngImage, {
    x: 50,
    y: 200,
    width: width / 2,
    height: height / 2,
  });

    // Save the PDF
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync("output2.pdf", modifiedPdfBytes);
    console.log("PDF saved as output2.pdf");

  } catch (err) {
    console.log(err);
  }
};
main();
