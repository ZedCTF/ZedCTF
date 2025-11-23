// services/githubAuth.ts
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23liXrxQQwttXD26Ht';
const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || 'https://zedctf.github.io/ZedCTF/auth/github/callback';

// Real GitHub OAuth flow
export const initiateGitHubOAuth = () => {
  const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=user:email`;
  window.location.href = githubOAuthURL;
};

// Mock function for demo - FIXED to return user data
export const mockGitHubLogin = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockUser = {
        id: 'github-' + Date.now(),
        username: 'zedctf_user',
        email: 'user@zedctf.com',
        name: 'ZedCTF User',
        avatar: 'https://github.com/github.png',
        provider: 'github'
      };
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('isLoggedIn', 'true');
      resolve(mockUser); // Return the user data
    }, 1500);
  });
};

// Mock callback handler for demo
export const handleGitHubCallback = async (code: string) => {
  // In a real implementation, you would send the code to your backend
  // to exchange it for an access token
  
  console.log('GitHub OAuth code received:', code);
  
  // Simulate API call to backend
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock user data
  return {
    id: 'github-' + Date.now(),
    username: 'zedctf_user_' + Math.random().toString(36).substr(2, 9),
    email: 'user' + Math.random().toString(36).substr(2, 9) + '@zedctf.com',
    name: 'GitHub User',
    avatar: 'https://github.com/github.png',
    provider: 'github'
  };
};