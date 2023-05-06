
import PyPDF2
pdf_file = open('meetingminutes.pdf', 'rb')
pdf_reader = PyPDF2.PdfReader(pdf_file)

newpdf = PyPDF2.PdfWriter()


# 1ページ目を削除したPDFを作成する
for page_num in reversed(range(len(pdf_reader.pages))):
    newpdf.add_page(pdf_reader.pages[page_num])


# pdfを保存する

newpdf.write('edit2.pdf')
