import markdown
import os
import win32com.client

# Set paths
docs_dir = os.path.abspath(os.path.dirname(__file__))
md_file = os.path.join(docs_dir, 'MEMOIRE_SGSSA.md')
html_file = os.path.join(docs_dir, 'MEMOIRE_SGSSA.html')
pdf_file = os.path.join(docs_dir, 'MEMOIRE_SGSSA.pdf')

# Read markdown
with open(md_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Convert to HTML
html = markdown.markdown(text, extensions=['tables', 'fenced_code'])

# Write HTML with styles
html_content = f"""
<html>
<head>
    <meta charset='utf-8'/>
    <style>
        body {{ font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; padding: 2em; }}
        h1, h2, h3 {{ color: #2c3e50; text-align: center; margin-top: 1.5em; }}
        h1 {{ font-size: 24pt; }}
        h2 {{ font-size: 20pt; }}
        div[align="center"] {{ text-align: center; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 1em; margin-bottom: 1em; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        img {{ max-width: 100%; height: auto; }}
        .page-break {{ page-break-before: always; }}
    </style>
</head>
<body>
    {html.replace('\\newpage', '<div class="page-break"></div>')}
</body>
</html>
"""

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

print("HTML generated. Attempting to convert to PDF via MS Word...")

try:
    word = win32com.client.Dispatch('Word.Application')
    word.Visible = False
    doc = word.Documents.Open(html_file)
    doc.SaveAs(pdf_file, FileFormat=17) # 17 is wdFormatPDF
    doc.Close()
    word.Quit()
    print('PDF generated successfully at:', pdf_file)
except Exception as e:
    print(f'Error generating PDF: {e}')
