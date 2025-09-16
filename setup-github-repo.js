import { getUncachableGitHubClient } from './server/github-client.js';

async function createGitHubRepo() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get current user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`Connected as: ${user.login}`);
    
    // Create new repository
    const repoName = 'comsign-pricing-calculator';
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: 'Hebrew Pricing Calculator for Comsign - מחשבון מחירים עברי לקומסיין',
      private: false, // Make it public so it works with free Vercel
      auto_init: true,
      gitignore_template: 'Node'
    });
    
    console.log(`Repository created: ${repo.html_url}`);
    console.log(`Git URL: ${repo.clone_url}`);
    
    return {
      repoUrl: repo.html_url,
      gitUrl: repo.clone_url,
      ownerLogin: user.login,
      repoName: repoName
    };
    
  } catch (error) {
    console.error('Error creating GitHub repository:', error);
    if (error.status === 422) {
      console.log('Repository might already exist. Let me check...');
      
      const octokit = await getUncachableGitHubClient();
      const { data: user } = await octokit.rest.users.getAuthenticated();
      
      try {
        const { data: existingRepo } = await octokit.rest.repos.get({
          owner: user.login,
          repo: 'comsign-pricing-calculator'
        });
        
        console.log(`Found existing repository: ${existingRepo.html_url}`);
        return {
          repoUrl: existingRepo.html_url,
          gitUrl: existingRepo.clone_url,
          ownerLogin: user.login,
          repoName: 'comsign-pricing-calculator',
          existing: true
        };
      } catch (getError) {
        console.error('Repository does not exist, but creation failed:', getError);
        throw error;
      }
    }
    throw error;
  }
}

// Run the function
createGitHubRepo().then(result => {
  console.log('✅ GitHub setup completed:', result);
}).catch(error => {
  console.error('❌ GitHub setup failed:', error.message);
});