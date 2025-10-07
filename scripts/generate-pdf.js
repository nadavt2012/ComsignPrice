import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { marked } from 'marked';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  console.log('Starting PDF generation...');
  
  // Read the markdown file
  const mdPath = path.join(__dirname, '..', 'COMPREHENSIVE_SECURITY_DOCUMENTATION.md');
  const markdown = readFileSync(mdPath, 'utf-8');
  
  // Convert markdown to HTML
  const htmlContent = marked(markdown);
  
  // Create complete HTML document with styling
  const html = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <title>Comsign Security Documentation</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
      margin: 0;
      padding: 20px;
      background: white;
    }
    
    h1 {
      color: #c41e3a;
      border-bottom: 3px solid #c41e3a;
      padding-bottom: 10px;
      margin-top: 30px;
      page-break-after: avoid;
      font-size: 32px;
    }
    
    h2 {
      color: #d32f2f;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
      margin-top: 25px;
      page-break-after: avoid;
      font-size: 24px;
    }
    
    h3 {
      color: #e53935;
      margin-top: 20px;
      page-break-after: avoid;
      font-size: 20px;
    }
    
    h4 {
      color: #666;
      margin-top: 15px;
      font-size: 16px;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
      page-break-inside: avoid;
      font-size: 13px;
    }
    
    table th {
      background-color: #c41e3a;
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
    }
    
    table td {
      border: 1px solid #ddd;
      padding: 10px 8px;
    }
    
    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #c7254e;
    }
    
    pre {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-left: 4px solid #c41e3a;
      padding: 15px;
      overflow-x: auto;
      page-break-inside: avoid;
      border-radius: 4px;
    }
    
    pre code {
      background: none;
      padding: 0;
      color: #333;
    }
    
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    
    li {
      margin: 5px 0;
    }
    
    blockquote {
      border-left: 4px solid #c41e3a;
      margin: 15px 0;
      padding: 10px 20px;
      background-color: #fff8f8;
    }
    
    hr {
      border: none;
      border-top: 2px solid #e0e0e0;
      margin: 30px 0;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    /* Checkmark styling */
    td:contains("✅"), li:contains("✅") {
      color: #4caf50;
      font-weight: 500;
    }
    
    /* Table of contents */
    nav ul {
      list-style: none;
      padding-left: 0;
    }
    
    nav ul li {
      margin: 8px 0;
    }
    
    nav ul li a {
      text-decoration: none;
      color: #c41e3a;
    }
    
    nav ul li a:hover {
      text-decoration: underline;
    }
    
    /* Print optimizations */
    @media print {
      body {
        font-size: 12pt;
      }
      
      h1 { font-size: 24pt; }
      h2 { font-size: 20pt; }
      h3 { font-size: 16pt; }
      
      a {
        text-decoration: none;
        color: #000;
      }
      
      pre, blockquote, table {
        page-break-inside: avoid;
      }
      
      h1, h2, h3, h4 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `;
  
  // Launch browser and generate PDF
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  const pdfPath = path.join(__dirname, '..', 'Comsign_Security_Documentation.pdf');
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 10px 0;">
        Comsign Pricing Calculator - Security Documentation
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 10px 0;">
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span style="margin: 0 20px;">|</span>
        <span>Confidential - Internal Use Only</span>
      </div>
    `
  });
  
  await browser.close();
  
  console.log('✅ PDF generated successfully!');
  console.log(`📄 File: ${pdfPath}`);
  console.log(`📊 Size: ${(await import('fs')).statSync(pdfPath).size / 1024 / 1024} MB`);
}

generatePDF().catch(error => {
  console.error('❌ Error generating PDF:', error);
  process.exit(1);
});
