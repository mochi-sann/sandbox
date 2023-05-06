import PyPDF2
pdf1_file = open('meetingminutes.pdf', 'rb')
pdf2_file = open('meetingminutes2.pdf', 'rb')
pdf1_reader = PyPDF2.PdfReader(pdf1_file)
pdf2_reader = PyPDF2.PdfReader(pdf2_file)
pdf_writer = PyPDF2.PdfWriter()

for page_num in range(len(pdf1_reader.pages)):
    page_obj = pdf1_reader.pages[page_num]
    pdf_writer.add_page(page_obj)
for page_num in range(len(pdf2_reader.pages)):
    page_obj = pdf2_reader.pages[page_num]
    pdf_writer.add_page(page_obj)

pdf_output_file = open('combinedminutes.pdf', 'wb')
pdf_writer.write(pdf_output_file)
pdf_output_file.close()
pdf1_file.close()
pdf2_file.close()
