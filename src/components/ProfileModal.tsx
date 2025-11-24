import { useState, useRef, useEffect } from "react";
import { X, Camera, User, BookOpen, GraduationCap, Award, Users, CheckCircle } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    role: 'student' as UserRole,
    institution: ''
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      // Fetch current user data from Firestore
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData({
              displayName: userData.displayName || user.displayName || '',
              bio: userData.bio || '',
              role: userData.role || 'student',
              institution: userData.institution || ''
            });
            setPreviewUrl(userData.photoURL || user.photoURL || '');
          } else {
            setFormData({
              displayName: user.displayName || '',
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

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile image selection with compression
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Check file size (max 2MB for faster uploads)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB for faster upload');
        return;
      }

      setProfileImage(file);
      
      // Create preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  // Compress image before upload
  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
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

  // Upload image to Firebase Storage with progress tracking
  const uploadImage = async (file: File, userId: string): Promise<string> => {
    // Compress image first
    const compressedFile = await compressImage(file);
    
    const timestamp = Date.now();
    const fileName = `profile_${timestamp}.jpg`;
    const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, compressedFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSaveSuccess(false);

    try {
      let photoURL = user.photoURL;

      // Upload new profile image if selected (in background)
      if (profileImage) {
        setUploading(true);
        try {
          photoURL = await uploadImage(profileImage, user.uid);
          console.log("Profile image uploaded successfully");
        } catch (error) {
          console.error("Error uploading image:", error);
          // Continue without the image if upload fails
        } finally {
          setUploading(false);
        }
      }

      // Update profile data immediately (don't wait for image if it's slow)
      const updatePromises = [];

      // Update Firebase Auth profile
      if (formData.displayName !== user.displayName || photoURL !== user.photoURL) {
        updatePromises.push(
          updateProfile(user, {
            displayName: formData.displayName,
            photoURL: photoURL
          })
        );
      }

      // Update Firestore user document
      updatePromises.push(
        updateDoc(doc(db, "users", user.uid), {
          displayName: formData.displayName,
          bio: formData.bio,
          role: formData.role,
          institution: formData.institution,
          photoURL: photoURL,
          updatedAt: new Date()
        })
      );

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      console.log("Profile updated successfully");
      setSaveSuccess(true);
      
      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
        // Refresh the page to show updated profile
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
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
          <h2 className="text-xl font-semibold text-foreground">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
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
              {uploading ? 'Uploading image...' : 'Click the camera icon to upload a profile picture (max 2MB)'}
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
      </div>
    </div>
  );
};

// Add the missing import
import { getDoc } from "firebase/firestore";

export default ProfileModal;