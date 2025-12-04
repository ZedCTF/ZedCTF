import { useState, useRef, useEffect } from "react";
import { X, Camera, User, BookOpen, GraduationCap, Award, Users, CheckCircle, Key, Mail, Trash2, AlertTriangle } from "lucide-react";
import { updateProfile, updatePassword, sendPasswordResetEmail, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch, setDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { useAuthContext } from "../contexts/AuthContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UserRole = 'student' | 'lecturer' | 'expert' | 'general';

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'danger'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    bio: '',
    role: 'student' as UserRole,
    institution: ''
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [deleteData, setDeleteData] = useState({
    confirmText: '',
    confirmPassword: ''
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });
  const [deleteMessage, setDeleteMessage] = useState({ type: '', text: '' });
  const [usernameMessage, setUsernameMessage] = useState({ type: '', text: '' });

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData({
              displayName: userData.displayName || user.displayName || '',
              username: userData.username || '',
              bio: userData.bio || '',
              role: userData.role || 'student',
              institution: userData.institution || ''
            });
            setPreviewUrl(userData.photoURL || user.photoURL || '');
          } else {
            setFormData({
              displayName: user.displayName || '',
              username: '',
              bio: '',
              role: 'student',
              institution: ''
            });
            setPreviewUrl(user.photoURL || '');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [isOpen, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setDeleteData({
        confirmText: '',
        confirmPassword: ''
      });
      setSecurityMessage({ type: '', text: '' });
      setDeleteMessage({ type: '', text: '' });
      setUsernameMessage({ type: '', text: '' });
      setProfileImage(null);
      setPreviewUrl(user?.photoURL || '');
    }
  }, [isOpen, user]);

  // Handle profile form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'username' && usernameMessage.text) {
      setUsernameMessage({ type: '', text: '' });
    }
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

  // Check if username is available
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username || username === formData.username) return true;
    
    try {
      const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
      return !usernameDoc.exists();
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  // Validate username
  const validateUsername = (username: string): { valid: boolean; message: string } => {
    if (!username) return { valid: false, message: 'Username is required' };
    if (username.length < 3) return { valid: false, message: 'Username must be at least 3 characters' };
    if (username.length > 20) return { valid: false, message: 'Username must be less than 20 characters' };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    return { valid: true, message: '' };
  };

  // Compress image before upload
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

  // Upload image to Firebase Storage
  const uploadImage = async (file: File, userId: string): Promise<string> => {
    const compressedFile = await compressImage(file);
    
    const timestamp = Date.now();
    const fileName = `profile_${timestamp}.jpg`;
    const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, compressedFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  };

  // Handle profile form submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSaveSuccess(false);
    setUsernameMessage({ type: '', text: '' });

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const currentUserData = userDoc.exists() ? userDoc.data() : {};

      if (formData.username && formData.username !== currentUserData.username) {
        const validation = validateUsername(formData.username);
        if (!validation.valid) {
          setUsernameMessage({ type: 'error', text: validation.message });
          setLoading(false);
          return;
        }

        const isAvailable = await checkUsernameAvailability(formData.username);
        if (!isAvailable) {
          setUsernameMessage({ type: 'error', text: 'Username is already taken' });
          setLoading(false);
          return;
        }
      }

      let photoURL = user.photoURL;

      if (profileImage) {
        setUploading(true);
        try {
          photoURL = await uploadImage(profileImage, user.uid);
        } catch (error) {
          console.error("Error uploading image:", error);
          alert("Failed to upload image. Please try again.");
          setLoading(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      const updatePromises = [];
      const authUpdates: any = {};
      let needsAuthUpdate = false;
      
      if (formData.displayName !== user.displayName) {
        authUpdates.displayName = formData.displayName;
        needsAuthUpdate = true;
      }
      
      if (photoURL !== user.photoURL) {
        authUpdates.photoURL = photoURL;
        needsAuthUpdate = true;
      }
      
      if (needsAuthUpdate) {
        updatePromises.push(
          updateProfile(user, authUpdates).catch(error => {
            console.error("Error updating auth profile:", error);
            return Promise.resolve();
          })
        );
      }

      if (formData.username && formData.username !== currentUserData.username) {
        const usernameLower = formData.username.toLowerCase();
        const currentUsername = currentUserData.username || '';
        
        if (currentUsername && usernameLower !== currentUsername.toLowerCase()) {
          const oldUsernameDoc = await getDoc(doc(db, "usernames", currentUsername.toLowerCase()));
          if (oldUsernameDoc.exists()) {
            updatePromises.push(
              deleteDoc(doc(db, "usernames", currentUsername.toLowerCase()))
            );
          }
        }
        
        const usernameRef = doc(db, "usernames", usernameLower);
        updatePromises.push(
          setDoc(usernameRef, {
            userId: user.uid,
            createdAt: new Date()
          }, { merge: true })
        );
      }

      const firestoreUpdates: any = {
        uid: user.uid,
        displayName: formData.displayName,
        bio: formData.bio,
        institution: formData.institution,
        updatedAt: new Date()
      };
      
      if (formData.username) {
        firestoreUpdates.username = formData.username;
      }
      
      if (photoURL) {
        firestoreUpdates.photoURL = photoURL;
      }
      
      if (currentUserData.role) {
        firestoreUpdates.role = currentUserData.role;
      }
      
      if (currentUserData.email) {
        firestoreUpdates.email = currentUserData.email;
      } else if (user.email) {
        firestoreUpdates.email = user.email;
      }

      updatePromises.push(updateDoc(userDocRef, firestoreUpdates));

      await Promise.all(updatePromises);

      console.log("Profile updated successfully");
      setSaveSuccess(true);
      
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      if (error.code === 'permission-denied') {
        alert("Permission denied. Please check that your profile data follows the required format.");
      } else if (error.code === 'auth/requires-recent-login') {
        alert("For security, please sign out and sign back in before updating your profile.");
      } else {
        alert(`Failed to update profile: ${error.message || 'Unknown error'}`);
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
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error: any) {
      console.error("Error changing password:", error);
      
      if (error.code === 'auth/requires-recent-login') {
        setSecurityMessage({ 
          type: 'error', 
          text: 'For security, please re-authenticate by signing out and back in before changing your password.' 
        });
      } else {
        setSecurityMessage({ 
          type: 'error', 
          text: error.message || 'Failed to change password. Please try again.' 
        });
      }
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

  // COMPLETE ACCOUNT DELETION - SIMPLIFIED FOR YOUR CURRENT RULES
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

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
      if (!window.confirm('⚠️ NUCLEAR OPTION ACTIVATED!\n\nThis will delete EVERYTHING:\n• Your account\n• All your data\n• All your submissions\n• Everything you created\n\nThis is PERMANENT and CANNOT BE UNDONE!\n\nAre you ABSOLUTELY sure?')) {
        setLoading(false);
        return;
      }

      console.log("Starting account deletion for user:", user.uid);

      let totalDeleted = 0;

      // 1. DELETE USER DOCUMENT (this already works!)
      try {
        const userRef = doc(db, "users", user.uid);
        await deleteDoc(userRef);
        totalDeleted++;
        console.log("✅ User document deleted");
      } catch (error) {
        console.error("Error deleting user document:", error);
        // Continue anyway - maybe it was already deleted
      }

      // 2. DELETE USERNAME REFERENCE
      try {
        // First get the username from user document before it's deleted
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const username = userDoc.data().username || '';
          if (username) {
            const usernameRef = doc(db, "usernames", username.toLowerCase());
            await deleteDoc(usernameRef);
            totalDeleted++;
            console.log("✅ Username reference deleted");
          }
        }
      } catch (error) {
        console.warn("Could not delete username:", error);
      }

      // 3. DELETE FROM COLLECTIONS WHERE USERS HAVE DELETE PERMISSION
      const collectionsWithDeletePermission = [
        'submissions',
        'scores', 
        'comments',
        'messages',
        'writeups',
        'teams',
        'notifications',
        'payments',
        'hostRequests',
        'reports',
        'leaderboard'
      ];

      for (const collectionName of collectionsWithDeletePermission) {
        try {
          const q = query(
            collection(db, collectionName),
            where('userId', '==', user.uid)
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.docs.length > 0) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            totalDeleted += snapshot.docs.length;
            console.log(`✅ Deleted ${snapshot.docs.length} documents from ${collectionName}`);
          }
        } catch (error) {
          console.warn(`Could not delete from ${collectionName}:`, error);
          // Continue with other collections
        }
      }

      // 4. SPECIAL HANDLING FOR MESSAGES (senderId OR receiverId)
      try {
        // Delete messages where user is sender
        const sentQuery = query(
          collection(db, 'messages'),
          where('senderId', '==', user.uid)
        );
        const sentSnapshot = await getDocs(sentQuery);
        
        // Delete messages where user is receiver  
        const receivedQuery = query(
          collection(db, 'messages'),
          where('receiverId', '==', user.uid)
        );
        const receivedSnapshot = await getDocs(receivedQuery);
        
        const allMessages = [...sentSnapshot.docs, ...receivedSnapshot.docs];
        
        if (allMessages.length > 0) {
          const batch = writeBatch(db);
          allMessages.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          totalDeleted += allMessages.length;
          console.log(`✅ Deleted ${allMessages.length} messages`);
        }
      } catch (error) {
        console.warn("Could not delete messages:", error);
      }

      // 5. SPECIAL HANDLING FOR TEAMS (remove from members or delete if owner)
      try {
        const teamsQuery = query(
          collection(db, 'teams'),
          where('members', 'array-contains', user.uid)
        );
        const teamsSnapshot = await getDocs(teamsQuery);
        
        if (teamsSnapshot.docs.length > 0) {
          const batch = writeBatch(db);
          
          teamsSnapshot.docs.forEach(teamDoc => {
            const teamData = teamDoc.data();
            if (teamData.ownerId === user.uid) {
              // Delete entire team if user is owner
              batch.delete(teamDoc.ref);
              console.log(`✅ Deleting team owned by user: ${teamDoc.id}`);
            } else {
              // Remove user from members array
              const updatedMembers = teamData.members.filter((memberId: string) => memberId !== user.uid);
              batch.update(teamDoc.ref, { members: updatedMembers });
              console.log(`✅ Removing user from team: ${teamDoc.id}`);
            }
          });
          
          await batch.commit();
          console.log(`✅ Processed ${teamsSnapshot.docs.length} teams`);
        }
      } catch (error) {
        console.warn("Could not process teams:", error);
      }

      // 6. REMOVE FROM EVENTS (participants and pendingApprovals)
      try {
        const eventsQuery = query(
          collection(db, 'events'),
          where('participants', 'array-contains', user.uid)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        
        if (eventsSnapshot.docs.length > 0) {
          const batch = writeBatch(db);
          
          eventsSnapshot.docs.forEach(eventDoc => {
            const eventData = eventDoc.data();
            const updatedParticipants = eventData.participants?.filter((participantId: string) => participantId !== user.uid) || [];
            const updatedPendingApprovals = eventData.pendingApprovals?.filter((userId: string) => userId !== user.uid) || [];
            
            batch.update(eventDoc.ref, {
              participants: updatedParticipants,
              pendingApprovals: updatedPendingApprovals
            });
          });
          
          await batch.commit();
          console.log(`✅ Removed user from ${eventsSnapshot.docs.length} events`);
        }
      } catch (error) {
        console.warn("Could not remove from events:", error);
      }

      // 7. REMOVE FROM CHALLENGES (solvedBy array)
      try {
        const challengesQuery = query(
          collection(db, 'challenges'),
          where('solvedBy', 'array-contains', user.uid)
        );
        const challengesSnapshot = await getDocs(challengesQuery);
        
        if (challengesSnapshot.docs.length > 0) {
          const batch = writeBatch(db);
          
          challengesSnapshot.docs.forEach(challengeDoc => {
            const challengeData = challengeDoc.data();
            const updatedSolvedBy = challengeData.solvedBy?.filter((userId: string) => userId !== user.uid) || [];
            
            batch.update(challengeDoc.ref, {
              solvedBy: updatedSolvedBy
            });
          });
          
          await batch.commit();
          console.log(`✅ Removed user from ${challengesSnapshot.docs.length} challenges`);
        }
      } catch (error) {
        console.warn("Could not remove from challenges:", error);
      }

      console.log(`Total documents processed: ${totalDeleted}`);

      // 8. FINALLY, DELETE THE USER FROM FIREBASE AUTH
      console.log("Deleting user from Firebase Auth...");
      await deleteUser(user);

      setDeleteMessage({ 
        type: 'success', 
        text: `✅ Account DELETED!\n\nUser account and data have been removed.\n\nYou will be redirected to the home page.` 
      });

      // Redirect to home page after delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error: any) {
      console.error("Error deleting account:", error);
      
      if (error.code === 'auth/requires-recent-login') {
        setDeleteMessage({ 
          type: 'error', 
          text: 'Security check failed. Please sign out and sign back in, then try again.' 
        });
      } else if (error.code === 'auth/wrong-password') {
        setDeleteMessage({ 
          type: 'error', 
          text: 'Incorrect password. Please enter your current password to confirm deletion.' 
        });
      } else {
        setDeleteMessage({ 
          type: 'error', 
          text: `Account deletion partially completed. Some data may still exist. Error: ${error.message || 'Unknown'}` 
        });
      }
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
            onClick={onClose}
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
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Enter unique username (3-20 characters)"
                disabled={loading}
              />
              {usernameMessage.text && (
                <p className={`mt-2 text-sm ${
                  usernameMessage.type === 'error' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {usernameMessage.text}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Username can contain letters, numbers, and underscores. Must be unique.
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

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-foreground mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'student', label: 'Student', icon: GraduationCap },
                  { value: 'lecturer', label: 'Lecturer', icon: Users },
                  { value: 'expert', label: 'Expert', icon: Award },
                  { value: 'general', label: 'General User', icon: User }
                ].map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                      formData.role === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 text-foreground'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={formData.role === value}
                      onChange={handleChange}
                      className="hidden"
                      disabled={loading}
                    />
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
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

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
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
                onClick={onClose}
                disabled={loading}
                className="w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Danger Zone Tab - NUCLEAR DELETE OPTION */}
        {activeTab === 'danger' && (
          <div className="p-6 space-y-6">
            {/* Nuclear Warning */}
            <div className="bg-red-900 border-2 border-red-600 text-white px-4 py-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0 text-red-300" />
                <div>
                  <h4 className="font-bold text-lg mb-2">☢️ NUCLEAR DELETE OPTION</h4>
                  <p className="text-sm mb-3">
                    This will <span className="font-bold text-yellow-300">COMPLETELY WIPE</span> all traces of your account from the system.
                  </p>
                  <div className="bg-red-950 p-3 rounded border border-red-700">
                    <p className="text-sm font-semibold mb-2">🚨 WHAT WILL BE DELETED:</p>
                    <ul className="text-xs space-y-1 ml-4 list-disc text-red-200">
                      <li>Your user account (Firebase Auth)</li>
                      <li>Your user profile document</li>
                      <li>Your username reservation</li>
                      <li>All your challenge submissions</li>
                      <li>All your scores and achievements</li>
                      <li>Comments and writeups you created</li>
                      <li>Messages you sent or received</li>
                      <li>Teams you own (or remove you from teams)</li>
                      <li>Event registrations</li>
                      <li>Challenge progress (removed from solvedBy)</li>
                    </ul>
                  </div>
                  <p className="text-sm font-bold mt-3 text-center text-yellow-300">
                    ⚠️ THIS IS PERMANENT AND CANNOT BE UNDONE! ⚠️
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Message */}
            {deleteMessage.text && (
              <div className={`px-4 py-3 rounded-lg ${
                deleteMessage.type === 'success' 
                  ? 'bg-green-900 border border-green-600 text-green-100'
                  : 'bg-red-900 border border-red-600 text-red-100'
              }`}>
                <pre className="whitespace-pre-wrap text-sm">{deleteMessage.text}</pre>
              </div>
            )}

            {/* Nuclear Delete Form */}
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label htmlFor="confirmText" className="block text-sm font-medium text-red-300 mb-2">
                    Type <span className="font-mono bg-red-950 px-2 py-1 rounded">DELETE MY ACCOUNT</span> to confirm
                  </label>
                  <input
                    id="confirmText"
                    name="confirmText"
                    type="text"
                    value={deleteData.confirmText}
                    onChange={handleDeleteChange}
                    className="w-full px-3 py-2 bg-gray-900 border-2 border-red-700 rounded-lg text-white placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    placeholder="DELETE MY ACCOUNT"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-red-300 mb-2">
                    Enter your current password for security verification (optional)
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={deleteData.confirmPassword}
                    onChange={handleDeleteChange}
                    className="w-full px-3 py-2 bg-gray-900 border-2 border-red-700 rounded-lg text-white placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    placeholder="Your current password (optional)"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || deleteData.confirmText !== 'DELETE MY ACCOUNT'}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-700 to-red-900 text-white rounded-lg hover:from-red-800 hover:to-red-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-red-600 shadow-lg shadow-red-900/30"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span className="font-semibold">DELETING ACCOUNT...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span className="font-bold">ACTIVATE ACCOUNT DELETION</span>
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
                className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                ← Back to Safety
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;