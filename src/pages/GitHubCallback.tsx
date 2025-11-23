import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader, CheckCircle, XCircle } from 'lucide-react';
import { mockGitHubLogin } from '../services/githubAuth';

const GitHubCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // For now, we'll simulate the OAuth flow since we don't have a backend
      // In a real implementation, we would handle the code parameter from GitHub
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('GitHub authentication failed. Please try again.');
        return;
      }

      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (code) {
          // If we had a backend, we would exchange the code for a token here
          // const userData = await handleGitHubCallback(code);
          
          // For now, use mock login
          const userData: any = await mockGitHubLogin();
          setStatus('success');
          setMessage(`Welcome, ${userData.username}! Successfully authenticated with GitHub.`);
          
          setTimeout(() => navigate('/ZedCTF/'), 2000);
        } else {
          // No code parameter - use mock login for demo
          const userData: any = await mockGitHubLogin();
          setStatus('success');
          setMessage(`Welcome, ${userData.username}! Successfully signed in with GitHub.`);
          
          setTimeout(() => navigate('/ZedCTF/'), 2000);
        }
      } catch (err) {
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
        console.error('GitHub callback error:', err);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Shield className="w-10 h-10 text-green-400" />
          <span className="text-3xl font-bold text-white">ZedCTF</span>
        </div>

        <div className="space-y-4">
          {status === 'loading' && (
            <>
              <Loader className="w-12 h-12 text-green-400 animate-spin mx-auto" />
              <h2 className="text-xl font-semibold text-white">Connecting to GitHub...</h2>
              <p className="text-gray-300">Please wait while we authenticate your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Authentication Successful!</h2>
              <p className="text-gray-300">{message}</p>
              <p className="text-gray-400 text-sm">Redirecting to homepage...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">Authentication Failed</h2>
              <p className="text-gray-300">{message}</p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Try Sign Up
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitHubCallback;