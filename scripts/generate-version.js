#!/usr/bin/env node

// אוטו-גנרטור של גרסאות לכל deploy
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// יצירת מספר גרסה פשוט עם קאונטר
function generateVersion() {
  // נסיון לקרוא את מספר הגרסה הנוכחית
  const versionPath = path.join(__dirname, '..', 'client', 'public', 'version.json');
  let currentVersion = { major: 3, minor: 0, patch: 1 };
  
  try {
    if (fs.existsSync(versionPath)) {
      const existingData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      if (existingData.versionNumbers) {
        currentVersion = existingData.versionNumbers;
      }
    }
  } catch (error) {
    console.log('יצירת גרסה ראשונה...');
  }
  
  // העלאת מספר הגרסה
  currentVersion.patch += 1;
  
  // גרסה בפורמט: v3.0.2
  return {
    version: `v${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`,
    versionNumbers: currentVersion
  };
}

// כתיבת הגרסה לקובץ JSON
function writeVersion() {
  const versionData = generateVersion();
  const fullVersionData = {
    version: versionData.version,
    versionNumbers: versionData.versionNumbers,
    buildTime: new Date().toISOString(),
    buildTimestamp: Date.now()
  };
  
  // יצירת התיקייה אם לא קיימת
  const publicDir = path.join(process.cwd(), 'client', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // כתיבת קובץ הגרסה
  const versionPath = path.join(publicDir, 'version.json');
  fs.writeFileSync(versionPath, JSON.stringify(fullVersionData, null, 2));
  
  console.log(`✅ גרסה חדשה נוצרה: ${versionData.version}`);
  console.log(`📁 נשמר ב: ${versionPath}`);
  
  return versionData.version;
}

// הרצה של הסקריפט
if (import.meta.url === `file://${process.argv[1]}`) {
  writeVersion();
}

// ES modules export
export { generateVersion, writeVersion };