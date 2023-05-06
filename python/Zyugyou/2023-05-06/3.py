from PyPDF2 import PdfReader

reader = PdfReader("meetingminutes.pdf")
number_of_pages = len(reader.pages)
page = reader.pages[0]
text = page.extract_text()
print(text)
