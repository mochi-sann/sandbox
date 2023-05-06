
import PyPDF2
pdf_file = open('meetingminutes.pdf', 'rb')
pdf_reader = PyPDF2.PdfReader(pdf_file)
pdf_writer = PyPDF2.PdfWriter()
for page_num in range(len(pdf_reader.pages)):
    pdf_writer.add_page(pdf_reader.pages[page_num])
pdf_writer.encrypt('swordfish')
result_pdf = open('encryptedminutes.pdf', 'wb')
pdf_writer.write(result_pdf)
result_pdf.close()
