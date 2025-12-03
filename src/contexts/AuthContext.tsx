// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  GithubAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName?: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGithub: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  createMissingUserDocuments: () => Promise<void>;
  updateUserActivity: () => Promise<void>; // ADDED
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  signup: async () => ({ success: false, error: 'Not implemented' }),
  login: async () => ({ success: false, error: 'Not implemented' }),
  logout: async () => {},
  loginWithGoogle: async () => ({ success: false, error: 'Not implemented' }),
  loginWithGithub: async () => ({ success: false, error: 'Not implemented' }),
  resetPassword: async () => ({ success: false, error: 'Not implemented' }),
  updateUserProfile: async () => {},
  createMissingUserDocuments: async () => {},
  updateUserActivity: async () => {} // ADDED
});

// Function to check if username is available
const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const usernameRef = doc(db, "usernames", username.toLowerCase());
    const usernameSnap = await getDoc(usernameRef);
    return !usernameSnap.exists();
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

// Function to create user document in Firestore
const createUserDocument = async (user: User, customUsername?: string, displayName?: string) => {
  if (!user) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const email = user.email || "";
    const finalUsername = customUsername || email.split('@')[0] || `user_${user.uid.substring(0, 8)}`;
    const finalDisplayName = displayName || user.displayName || finalUsername;
    
    // Check if username is available
    const usernameAvailable = await isUsernameAvailable(finalUsername);
    if (!usernameAvailable) {
      throw new Error(`Username "${finalUsername}" is already taken. Please choose another.`);
    }
    
    try {
      // Create user document
      const userData: any = {
        uid: user.uid,
        email: email,
        displayName: finalDisplayName,
        username: finalUsername.toLowerCase(),
        photoURL: user.photoURL || null,
        role: 'user',
        totalPoints: 0,
        challengesSolved: 0,
        currentRank: 0,
        isActive: true,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        firstName: finalDisplayName.split(' ')[0] || "",
        lastName: finalDisplayName.split(' ').slice(1).join(' ') || "",
        bio: "",
        institution: "",
        country: "",
        permissions: ["read"],
        provider: user.providerData[0]?.providerId || 'password',
        emailVerified: user.emailVerified || false
      };

      await setDoc(userRef, userData);

      // Create username entry for uniqueness check
      const usernameRef = doc(db, "usernames", finalUsername.toLowerCase());
      await setDoc(usernameRef, {
        userId: user.uid,
        username: finalUsername.toLowerCase(),
        createdAt: serverTimestamp(),
        email: email
      });

      // Create leaderboard entry
      const leaderboardRef = doc(db, "leaderboard", user.uid);
      await setDoc(leaderboardRef, {
        userId: user.uid,
        username: finalUsername.toLowerCase(),
        displayName: finalDisplayName,
        totalPoints: 0,
        challengesSolved: 0,
        rank: 999,
        lastUpdated: serverTimestamp(),
        avatar: user.photoURL || null,
        country: null,
        institution: null,
        lastActive: serverTimestamp()
      });

      console.log("Created user document for:", user.uid);
      return userRef;
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  }
  
  // Update last active timestamp for existing users
  await updateDoc(userRef, {
    lastActive: serverTimestamp()
  });
  
  return userRef;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Signup function
  const signup = async (email: string, password: string, displayName?: string, username?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Create user document in Firestore with custom username
      await createUserDocument(user, username, displayName);
      
      return { success: true };
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = "Signup failed. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.message?.includes("Username")) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create or update user document
      await createUserDocument(user);
      
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Google login
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Create or update user document
      await createUserDocument(user);
      
      return { success: true };
    } catch (error: any) {
      console.error("Google login error:", error);
      return { 
        success: false, 
        error: error.code === 'auth/popup-closed-by-user' 
          ? "Login popup was closed." 
          : "Google login failed. Please try again." 
      };
    }
  };

  // GitHub login
  const loginWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Create or update user document
      await createUserDocument(user);
      
      return { success: true };
    } catch (error: any) {
      console.error("GitHub login error:", error);
      return { 
        success: false, 
        error: error.code === 'auth/popup-closed-by-user' 
          ? "Login popup was closed." 
          : "GitHub login failed. Please try again." 
      };
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send reset email.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Update last active before logout
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          lastActive: serverTimestamp()
        });
        
        // Also update leaderboard
        const leaderboardRef = doc(db, "leaderboard", user.uid);
        await updateDoc(leaderboardRef, {
          lastActive: serverTimestamp()
        });
      }
      
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Update user profile
  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
    if (!user) return;
    
    try {
      // Update Firebase Auth profile
      await updateProfile(user, data);
      
      // Update Firestore document
      const userRef = doc(db, "users", user.uid);
      const updates: any = {};
      
      if (data.displayName) updates.displayName = data.displayName;
      if (data.photoURL) updates.photoURL = data.photoURL;
      
      updates.updatedAt = serverTimestamp();
      
      await updateDoc(userRef, updates);
      
      // Update leaderboard if display name changed
      if (data.displayName) {
        const leaderboardRef = doc(db, "leaderboard", user.uid);
        await updateDoc(leaderboardRef, {
          displayName: data.displayName,
          lastUpdated: serverTimestamp()
        });
      }
      
      // Refresh user data
      setUser({ ...user, ...data });
      
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  // Function to update user activity
  const updateUserActivity = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastActive: serverTimestamp()
      });
      
      // Also update leaderboard
      const leaderboardRef = doc(db, "leaderboard", user.uid);
      await updateDoc(leaderboardRef, {
        lastActive: serverTimestamp()
      });
      
      console.log("User activity updated");
    } catch (error) {
      console.error("Error updating user activity:", error);
    }
  };

  // Function to create missing user documents for existing users
  const createMissingUserDocuments = async () => {
    try {
      const userUids = [
        "TKGINtq7tiV8GLPM8Q4NzIlsv7I2",
        "dB2FJF6cIaQQHDx5P132qpRVHbA3",
        "zf5PamDFf8Y7lAz0ocXMlE6XVA63",
        "IGvtocxM2zUYVlfcQ4q4ruAmmr02",
        "V86ol2bltCMg4wIxziyw4mLLIXO2",
        "QVx7ZGG0J4P7MqbaSByqZk75K1t1",
        "beUhFOihjSTdvzzbMuDDUXO3dmx2",
        "K0v1ymOucIZMzVArWlKpHcZNrWq1",
        "2K9CaWiJUCaRZvI6iUQ0h8Jze6p1",
        "96427G1vqxOrXfzoYtsBcdi9GFl1",
        "XmCYMs9HXCOUJdcOCf33cYnHndZ2",
        "fdU5NsTrZTZHvKzBu8TIDzIftYG2",
        "YX5xurR6g6aJx1vuoEz5Se2NW383",
        "ZZhtIk6aqYOYPoaPgNADkvHqzFd2",
        "QSnS8LNp9JcrlC4tmgdU9IUASA63",
        "1d8ppSNmzyaQmfQlUsh1Fr32A5f1",
        "xu1DKxtWosh5ho1JFSxI6AcSH2D2",
        "nXNTjVLTBcZH601VNz9HkEiE0pd2",
        "w3MOYndqWFXGwDkQRclOW6jRnIY2",
        "atm5gwUV3CaVBIbzWZwf4s0kwb32",
        "V6j0HnQ45qhLlADOlO1GmmPq6473",
        "NOa7Wab5fxXAVhMO3kDOFhbKs4q2",
        "XdB7vxgWM3XJHU69LiSoYOuGiHB2",
        "Uwdb7hUje4SKmdbgCYzdnZCCBdH3",
        "uyMvZAO3RwMuzLnNlIgxza5tS3t2",
        "HCjamDy0U2PDlvxdBikGdNRk4qq1",
        "tYOpdvwgldXO7v8Lt4wOs99S5vu2",
        "T7zjUcAeBZelBOw6eFgDSa97btb2",
        "7JoixKgAxqQFbhGB0uOuMeBf1Gn1"
      ];

      console.log(`Creating missing documents for ${userUids.length} users...`);
      
      for (const uid of userUids) {
        try {
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const username = `user${uid.substring(0, 6)}`;
            const email = `user_${uid.substring(0, 8)}@example.com`;
            
            // Check if username is available
            const usernameAvailable = await isUsernameAvailable(username);
            const finalUsername = usernameAvailable ? username : `user_${uid.substring(0, 8)}`;
            
            // Create user document
            await setDoc(userRef, {
              uid: uid,
              email: email,
              displayName: `User ${uid.substring(0, 6)}`,
              username: finalUsername.toLowerCase(),
              role: 'user',
              totalPoints: 0,
              challengesSolved: 0,
              currentRank: 0,
              isActive: true,
              createdAt: serverTimestamp(),
              lastActive: serverTimestamp(),
              firstName: "User",
              lastName: uid.substring(0, 6),
              bio: "",
              institution: "",
              country: "",
              permissions: ["read"],
              provider: 'password',
              emailVerified: false
            });

            // Create username entry
            if (usernameAvailable) {
              const usernameRef = doc(db, "usernames", finalUsername.toLowerCase());
              await setDoc(usernameRef, {
                userId: uid,
                username: finalUsername.toLowerCase(),
                createdAt: serverTimestamp(),
                email: email
              });
            }

            // Create leaderboard entry
            const leaderboardRef = doc(db, "leaderboard", uid);
            await setDoc(leaderboardRef, {
              userId: uid,
              username: finalUsername.toLowerCase(),
              displayName: `User ${uid.substring(0, 6)}`,
              totalPoints: 0,
              challengesSolved: 0,
              rank: 999,
              lastUpdated: serverTimestamp(),
              avatar: null,
              country: null,
              institution: null,
              lastActive: serverTimestamp()
            });

            console.log(`Created documents for user: ${uid}`);
          }
        } catch (error) {
          console.error(`Error creating documents for ${uid}:`, error);
        }
      }
      
      console.log('Migration completed!');
    } catch (error) {
      console.error('Migration error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Create or update user document when auth state changes
          await createUserDocument(firebaseUser);
          setUser(firebaseUser);
        } catch (error) {
          console.error("Error creating user document on auth state change:", error);
          setUser(firebaseUser); // Still set user even if document creation fails
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      signup,
      login,
      logout,
      loginWithGoogle,
      loginWithGithub,
      resetPassword,
      updateUserProfile,
      createMissingUserDocuments,
      updateUserActivity // ADDED
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export as useAuth instead of useAuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Keep backward compatibility
export const useAuthContext = useAuth;