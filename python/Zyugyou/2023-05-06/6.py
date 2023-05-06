
import PyPDF2
minutes_file = open('meetingminutes.pdf', 'rb')
pdf_reader = PyPDF2.PdfReader(minutes_file)
minutes_first_page = pdf_reader.pages[0]
pdf_watermark_reader = PyPDF2.PdfReader(open('watermark.pdf', 'rb'))
minutes_first_page.merge_page(pdf_watermark_reader.pages[0])
