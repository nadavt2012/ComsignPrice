import { getUncachableGitHubClient } from './server/github-client.js';
import fs from 'fs';
import path from 'path';

async function updateGitHub() {
  try {
    console.log('🔄 מעדכן את הקוד ב-GitHub...');
    
    const octokit = await getUncachableGitHubClient();
    const owner = 'nadavt2012';
    const repo = 'comsign-pricing-calculator';
    
    // Collect all files (same logic as before)
    const filesToUpload = [];
    
    function collectFiles(dir, basePath = '') {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativePath = basePath ? path.join(basePath, file) : file;
        
        // Skip certain files
        if (file === 'node_modules' || file === '.git' || file === '.env' || 
            file === '.replit' || file === 'replit.nix' || 
            file.startsWith('.') || file.endsWith('.log') ||
            file === 'setup-github-repo.js' || file === 'upload-to-github.js' ||
            file === 'update-github.js' || file === 'VERCEL_SETUP_GUIDE.md') {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          collectFiles(fullPath, relativePath);
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            filesToUpload.push({
              path: relativePath,
              content: content
            });
          } catch (readError) {
            console.warn(`⚠️ לא ניתן לקרוא קובץ: ${relativePath}`);
          }
        }
      }
    }
    
    collectFiles('.');
    console.log(`📁 נמצאו ${filesToUpload.length} קבצים לעדכון`);
    
    // Get current HEAD
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });
    
    const { data: commit } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: ref.object.sha
    });
    
    // Create blobs for all files
    console.log('📤 מעלה קבצים...');
    const blobs = {};
    let uploadCount = 0;
    
    for (const file of filesToUpload) {
      try {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        blobs[file.path] = blob.sha;
        uploadCount++;
        
        // Show progress
        if (uploadCount % 10 === 0) {
          console.log(`   העלאה: ${uploadCount}/${filesToUpload.length} קבצים`);
        }
      } catch (blobError) {
        console.warn(`⚠️ שגיאה בהעלאת: ${file.path}`, blobError.message);
      }
    }
    
    // Create new tree
    const tree = Object.entries(blobs).map(([path, sha]) => ({
      path,
      mode: '100644',
      type: 'blob',
      sha
    }));
    
    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      tree,
      base_tree: commit.tree.sha
    });
    
    // Create commit with timestamp
    const now = new Date();
    const timeString = now.toLocaleString('he-IL');
    
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `עדכון מ-Replit: ${timeString} - מחשבון מחירים קומסיין`,
      tree: newTree.sha,
      parents: [ref.object.sha]
    });
    
    // Update HEAD
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.sha
    });
    
    console.log('✅ העדכון הושלם בהצלחה!');
    console.log(`🔗 GitHub: https://github.com/${owner}/${repo}`);
    console.log(`📦 Commit: ${newCommit.sha.substring(0, 8)}`);
    console.log(`📁 עודכנו ${uploadCount} קבצים`);
    console.log('🚀 Vercel יעדכן את האתר תוך כמה דקות...');
    
    return {
      success: true,
      filesUpdated: uploadCount,
      commitSha: newCommit.sha
    };
    
  } catch (error) {
    console.error('❌ שגיאה בעדכון GitHub:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the update
updateGitHub().then(result => {
  if (result.success) {
    console.log('\n🎉 הכל מוכן! האתר יתעדכן אוטומטית.');
  } else {
    console.error('\n💥 משהו השתבש:', result.error);
  }
}).catch(error => {
  console.error('💥 עדכון נכשל:', error.message);
});