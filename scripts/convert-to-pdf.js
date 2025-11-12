import { readFileSync, writeFileSync } from 'fs';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

async function convertMarkdownToPDF() {
  try {
    console.log('📖 Reading markdown file...');
    const markdown = readFileSync('SECURITY_PROCEDURES_REPORT.md', 'utf-8');
    
    console.log('🔄 Converting markdown to HTML...');
    const htmlContent = marked(markdown);
    
    const fullHtml = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Procedures Report</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        body {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            font-size: 11pt;
        }
        
        h1 {
            color: #1a1a1a;
            border-bottom: 3px solid #ef4444;
            padding-bottom: 10px;
            margin-top: 30px;
            font-size: 24pt;
            page-break-after: avoid;
        }
        
        h2 {
            color: #2c2c2c;
            border-bottom: 2px solid #ddd;
            padding-bottom: 8px;
            margin-top: 25px;
            font-size: 18pt;
            page-break-after: avoid;
        }
        
        h3 {
            color: #444;
            margin-top: 20px;
            font-size: 14pt;
            page-break-after: avoid;
        }
        
        h4 {
            color: #555;
            margin-top: 15px;
            font-size: 12pt;
            page-break-after: avoid;
        }
        
        p {
            margin: 10px 0;
            text-align: justify;
        }
        
        ul, ol {
            margin: 10px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 5px 0;
        }
        
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            color: #c7254e;
        }
        
        pre {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-left: 4px solid #ef4444;
            padding: 15px;
            overflow-x: auto;
            border-radius: 4px;
            page-break-inside: avoid;
            font-size: 9pt;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: #333;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
            page-break-inside: avoid;
            font-size: 10pt;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        th {
            background-color: #ef4444;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        blockquote {
            border-left: 4px solid #ef4444;
            padding-left: 20px;
            margin: 15px 0;
            color: #555;
            font-style: italic;
            background-color: #f9f9f9;
            padding: 10px 20px;
        }
        
        hr {
            border: none;
            border-top: 2px solid #ddd;
            margin: 30px 0;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        strong {
            color: #000;
            font-weight: bold;
        }
        
        em {
            font-style: italic;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            h1, h2, h3 {
                page-break-after: avoid;
            }
            
            table, pre {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
    `;
    
    console.log('🌐 Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    console.log('📝 Loading HTML content...');
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    console.log('📄 Generating PDF...');
    await page.pdf({
      path: 'SECURITY_PROCEDURES_REPORT.pdf',
      format: 'A4',
      margin: {
        top: '2cm',
        right: '2cm',
        bottom: '2cm',
        left: '2cm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
    
    await browser.close();
    
    console.log('✅ PDF created successfully: SECURITY_PROCEDURES_REPORT.pdf');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

convertMarkdownToPDF();
