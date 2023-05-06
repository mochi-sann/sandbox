
from PyPDF2 import PdfReader

reader = PdfReader("encrypted.pdf")
print(reader.is_encrypted)
file = reader.decrypt("rosebud")
page = reader.pages[0]
print(page.extract_text())
