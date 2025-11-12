#!/usr/bin/env python3
import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
import sys

def create_pdf():
    print("📖 Reading markdown file...")
    with open('SECURITY_PROCEDURES_REPORT.md', 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    print("🔄 Converting markdown to HTML...")
    html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
    
    # Create styled HTML
    full_html = f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Comsign Security Procedures Report</title>
    <style>
        @page {{
            margin: 2cm;
            size: A4;
            @bottom-right {{
                content: counter(page) " / " counter(pages);
                font-size: 9pt;
                color: #666;
            }}
        }}
        
        body {{
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.7;
            color: #333;
            font-size: 11pt;
        }}
        
        h1 {{
            color: #1a1a1a;
            border-bottom: 4px solid #ef4444;
            padding-bottom: 10px;
            margin-top: 30px;
            margin-bottom: 20px;
            font-size: 28pt;
            page-break-after: avoid;
        }}
        
        h2 {{
            color: #2c2c2c;
            border-bottom: 2px solid #ef4444;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 20pt;
            page-break-after: avoid;
        }}
        
        h3 {{
            color: #444;
            margin-top: 25px;
            margin-bottom: 12px;
            font-size: 15pt;
            page-break-after: avoid;
        }}
        
        h4 {{
            color: #555;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 13pt;
            font-weight: 600;
            page-break-after: avoid;
        }}
        
        p {{
            margin: 12px 0;
            text-align: justify;
        }}
        
        ul, ol {{
            margin: 12px 0;
            padding-left: 30px;
        }}
        
        li {{
            margin: 6px 0;
        }}
        
        code {{
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            color: #c7254e;
        }}
        
        pre {{
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-left: 5px solid #ef4444;
            padding: 15px;
            border-radius: 4px;
            page-break-inside: avoid;
            font-size: 9pt;
            margin: 15px 0;
            overflow-x: auto;
        }}
        
        pre code {{
            background: none;
            padding: 0;
            color: #333;
        }}
        
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            page-break-inside: avoid;
            font-size: 10pt;
        }}
        
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        
        th {{
            background-color: #ef4444;
            color: white;
            font-weight: bold;
        }}
        
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        
        blockquote {{
            border-left: 5px solid #ef4444;
            padding-left: 20px;
            margin: 20px 0;
            color: #555;
            font-style: italic;
            background-color: #f9f9f9;
            padding: 15px 20px;
        }}
        
        hr {{
            border: none;
            border-top: 2px solid #ddd;
            margin: 40px 0;
        }}
        
        strong {{
            color: #000;
            font-weight: bold;
        }}
        
        em {{
            font-style: italic;
        }}
    </style>
</head>
<body>
    {html_content}
</body>
</html>
    '''
    
    print("📄 Generating PDF...")
    font_config = FontConfiguration()
    html = HTML(string=full_html)
    
    css = CSS(string='''
        @page {
            margin: 2cm;
            size: A4;
        }
    ''', font_config=font_config)
    
    html.write_pdf('SECURITY_PROCEDURES_REPORT.pdf', stylesheets=[css], font_config=font_config)
    
    print("✅ PDF created successfully: SECURITY_PROCEDURES_REPORT.pdf")

if __name__ == '__main__':
    try:
        create_pdf()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
