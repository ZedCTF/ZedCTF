import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield, LogIn, Loader, Mail, AlertCircle } from "lucide-react";
import { 
  signInWithRedirect, 
  GithubAuthProvider, 
  getRedirectResult,
  fetchSignInMethodsForEmail,
  linkWithCredential
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showLinkAccountModal, setShowLinkAccountModal] = useState(false);
  const [linkAccountData, setLinkAccountData] = useState({
    email: "",
    password: "",
    githubCredential: null as any
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });

  const navigate = useNavigate();
  const { login, loginWithGithub, resetPassword } = useAuth();
  const githubProvider = new GithubAuthProvider();

  githubProvider.addScope('read:user');
  githubProvider.addScope('user:email');

  // Handle OAuth redirect result when user returns from GitHub auth
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setIsGitHubLoading(true);
          const user = result.user;
          console.log("OAuth redirect success:", user);
          
          // Check if this email already exists with password auth
          const signInMethods = await fetchSignInMethodsForEmail(auth, user.email!);
          console.log("Sign-in methods for email:", signInMethods);
          
          // Check if user document exists in Firestore to determine if it's a new user
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const isNewUser = !userDoc.exists();
          console.log("Is new user:", isNewUser);
          
          // If email exists with password auth but this GitHub account is new, prompt to link accounts
          if (signInMethods.includes("password") && isNewUser) {
            console.log("Account linking required");
            setLinkAccountData({
              email: user.email!,
              password: "",
              githubCredential: GithubAuthProvider.credentialFromResult(result)
            });
            setShowLinkAccountModal(true);
            setIsGitHubLoading(false);
            return;
          }
          
          // Use AuthContext loginWithGithub which creates Firestore document
          const authResult = await loginWithGithub();
          if (authResult.success) {
            navigate("/dashboard");
          } else {
            setError(authResult.error || "GitHub login failed");
          }
        }
      } catch (error: any) {
        console.error("OAuth redirect error:", error);
        
        // CORRECT HANDLING for account exists with different credential
        if (error.code === 'auth/account-exists-with-different-credential') {
          const email = error.customData?.email;
          const pendingCred = error.credential;
          
          if (email) {
            // Get available sign-in methods for this email
            const methods = await fetchSignInMethodsForEmail(auth, email);
            
            if (methods.includes('password')) {
              // Email/password account exists - prompt to link
              setLinkAccountData({
                email: email,
                password: "",
                githubCredential: pendingCred
              });
              setShowLinkAccountModal(true);
            } else {
              // Other OAuth provider exists
              setError(`An account already exists with ${email} using a different authentication method. Please sign in with your existing method first.`);
            }
          }
        } else {
          setError(getFirebaseErrorMessage(error.code));
        }
      } finally {
        setIsGitHubLoading(false);
      }
    };

    handleOAuthRedirect();
  }, [navigate, loginWithGithub]);

  // Handle account linking when user provides password
  const handleAccountLinking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkAccountData.password) {
      setError("Please enter your password to link accounts");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // First, sign in with email/password using AuthContext
      const loginResult = await login(linkAccountData.email, linkAccountData.password);
      
      if (!loginResult.success) {
        setError(loginResult.error || "Failed to sign in");
        return;
      }
      
      // Then link the GitHub credential
      if (linkAccountData.githubCredential) {
        await linkWithCredential(auth.currentUser!, linkAccountData.githubCredential);
        console.log("Accounts linked successfully");
      }
      
      // Redirect
      setShowLinkAccountModal(false);
      navigate("/dashboard");
      
    } catch (error: any) {
      console.error("Account linking error:", error);
      if (error.code === 'auth/wrong-password') {
        setError("Incorrect password. Please try again.");
      } else {
        setError("Failed to link accounts. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setIsGitHubLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      console.log("Initiating GitHub OAuth redirect...");
      await signInWithRedirect(auth, githubProvider);
    } catch (error: any) {
      console.error("GitHub login error:", error);
      setError(getFirebaseErrorMessage(error.code));
      setIsGitHubLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsResettingPassword(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await resetPassword(resetEmail.trim());
      if (result.success) {
        setSuccessMessage(`Password reset email sent to ${resetEmail}. Please check your inbox and spam folder.`);
        setResetEmail("");
        setTimeout(() => {
          setShowResetModal(false);
          setSuccessMessage("");
        }, 5000);
      } else {
        setError(result.error || "Failed to send reset email");
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error.code === 'auth/user-not-found') {
        setError("No account found with this email address.");
      } else if (error.code === 'auth/invalid-email') {
        setError("Invalid email address format.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/invalid-email":
        return "Invalid email address format.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/account-exists-with-different-credential":
        return "An account already exists with this email using a different sign-in method. Please sign in with your existing method.";
      case "auth/email-already-in-use":
        return "This email is already associated with an account.";
      case "auth/credential-already-in-use":
        return "This credential is already associated with a different user account.";
      case "auth/unauthorized-domain":
        return "This authentication method is not allowed from this domain.";
      case "auth/operation-not-allowed":
        return "GitHub login is not enabled. Please contact the administrator.";
      default:
        return "Login failed. Please try again.";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLinkAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLinkAccountData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openResetModal = () => {
    setShowResetModal(true);
    setResetEmail(formData.email);
    setError("");
    setSuccessMessage("");
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail("");
    setError("");
    setSuccessMessage("");
  };

  const closeLinkAccountModal = () => {
    setShowLinkAccountModal(false);
    setLinkAccountData({
      email: "",
      password: "",
      githubCredential: null
    });
    setError("");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-card border border-border rounded-lg shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Shield className="w-10 h-10 text-primary" />
                <span className="text-3xl font-bold text-foreground">ZedCTF</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Access your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">{error}</div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="bandajonathan5@gmail.com"
                    disabled={isLoading || isGitHubLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                    placeholder="••••••••"
                    disabled={isLoading || isGitHubLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading || isGitHubLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    disabled={isLoading || isGitHubLoading}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={openResetModal}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                  disabled={isLoading || isGitHubLoading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isGitHubLoading}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                )}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-border"></div>
              <span className="px-3 text-sm text-muted-foreground">or continue with</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={handleGitHubLogin}
                disabled={isGitHubLoading || isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground hover:bg-muted transition-colors hover:border-primary group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGitHubLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                )}
                {isGitHubLoading ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center mt-6">
              <p className="text-muted-foreground">
                New to ZedCTF?{" "}
                <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                  Create an account
                </Link>
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              🔒 Your security is our priority. All connections are encrypted.
            </p>
          </div>
        </div>
      </div>
      <Footer />

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Reset Your Password</h3>
                <button
                  onClick={closeResetModal}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isResettingPassword}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-muted-foreground mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter your email"
                    required
                    disabled={isResettingPassword}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    disabled={isResettingPassword}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isResettingPassword ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {isResettingPassword ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Account Linking Modal */}
      {showLinkAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Link Your Accounts</h3>
                <button
                  onClick={closeLinkAccountModal}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-muted-foreground mb-4">
                An account already exists with <strong>{linkAccountData.email}</strong> using email/password. 
                Enter your password to link your GitHub account.
              </p>

              <form onSubmit={handleAccountLinking} className="space-y-4">
                <div>
                  <label htmlFor="linkPassword" className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <input
                    id="linkPassword"
                    name="password"
                    type="password"
                    value={linkAccountData.password}
                    onChange={handleLinkAccountChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeLinkAccountModal}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    {isLoading ? 'Linking...' : 'Link Accounts'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;