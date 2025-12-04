import { useState } from "react";
import { 
  ArrowLeft,
  AlertTriangle,
  Shield
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const AccountSettings = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [deletionRequest, setDeletionRequest] = useState({
    reason: '',
    confirmText: ''
  });
  
  const [message, setMessage] = useState({ type: '', text: '' });

  // Handle deletion request
  const handleDeletionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (deletionRequest.confirmText !== 'DELETE MY ACCOUNT') {
        setMessage({ 
          type: 'error', 
          text: 'Please type "DELETE MY ACCOUNT" to confirm' 
        });
        setLoading(false);
        return;
      }

      // Create deletion request in database
      await setDoc(doc(db, "deletionRequests", user.uid), {
        userId: user.uid,
        email: user.email,
        reason: deletionRequest.reason || 'No reason provided',
        requestedAt: new Date(),
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        notes: ''
      });

      setMessage({ 
        type: 'success', 
        text: 'Account deletion request submitted. Admin will review it shortly.' 
      });

      setDeletionRequest({
        reason: '',
        confirmText: ''
      });

    } catch (error: any) {
      console.error("Error submitting deletion request:", error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to submit request' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeletionRequest(prev => ({ ...prev, [name]: value }));
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
                <h1 className="text-3xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground">Manage your account</p>
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
            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-8 h-8 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-semibold text-red-800 mb-2">Account Deletion</h2>
                  <p className="text-red-700 mb-3">
                    Requesting account deletion is a serious action. Please read carefully:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-red-700">
                    <li>Your request will be reviewed by an administrator</li>
                    <li>Once approved, all your data will be permanently deleted</li>
                    <li>This action cannot be undone</li>
                    <li>You will lose access to all your solved challenges, points, and achievements</li>
                    <li>Your username will become available for others to use</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Deletion Request Form */}
            <div className="bg-card border border-border rounded-lg p-6">
              <form onSubmit={handleDeletionRequest} className="space-y-6">
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reason for Deletion (Optional)
                  </label>
                  <textarea
                    name="reason"
                    value={deletionRequest.reason}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    placeholder="Tell us why you want to delete your account..."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Providing a reason helps us improve our service
                  </p>
                </div>

                {/* Confirmation */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type <span className="font-mono bg-red-100 px-2 py-1 rounded">DELETE MY ACCOUNT</span> to confirm
                  </label>
                  <input
                    type="text"
                    name="confirmText"
                    value={deletionRequest.confirmText}
                    onChange={handleChange}
                    className="w-full px-3 py-3 bg-background border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="DELETE MY ACCOUNT"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This confirms you understand the consequences of account deletion
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || deletionRequest.confirmText !== 'DELETE MY ACCOUNT'}
                  className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  {loading ? 'Submitting Request...' : 'Submit Deletion Request'}
                </button>
              </form>
            </div>

            {/* Contact Admin */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Need Help?</h3>
              <p className="text-blue-700 mb-4">
                If you have questions or need assistance with your account, please contact an administrator:
              </p>
              <button
                onClick={() => navigate('/contact')}
                className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Contact Administrator
              </button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default AccountSettings;