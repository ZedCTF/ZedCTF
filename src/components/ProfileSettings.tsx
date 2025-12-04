import { useState, useEffect } from "react";
import { 
  ArrowLeft,
  Camera, 
  User, 
  Save,
  Upload,
  AlertCircle,
  Edit,
  Check,
  X,
  Mail
} from "lucide-react";
import { updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const ProfileSettings = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: ''
  });
  
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState({ type: '', text: '' });
  
  const [password, setPassword] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfileData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: user.email || '',
            bio: userData.bio || ''
          });
          setCurrentUsername(userData.username || '');
          setPreviewUrl(userData.photoURL || user.photoURL || '');
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    
    loadProfileData();
  }, [user]);

  const cleanUsername = (username: string): string => {
    return username
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  };

  const validateUsername = (username: string): { valid: boolean; message: string } => {
    const cleaned = cleanUsername(username);
    
    if (!cleaned) return { valid: false, message: 'Username is required' };
    if (cleaned.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
    if (cleaned.length > 20) return { valid: false, message: 'Username must be less than 20 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    
    return { valid: true, message: '' };
  };

  // UPDATED USERNAME CHANGE FUNCTION
  const handleUsernameChange = async () => {
    if (!user || !newUsername.trim()) return;

    setUsernameMessage({ type: '', text: '' });

    const cleanedUsername = cleanUsername(newUsername);
    const currentCleaned = cleanUsername(currentUsername);
    
    // Validate
    const validation = validateUsername(newUsername);
    if (!validation.valid) {
      setUsernameMessage({ type: 'error', text: validation.message });
      return;
    }

    // Check if same as current
    if (cleanedUsername === currentCleaned) {
      setUsernameMessage({ type: 'info', text: 'This is already your current username' });
      setIsChangingUsername(false);
      setNewUsername('');
      return;
    }

    setLoading(true);
    try {
      // Check if username already exists
      const newUsernameDoc = await getDoc(doc(db, "usernames", cleanedUsername));
      
      if (newUsernameDoc.exists()) {
        const usernameData = newUsernameDoc.data();
        
        // If belongs to someone else, deny
        if (usernameData.userId !== user.uid) {
          setUsernameMessage({ type: 'error', text: 'Username is already taken' });
          setLoading(false);
          return;
        }
        
        // If belongs to this user, it's okay (updating)
        console.log("Username already registered to this user");
      }
      
      // IMPORTANT: Use cleanedUsername for storage, not newUsername.trim()
      // Create the new username document with proper structure
      await setDoc(doc(db, "usernames", cleanedUsername), {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || `${profileData.firstName} ${profileData.lastName}`.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Update user document with cleaned username
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        username: cleanedUsername, // Store cleaned version
        lastActive: new Date()
      });
      
      // Delete old username if different and exists
      if (currentCleaned && cleanedUsername !== currentCleaned) {
        try {
          const oldUsernameDoc = await getDoc(doc(db, "usernames", currentCleaned));
          if (oldUsernameDoc.exists()) {
            const oldData = oldUsernameDoc.data();
            // Double-check it belongs to this user before deleting
            if (oldData.userId === user.uid) {
              await deleteDoc(doc(db, "usernames", currentCleaned));
              console.log(`Deleted old username: ${currentCleaned}`);
            }
          }
        } catch (error) {
          console.warn("Could not delete old username:", error);
          // Don't fail the whole operation if delete fails
        }
      }
      
      // Update local state
      setCurrentUsername(cleanedUsername);
      
      // Show success
      setUsernameMessage({ 
        type: 'success', 
        text: `Username changed to ${cleanedUsername} successfully!` 
      });
      
      setIsChangingUsername(false);
      setNewUsername('');

    } catch (error: any) {
      console.error("Error changing username:", error);
      
      let errorMessage = 'Failed to change username. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please make sure you are logged in and have permission to change your username.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUsernameMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async () => {
    if (!user || !profileData.email || !password) return;

    if (profileData.email === user.email) {
      setMessage({ type: 'info', text: 'This is already your current email' });
      setIsChangingEmail(false);
      setPassword('');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
      
      await updateEmail(user, profileData.email);
      
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        email: profileData.email,
        lastActive: new Date()
      });
      
      if (currentUsername) {
        const cleanedUsername = cleanUsername(currentUsername);
        const usernameDoc = await getDoc(doc(db, "usernames", cleanedUsername));
        if (usernameDoc.exists()) {
          const usernameData = usernameDoc.data();
          if (usernameData.userId === user.uid) {
            await updateDoc(doc(db, "usernames", cleanedUsername), {
              email: profileData.email,
              updatedAt: new Date()
            });
          }
        }
      }
      
      setMessage({
        type: 'success',
        text: 'Email updated successfully!'
      });
      
      setIsChangingEmail(false);
      setPassword('');
      
    } catch (error: any) {
      console.error("Error changing email:", error);
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Incorrect password' });
      } else if (error.code === 'auth/email-already-in-use') {
        setMessage({ type: 'error', text: 'Email already in use' });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Failed to change email' 
        });
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select an image file' });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
        return;
      }

      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `profile_${timestamp}.jpg`;
    const storageRef = ref(storage, `profile-pictures/${user?.uid}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let photoURL = user.photoURL;
      if (profileImage) {
        setUploading(true);
        try {
          photoURL = await uploadImage(profileImage);
        } catch (error) {
          console.error("Error uploading image:", error);
          setMessage({ type: 'error', text: 'Failed to upload image' });
          setLoading(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      const authUpdates: any = {};
      const displayName = `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim();
      if (displayName !== user.displayName) {
        authUpdates.displayName = displayName;
      }
      if (photoURL !== user.photoURL) {
        authUpdates.photoURL = photoURL;
      }

      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(user, authUpdates);
      }

      const userDocRef = doc(db, "users", user.uid);
      const updates: any = {
        firstName: profileData.firstName.trim() || null,
        lastName: profileData.lastName.trim() || null,
        displayName: displayName || null,
        bio: profileData.bio || null,
        lastActive: new Date()
      };

      if (photoURL) {
        updates.photoURL = photoURL;
      }

      await updateDoc(userDocRef, updates);

      if (currentUsername) {
        const cleanedUsername = cleanUsername(currentUsername);
        const usernameDoc = await getDoc(doc(db, "usernames", cleanedUsername));
        if (usernameDoc.exists()) {
          const usernameData = usernameDoc.data();
          if (usernameData.userId === user.uid) {
            await updateDoc(doc(db, "usernames", cleanedUsername), {
              displayName: displayName,
              updatedAt: new Date()
            });
          }
        }
      }

      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully!' 
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error("Error updating profile:", error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleUsernameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewUsername(e.target.value);
    if (usernameMessage.text) {
      setUsernameMessage({ type: '', text: '' });
    }
  };

  return (
    <>
      <Navbar />
      <section className="pt-20 lg:pt-24 pb-16 min-h-screen bg-background">
        <div className="container px-4 mx-auto max-w-4xl">
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            
            <div>
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground">Update your profile information</p>
            </div>
          </div>

          {message.text && (
            <div className={`mb-6 px-4 py-3 rounded-lg flex items-start gap-3 ${
              message.type === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              ) : null}
              <div>{message.text}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-muted/50 border-2 border-border flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Upload new photo</label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Recommended: Square image, at least 400x400px. Max 5MB.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={uploading || loading}
                    />
                  </label>
                  {profileImage && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {profileImage.name}
                    </p>
                  )}
                  {uploading && (
                    <p className="text-sm text-blue-600 mt-2">Uploading image...</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Samson"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Hatyoka"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Email Address</h3>
                    {!isChangingEmail && (
                      <button
                        type="button"
                        onClick={() => setIsChangingEmail(true)}
                        className="flex items-center gap-2 px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Change Email
                      </button>
                    )}
                  </div>

                  {!isChangingEmail ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg">{profileData.email}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">New Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={profileData.email}
                          onChange={handleChange}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="new@email.com"
                          disabled={loading}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Confirm Password (required for email change)
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Enter your password"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingEmail(false);
                            setPassword('');
                          }}
                          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleEmailChange}
                          disabled={!profileData.email || !password}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          Update Email
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="Tell us about yourself, your interests, or achievements..."
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Username</h2>
                {!isChangingUsername && (
                  <button
                    type="button"
                    onClick={() => setIsChangingUsername(true)}
                    className="flex items-center gap-2 px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Change Username
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {!isChangingUsername ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Username</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-mono font-medium bg-primary/10 px-3 py-1 rounded">
                        {currentUsername || 'No username set'}
                      </span>
                      {currentUsername && (
                        <span className="text-xs text-muted-foreground">
                          (Cleaned: {cleanUsername(currentUsername)})
                        </span>
                      )}
                    </div>
                    
                    {!currentUsername && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                        <p className="text-sm text-yellow-800">
                          <strong>No username set!</strong> Please set a username to participate fully.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        New Username
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newUsername}
                          onChange={handleUsernameInputChange}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Enter new username"
                          autoFocus
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingUsername(false);
                            setNewUsername('');
                            setUsernameMessage({ type: '', text: '' });
                          }}
                          className="px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                          disabled={loading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleUsernameChange}
                          disabled={!newUsername.trim() || loading}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {loading ? (
                            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      
                      {usernameMessage.text && (
                        <div className={`mt-2 px-3 py-2 rounded text-sm ${
                          usernameMessage.type === 'success' 
                            ? 'bg-green-100 text-green-700'
                            : usernameMessage.type === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {usernameMessage.text}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <p>• This will be saved as: <span className="font-mono">{cleanUsername(newUsername) || 'username'}</span></p>
                        <p>• Only letters, numbers, and underscores allowed</p>
                        <p>• 3-20 characters</p>
                        <p>• Spaces will be converted to underscores</p>
                        <p>• Special characters will be removed</p>
                        <p>• Current username: <span className="font-mono">{currentUsername || 'none'}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading || uploading || isChangingUsername || isChangingEmail}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
};

export default ProfileSettings;