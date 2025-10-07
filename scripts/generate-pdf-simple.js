import { readFileSync, writeFileSync } from 'fs';
import { marked } from 'marked';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateHTML() {
  console.log('Starting HTML generation for PDF conversion...');
  
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    
    h1 {
      color: #c41e3a;
      border-bottom: 3px solid #c41e3a;
      padding-bottom: 10px;
      margin-top: 40px;
      page-break-after: avoid;
      font-size: 2.5em;
    }
    
    h2 {
      color: #d32f2f;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
      margin-top: 35px;
      page-break-after: avoid;
      font-size: 2em;
    }
    
    h3 {
      color: #e53935;
      margin-top: 25px;
      page-break-after: avoid;
      font-size: 1.5em;
    }
    
    h4 {
      color: #666;
      margin-top: 20px;
      font-size: 1.2em;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      page-break-inside: avoid;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    table th {
      background-color: #c41e3a;
      color: white;
      padding: 14px 10px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #b71c2c;
    }
    
    table td {
      border: 1px solid #ddd;
      padding: 12px 10px;
    }
    
    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    table tr:hover {
      background-color: #fff5f5;
    }
    
    code {
      background-color: #f4f4f4;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
      color: #c7254e;
      border: 1px solid #e1e1e1;
    }
    
    pre {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-left: 4px solid #c41e3a;
      padding: 20px;
      overflow-x: auto;
      page-break-inside: avoid;
      border-radius: 6px;
      margin: 20px 0;
    }
    
    pre code {
      background: none;
      padding: 0;
      color: #333;
      border: none;
    }
    
    ul, ol {
      margin: 15px 0;
      padding-left: 35px;
    }
    
    li {
      margin: 8px 0;
    }
    
    blockquote {
      border-left: 4px solid #c41e3a;
      margin: 20px 0;
      padding: 15px 25px;
      background-color: #fff8f8;
      border-radius: 4px;
    }
    
    hr {
      border: none;
      border-top: 2px solid #e0e0e0;
      margin: 40px 0;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    /* Cover page styling */
    .cover-page {
      text-align: center;
      padding: 100px 0;
      page-break-after: always;
    }
    
    .cover-page h1 {
      font-size: 3em;
      color: #c41e3a;
      border: none;
      margin-bottom: 20px;
    }
    
    .cover-page .subtitle {
      font-size: 1.5em;
      color: #666;
      margin: 20px 0;
    }
    
    .cover-page .version {
      font-size: 1.2em;
      color: #999;
      margin: 10px 0;
    }
    
    /* Status badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.9em;
      font-weight: 600;
      margin: 0 4px;
    }
    
    .badge.success {
      background-color: #4caf50;
      color: white;
    }
    
    .badge.warning {
      background-color: #ff9800;
      color: white;
    }
    
    .badge.error {
      background-color: #f44336;
      color: white;
    }
    
    /* Print optimizations */
    @media print {
      body {
        font-size: 12pt;
        padding: 0;
      }
      
      h1 { 
        font-size: 24pt; 
        margin-top: 20pt;
      }
      
      h2 { 
        font-size: 20pt;
        margin-top: 16pt;
      }
      
      h3 { 
        font-size: 16pt;
        margin-top: 12pt;
      }
      
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
      
      img {
        max-width: 100%;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <h1>🔒 Comsign Pricing Calculator</h1>
    <p class="subtitle">Comprehensive Security Documentation</p>
    <p class="subtitle">& Implementation Guide</p>
    <p class="version">Version 3.0 Enterprise Edition</p>
    <p class="version">October 2025</p>
    <hr style="width: 50%; margin: 40px auto;">
    <p style="color: #666; font-size: 1.1em; margin-top: 40px;">
      <strong>Classification:</strong> Internal - Management Review<br>
      <strong>Purpose:</strong> CEO/Management Approval for Deployment
    </p>
  </div>
  
  ${htmlContent}
  
  <hr style="margin-top: 60px;">
  <footer style="text-align: center; color: #666; padding: 40px 0; font-size: 0.9em;">
    <p><strong>Comsign Pricing Calculator - Security Documentation</strong></p>
    <p>Confidential - Internal Use Only</p>
    <p>© 2025 Comsign. All Rights Reserved.</p>
  </footer>
</body>
</html>
  `;
  
  const htmlPath = path.join(__dirname, '..', 'SECURITY_DOCUMENTATION.html');
  writeFileSync(htmlPath, html, 'utf-8');
  
  console.log('✅ HTML generated successfully!');
  console.log(`📄 File: ${htmlPath}`);
  console.log('');
  console.log('📋 To convert to PDF:');
  console.log('   1. Open the HTML file in your browser');
  console.log('   2. Print (Ctrl+P or Cmd+P)');
  console.log('   3. Select "Save as PDF" as the printer');
  console.log('   4. Adjust settings:');
  console.log('      - Layout: Portrait');
  console.log('      - Paper size: A4');
  console.log('      - Margins: Default');
  console.log('      - Background graphics: Enabled');
  console.log('   5. Save the PDF');
  console.log('');
  console.log('Or use online tools:');
  console.log('   - https://www.web2pdfconvert.com/');
  console.log('   - https://www.html2pdf.com/');
  console.log('   - Chrome/Edge: Print to PDF');
}

generateHTML().catch(error => {
  console.error('❌ Error generating HTML:', error);
  process.exit(1);
});
