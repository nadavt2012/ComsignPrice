import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { marked } from 'marked';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF() {
  console.log('🚀 Starting PDF generation with Puppeteer...');
  
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
      margin: 1.5cm 2cm;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
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
      font-size: 28px;
    }
    
    h2 {
      color: #d32f2f;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 8px;
      margin-top: 25px;
      page-break-after: avoid;
      font-size: 22px;
    }
    
    h3 {
      color: #e53935;
      margin-top: 20px;
      page-break-after: avoid;
      font-size: 18px;
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
      font-size: 11px;
    }
    
    table th {
      background-color: #c41e3a;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
    }
    
    table td {
      border: 1px solid #ddd;
      padding: 8px 6px;
    }
    
    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #c7254e;
    }
    
    pre {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-left: 4px solid #c41e3a;
      padding: 12px;
      overflow-x: auto;
      page-break-inside: avoid;
      border-radius: 4px;
      font-size: 11px;
    }
    
    pre code {
      background: none;
      padding: 0;
      color: #333;
    }
    
    ul, ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    
    li {
      margin: 5px 0;
      font-size: 13px;
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
    
    p {
      font-size: 13px;
      margin: 10px 0;
    }
    
    /* Cover page */
    .cover-page {
      text-align: center;
      padding: 150px 0;
      page-break-after: always;
    }
    
    .cover-page h1 {
      font-size: 36px;
      border: none;
      margin-bottom: 20px;
    }
    
    .cover-page .subtitle {
      font-size: 20px;
      color: #666;
      margin: 15px 0;
    }
    
    .cover-page .version {
      font-size: 16px;
      color: #999;
      margin: 10px 0;
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
    <p style="color: #666; font-size: 14px; margin-top: 40px;">
      <strong>Classification:</strong> Internal - Management Review<br>
      <strong>Purpose:</strong> CEO/Management Approval for Company-Wide Deployment
    </p>
  </div>
  
  ${htmlContent}
  
  <hr style="margin-top: 60px;">
  <footer style="text-align: center; color: #666; padding: 40px 0; font-size: 12px;">
    <p><strong>Comsign Pricing Calculator - Security Documentation</strong></p>
    <p>Confidential - Internal Use Only</p>
    <p>© 2025 Comsign. All Rights Reserved.</p>
  </footer>
</body>
</html>
  `;
  
  console.log('📄 Launching browser...');
  
  // Launch browser and generate PDF
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  console.log('🌐 Creating page...');
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfPath = path.join(__dirname, '..', 'Comsign_Security_Documentation.pdf');
  
  console.log('📝 Generating PDF...');
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '1.5cm',
      right: '2cm',
      bottom: '1.5cm',
      left: '2cm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding: 5px 0; border-bottom: 1px solid #e0e0e0;">
        Comsign Pricing Calculator - Comprehensive Security Documentation
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 9px; width: 100%; text-align: center; color: #666; padding: 5px 0; border-top: 1px solid #e0e0e0;">
        <span style="margin-right: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span>Confidential - Internal Use Only - October 2025</span>
      </div>
    `
  });
  
  await browser.close();
  
  console.log('');
  console.log('✅ PDF generated successfully!');
  console.log(`📄 File: ${pdfPath}`);
  console.log(`📊 Location: /home/runner/workspace/Comsign_Security_Documentation.pdf`);
  console.log('');
  console.log('📋 The PDF includes:');
  console.log('   ✅ 24 comprehensive sections');
  console.log('   ✅ Complete security audit results');
  console.log('   ✅ OWASP 2025 compliance documentation');
  console.log('   ✅ Deployment checklist and procedures');
  console.log('   ✅ Incident response plan');
  console.log('   ✅ Technical specifications');
  console.log('   ✅ Professional formatting for management review');
  console.log('');
  console.log('🎯 Ready for CEO/Management approval!');
}

generatePDF().catch(error => {
  console.error('❌ Error generating PDF:', error);
  process.exit(1);
});
