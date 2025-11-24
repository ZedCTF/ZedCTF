// src/contexts/AdminContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthContext } from './AuthContext';

interface AdminContextType {
  isAdmin: boolean;
  isModerator: boolean;
  permissions: string[];
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isModerator: false,
  permissions: [],
  loading: true
});

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthContext();
  const [adminState, setAdminState] = useState<AdminContextType>({
    isAdmin: false,
    isModerator: false,
    permissions: [],
    loading: true
  });

  useEffect(() => {
    if (!user) {
      console.log("🚫 AdminProvider: No user found");
      setAdminState({
        isAdmin: false,
        isModerator: false,
        permissions: [],
        loading: false
      });
      return;
    }

    console.log("🔄 AdminProvider: Checking user role for UID:", user.uid);
    
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          console.log("✅ User document found:", userData);
          
          const role = userData.role || 'user';
          const permissions = userData.permissions || ['read'];
          
          console.log("🎯 User role:", role);
          console.log("🔑 User permissions:", permissions);
          
          setAdminState({
            isAdmin: role === 'admin',
            isModerator: role === 'moderator' || role === 'admin',
            permissions,
            loading: false
          });
        } else {
          console.log("❌ No user document found in Firestore");
          setAdminState({
            isAdmin: false,
            isModerator: false,
            permissions: [],
            loading: false
          });
        }
      },
      (error) => {
        console.error("💥 Firestore error in AdminContext:", error);
        console.error("Error details:", error.code, error.message);
        setAdminState({
          isAdmin: false,
          isModerator: false,
          permissions: [],
          loading: false
        });
      }
    );

    return unsubscribe;
  }, [user]);

  return (
    <AdminContext.Provider value={adminState}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
};