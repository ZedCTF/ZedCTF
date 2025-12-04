import { useState, useRef, useEffect } from "react";
import { X, Camera, User, CheckCircle, Key, Mail, Trash2, AlertTriangle, Globe, Lock } from "lucide-react";
import { updateProfile, updatePassword, sendPasswordResetEmail, deleteUser } from "firebase/auth";
import { doc, updateDoc, getDoc, deleteDoc, setDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthContext } from "../contexts/AuthContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  userProfile?: any;
  userId?: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userProfile, userId }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'danger'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    institution: '',
    country: '',
    photoURL: '',
    username: '',
    profileVisibility: 'public' // 'public' or 'private'
  });

  const [securityData, setSecurityData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [deleteData, setDeleteData] = useState({
    confirmText: ''
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });
  const [deleteMessage, setDeleteMessage] = useState({ type: '', text: '' });
  const [errorMessage, setErrorMessage] = useState('');

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      if (userProfile) {
        setFormData({
          displayName: userProfile.displayName || user.displayName || '',
          bio: userProfile.bio || '',
          institution: userProfile.institution || '',
          country: userProfile.country || '',
          photoURL: userProfile.photoURL || '',
          username: userProfile.username || '',
          profileVisibility: userProfile.profileVisibility || 'public'
        });
        setPreviewUrl(userProfile.photoURL || user.photoURL || '');
      } else {
        setFormData({
          displayName: user.displayName || '',
          bio: '',
          institution: '',
          country: '',
          photoURL: '',
          username: '',
          profileVisibility: 'public'
        });
        setPreviewUrl(user.photoURL || '');
      }
    }
  }, [isOpen, user, userProfile]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
      setSecurityData({
        newPassword: '',
        confirmPassword: ''
      });
      setDeleteData({
        confirmText: ''
      });
      setSecurityMessage({ type: '', text: '' });
      setDeleteMessage({ type: '', text: '' });
      setErrorMessage('');
      setProfileImage(null);
      setSaveSuccess(false);
    }
  }, [isOpen, user]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error message when user starts typing
    if (errorMessage) setErrorMessage('');
  };

  // Handle security form input changes
  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurityData(prev => ({
      ...prev,
      [name]: value
    }));
    if (securityMessage.text) {
      setSecurityMessage({ type: '', text: '' });
    }
  };

  // Handle delete form input changes
  const handleDeleteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeleteData(prev => ({
      ...prev,
      [name]: value
    }));
    if (deleteMessage.text) {
      setDeleteMessage({ type: '', text: '' });
    }
  };

  // Handle profile image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setProfileImage(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  // Clean username: remove spaces and special characters
  const cleanUsername = (username: string): string => {
    return username
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
      .toLowerCase();
  };

  // Validate username
  const validateUsername = (username: string): { valid: boolean; message: string } => {
    if (!username.trim()) return { valid: false, message: 'Username is required' };
    
    const cleaned = cleanUsername(username);
    
    if (cleaned.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
    if (cleaned.length > 20) return { valid: false, message: 'Username must be less than 20 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    
    return { valid: true, message: '' };
  };

  // Check if username is available
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username) return false;
    
    const cleaned = cleanUsername(username);
    
    // If username is same as current, it's available
    if (userProfile?.username && cleaned === cleanUsername(userProfile.username)) {
      return true;
    }
    
    try {
      const usernameDoc = await getDoc(doc(db, "usernames", cleaned));
      return !usernameDoc.exists();
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  // Compress image
  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Upload image
  const uploadImage = async (file: File, userId: string): Promise<string> => {
    const compressedFile = await compressImage(file);
    
    const timestamp = Date.now();
    const fileName = `profile_${timestamp}.jpg`;
    const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, compressedFile);
    return await getDownloadURL(snapshot.ref);
  };

  // Handle profile form submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSaveSuccess(false);
    setErrorMessage('');

    try {
      // Validate username
      const usernameValidation = validateUsername(formData.username);
      if (!usernameValidation.valid) {
        setErrorMessage(usernameValidation.message);
        setLoading(false);
        return;
      }

      // Clean the username
      const cleanedUsername = cleanUsername(formData.username);
      
      // Check if username is available
      const isAvailable = await checkUsernameAvailability(cleanedUsername);
      if (!isAvailable) {
        setErrorMessage('Username is already taken. Please choose another one.');
        setLoading(false);
        return;
      }

      // Upload image if selected
      let photoURL = user.photoURL;
      if (profileImage) {
        setUploading(true);
        try {
          photoURL = await uploadImage(profileImage, user.uid);
        } catch (error) {
          console.error("Error uploading image:", error);
          setErrorMessage("Failed to upload image. Please try again.");
          setLoading(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      // Update Firebase Auth profile
      const authUpdates: any = {};
      if (formData.displayName !== user.displayName) {
        authUpdates.displayName = formData.displayName;
      }
      if (photoURL !== user.photoURL) {
        authUpdates.photoURL = photoURL;
      }

      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(user, authUpdates);
      }

      // Get current user data
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const currentData = userDoc.exists() ? userDoc.data() : {};

      // Prepare updates according to Firestore rules
      const updates: any = {
        displayName: formData.displayName || null,
        bio: formData.bio || null,
        institution: formData.institution || null,
        country: formData.country || null,
        profileVisibility: formData.profileVisibility,
        lastActive: new Date()
      };

      // Add photoURL if changed
      if (photoURL) {
        updates.photoURL = photoURL;
      }

      // Handle username update
      if (cleanedUsername && cleanedUsername !== cleanUsername(currentData.username || '')) {
        // Remove old username if it exists and is different
        if (currentData.username && cleanedUsername !== cleanUsername(currentData.username)) {
          try {
            await deleteDoc(doc(db, "usernames", cleanUsername(currentData.username)));
          } catch (error) {
            console.warn("Could not remove old username:", error);
          }
        }
        
        // Add new username to usernames collection
        await setDoc(doc(db, "usernames", cleanedUsername), {
          userId: user.uid,
          createdAt: new Date()
        });
        
        updates.username = cleanedUsername;
      }

      // Update user document
      await updateDoc(userDocRef, updates);

      setSaveSuccess(true);
      
      setTimeout(() => {
        onClose(true);
      }, 1500);

    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.code === 'permission-denied') {
        setErrorMessage('Permission denied. You may not have permission to update this profile.');
      } else {
        setErrorMessage(`Failed to update profile: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setLoading(true);
    setSecurityMessage({ type: '', text: '' });

    try {
      if (securityData.newPassword !== securityData.confirmPassword) {
        setSecurityMessage({ type: 'error', text: 'New passwords do not match' });
        setLoading(false);
        return;
      }

      if (securityData.newPassword.length < 6) {
        setSecurityMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
        setLoading(false);
        return;
      }

      await updatePassword(user, securityData.newPassword);
      
      setSecurityMessage({ 
        type: 'success', 
        text: 'Password updated successfully!' 
      });
      
      setSecurityData({
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error: any) {
      console.error("Error changing password:", error);
      setSecurityMessage({ 
        type: 'error', 
        text: error.message || 'Failed to change password. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset email
  const handlePasswordReset = async () => {
    if (!user?.email) return;

    setLoading(true);
    setSecurityMessage({ type: '', text: '' });

    try {
      await sendPasswordResetEmail(auth, user.email);
      setSecurityMessage({ 
        type: 'success', 
        text: `Password reset email sent to ${user.email}. Please check your inbox.` 
      });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      setSecurityMessage({ 
        type: 'error', 
        text: error.message || 'Failed to send reset email. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setDeleteMessage({ type: '', text: '' });

    try {
      // Confirm deletion text
      if (deleteData.confirmText !== 'DELETE MY ACCOUNT') {
        setDeleteMessage({ 
          type: 'error', 
          text: 'Please type "DELETE MY ACCOUNT" to confirm deletion.' 
        });
        setLoading(false);
        return;
      }

      // Final warning
      if (!window.confirm('⚠️ WARNING!\n\nThis will delete your account permanently.\n\nAre you ABSOLUTELY sure?')) {
        setLoading(false);
        return;
      }

      // Delete user document
      await deleteDoc(doc(db, "users", user.uid));
      
      // Delete username if exists
      if (userProfile?.username) {
        try {
          await deleteDoc(doc(db, "usernames", cleanUsername(userProfile.username)));
        } catch (error) {
          console.warn("Could not delete username:", error);
        }
      }

      // Delete user from Firebase Auth
      await deleteUser(user);

      setDeleteMessage({ 
        type: 'success', 
        text: 'Account deleted successfully. Redirecting...' 
      });

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error: any) {
      console.error("Error deleting account:", error);
      setDeleteMessage({ 
        type: 'error', 
        text: error.message || 'Failed to delete account. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Account Settings</h2>
          <button
            onClick={() => onClose(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex p-2">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'profile'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'security'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Key className="w-4 h-4 inline mr-2" />
              Security
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('danger')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'danger'
                  ? 'bg-red-500 text-white'
                  : 'text-red-500 hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Danger Zone
            </button>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
            {saveSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Profile updated successfully!
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {errorMessage}
              </div>
            )}

            {/* Profile Picture */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted/50 border-2 border-border flex items-center justify-center overflow-hidden">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={uploading || loading}
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={uploading || loading}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {uploading ? 'Uploading image...' : 'Click the camera icon to upload a profile picture (max 5MB)'}
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Enter your display name"
                disabled={loading}
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="samson_hatyoka (no spaces, 3-20 characters)"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This will be cleaned to: {cleanUsername(formData.username) || 'example_username'}
              </p>
            </div>

            {/* Profile Visibility */}
            <div>
              <label htmlFor="profileVisibility" className="block text-sm font-medium text-foreground mb-2">
                Profile Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.profileVisibility === 'public'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-foreground'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="public"
                    checked={formData.profileVisibility === 'public'}
                    onChange={handleChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">Public</span>
                </label>
                <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.profileVisibility === 'private'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-foreground'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="private"
                    checked={formData.profileVisibility === 'private'}
                    onChange={handleChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Private</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formData.profileVisibility === 'public' 
                  ? 'Your profile will be visible to everyone'
                  : 'Only you can see your profile details'}
              </p>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="Tell us about yourself..."
                disabled={loading}
              />
            </div>

            {/* Institution */}
            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-foreground mb-2">
                Institution
              </label>
              <input
                id="institution"
                name="institution"
                type="text"
                value={formData.institution}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Your school, university, or organization"
                disabled={loading}
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Your country"
                disabled={loading}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => onClose(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading || !formData.username.trim()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6">
            {securityMessage.text && (
              <div className={`px-4 py-3 rounded flex items-center gap-2 ${
                securityMessage.type === 'success' 
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {securityMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
                {securityMessage.text}
              </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Change Password</h3>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={securityData.newPassword}
                  onChange={handleSecurityChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter new password"
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={securityData.confirmPassword}
                  onChange={handleSecurityChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Confirm new password"
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !securityData.newPassword || !securityData.confirmPassword}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </form>

            {/* Password Reset Section */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">Reset Password</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Can't remember your current password? We'll send a reset link to your email.
              </p>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                className="w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Reset Email
              </button>
            </div>

            {/* Close Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => onClose(false)}
                disabled={loading}
                className="w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="p-6 space-y-6">
            {/* Warning */}
            <div className="bg-red-100 border-2 border-red-300 text-red-800 px-4 py-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-lg mb-2">⚠️ Account Deletion</h4>
                  <p className="text-sm mb-3">
                    This will permanently delete your account and all associated data.
                  </p>
                  <p className="text-sm font-bold mt-3">
                    This action cannot be undone!
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Message */}
            {deleteMessage.text && (
              <div className={`px-4 py-3 rounded-lg ${
                deleteMessage.type === 'success' 
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {deleteMessage.text}
              </div>
            )}

            {/* Delete Form */}
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label htmlFor="confirmText" className="block text-sm font-medium text-red-700 mb-2">
                  Type <span className="font-mono bg-red-100 px-2 py-1 rounded">DELETE MY ACCOUNT</span> to confirm
                </label>
                <input
                  id="confirmText"
                  name="confirmText"
                  type="text"
                  value={deleteData.confirmText}
                  onChange={handleDeleteChange}
                  className="w-full px-3 py-2 bg-background border-2 border-red-300 rounded-lg text-foreground placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  placeholder="DELETE MY ACCOUNT"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || deleteData.confirmText !== 'DELETE MY ACCOUNT'}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span className="font-semibold">Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span className="font-bold">Delete Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Back Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ← Back to Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;