import { useState } from "react";
import { 
  ArrowLeft,
  Key, 
  Mail, 
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { updatePassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase"; // Import auth directly
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const PasswordSettings = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setMessage({ type: 'error', text: 'New passwords do not match' });
        setLoading(false);
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
        setLoading(false);
        return;
      }

      await updatePassword(user, passwordData.newPassword);
      
      setMessage({ 
        type: 'success', 
        text: 'Password updated successfully!' 
      });
      
      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error: any) {
      console.error("Error changing password:", error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset email - FIXED THIS LINE
  const handlePasswordReset = async () => {
    if (!user?.email) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // FIX: Use auth directly, not user.auth
      await sendPasswordResetEmail(auth, user.email);
      setMessage({ 
        type: 'success', 
        text: `Password reset email sent to ${user.email}` 
      });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to send reset email' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <Navbar />
      <section className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Password Settings</h1>
                <p className="text-muted-foreground">Manage your password and security</p>
              </div>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`mb-6 px-4 py-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-8">
            {/* Change Password */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Change Password</h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-6">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                      placeholder="Enter new password"
                      disabled={loading}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Password must be at least 6 characters long
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                      placeholder="Confirm new password"
                      disabled={loading}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Change Password
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Password Reset */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Reset Password</h2>
              
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Forgot your password? We'll send a reset link to your email address.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">Reset email will be sent to:</p>
                      <p className="text-blue-600">{user?.email}</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handlePasswordReset}
                  disabled={loading}
                  className="w-full px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Key className="w-5 h-5" />
                  Send Password Reset Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default PasswordSettings;