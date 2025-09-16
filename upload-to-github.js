import { getUncachableGitHubClient } from './server/github-client.js';
import fs from 'fs';
import path from 'path';

async function uploadFilesToGitHub() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'nadavt2012';
    const repo = 'comsign-pricing-calculator';
    
    // Get all files to upload (excluding node_modules, .git, etc.)
    const filesToUpload = [];
    
    function collectFiles(dir, basePath = '') {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativePath = basePath ? path.join(basePath, file) : file;
        
        // Skip certain directories and files
        if (file === 'node_modules' || file === '.git' || file === '.env' || 
            file === '.replit' || file === 'replit.nix' || 
            file.startsWith('.') || file.endsWith('.log')) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          collectFiles(fullPath, relativePath);
        } else {
          filesToUpload.push({
            path: relativePath,
            content: fs.readFileSync(fullPath, 'utf8')
          });
        }
      }
    }
    
    collectFiles('.');
    
    console.log(`Found ${filesToUpload.length} files to upload`);
    
    // Create a commit with all files
    const files = {};
    filesToUpload.forEach(file => {
      files[file.path] = {
        content: file.content
      };
    });
    
    // Get the current HEAD commit
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
    const blobs = {};
    for (const file of filesToUpload) {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      });
      blobs[file.path] = blob.sha;
    }
    
    // Create tree
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
    
    // Create commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: 'Initial upload from Replit - Hebrew Pricing Calculator',
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
    
    console.log('✅ All files uploaded successfully to GitHub!');
    console.log(`🔗 Repository: https://github.com/${owner}/${repo}`);
    console.log(`📦 Commit: ${newCommit.sha}`);
    
    return {
      repoUrl: `https://github.com/${owner}/${repo}`,
      commitSha: newCommit.sha,
      filesUploaded: filesToUpload.length
    };
    
  } catch (error) {
    console.error('Error uploading to GitHub:', error);
    throw error;
  }
}

// Run the upload
uploadFilesToGitHub().then(result => {
  console.log('🎉 Upload completed:', result);
}).catch(error => {
  console.error('❌ Upload failed:', error.message);
});