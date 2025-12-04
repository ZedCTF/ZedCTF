// src/components/admin/UsernameSync.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  FileText,
  Shield,
  Key
} from "lucide-react";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";

interface SyncResult {
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string[];
}

interface SyncStats {
  totalUsernames: number;
  totalUsers: number;
  orphansFound: number;
  usersWithoutUsernames: number;
  mismatchedUsernames: number;
  fixedCount: number;
}

interface UsernameDocument {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface UserDocument {
  id: string;
  username?: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: any;
  role?: string;
}

const UsernameSync = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [stats, setStats] = useState<SyncStats>({
    totalUsernames: 0,
    totalUsers: 0,
    orphansFound: 0,
    usersWithoutUsernames: 0,
    mismatchedUsernames: 0,
    fixedCount: 0
  });
  const [details, setDetails] = useState<string[]>([]);

  const cleanUsername = (username: string | undefined): string => {
    if (!username) return '';
    return username
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  };

  const scanForIssues = async () => {
    setScanning(true);
    setResult(null);
    setDetails([]);

    try {
      // Fetch all usernames
      const usernamesSnapshot = await getDocs(collection(db, "usernames"));
      const usernamesData: UsernameDocument[] = usernamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UsernameDocument));

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData: UserDocument[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserDocument));

      // Create lookup maps
      const usernameMap = new Map<string, UsernameDocument>();
      const userMap = new Map<string, UserDocument>();

      usernamesData.forEach(item => {
        usernameMap.set(item.id, item);
      });

      usersData.forEach(user => {
        userMap.set(user.id, user);
      });

      // Analyze issues
      const orphans: Array<{username: string, userId: string, email?: string}> = [];
      const missingUsernames: Array<{userId: string, username: string, email?: string}> = [];
      const mismatched: Array<{usernameInUsernames: string, usernameInUsers: string, userId: string, email?: string}> = [];

      // 1. Find orphaned usernames (no matching user)
      usernamesData.forEach(usernameDoc => {
        if (!userMap.has(usernameDoc.userId)) {
          orphans.push({
            username: usernameDoc.id,
            userId: usernameDoc.userId,
            email: usernameDoc.email
          });
        }
      });

      // 2. Find users without username documents
      usersData.forEach(user => {
        if (user.username) {
          const cleaned = cleanUsername(user.username);
          if (!usernameMap.has(cleaned)) {
            missingUsernames.push({
              userId: user.id,
              username: user.username,
              email: user.email
            });
          }
        }
      });

      // 3. Find mismatched usernames
      usernamesData.forEach(usernameDoc => {
        const user = userMap.get(usernameDoc.userId);
        if (user && user.username) {
          const cleanedUserUsername = cleanUsername(user.username);
          if (cleanedUserUsername !== usernameDoc.id) {
            mismatched.push({
              usernameInUsernames: usernameDoc.id,
              usernameInUsers: user.username,
              userId: usernameDoc.userId,
              email: usernameDoc.email
            });
          }
        }
      });

      // Update stats
      const newStats: SyncStats = {
        totalUsernames: usernamesData.length,
        totalUsers: usersData.length,
        orphansFound: orphans.length,
        usersWithoutUsernames: missingUsernames.length,
        mismatchedUsernames: mismatched.length,
        fixedCount: 0
      };

      setStats(newStats);

      // Generate details
      const newDetails: string[] = [];

      if (orphans.length > 0) {
        newDetails.push(`Found ${orphans.length} orphaned usernames:`);
        orphans.forEach(orphan => {
          newDetails.push(`  • ${orphan.username} (User ID: ${orphan.userId})`);
        });
      }

      if (missingUsernames.length > 0) {
        newDetails.push(`\nFound ${missingUsernames.length} users without username documents:`);
        missingUsernames.forEach(user => {
          newDetails.push(`  • ${user.username} (User ID: ${user.userId})`);
        });
      }

      if (mismatched.length > 0) {
        newDetails.push(`\nFound ${mismatched.length} mismatched usernames:`);
        mismatched.forEach(mismatch => {
          newDetails.push(`  • In 'usernames': ${mismatch.usernameInUsernames}`);
          newDetails.push(`  • In 'users': ${mismatch.usernameInUsers}`);
        });
      }

      setDetails(newDetails);

      if (orphans.length === 0 && missingUsernames.length === 0 && mismatched.length === 0) {
        setResult({
          type: 'success',
          message: '✅ All usernames are properly synchronized! No issues found.',
          details: newDetails
        });
      } else {
        setResult({
          type: 'info',
          message: `Found ${orphans.length + missingUsernames.length + mismatched.length} issues that need fixing.`,
          details: newDetails
        });
      }

    } catch (error: any) {
      console.error("Scan error:", error);
      setResult({
        type: 'error',
        message: `Error during scan: ${error.message}`
      });
    } finally {
      setScanning(false);
    }
  };

  const fixIssuesWithBatch = async () => {
    setLoading(true);
    setResult(null);
    setDetails([]);

    try {
      // Check if user is authenticated and is admin
      if (!user) {
        throw new Error("You must be logged in to use this tool");
      }

      // Fetch the user's document to check if they're admin
      const adminUserDoc = await getDocs(collection(db, "users"));
      const adminUser = adminUserDoc.docs.find(doc => doc.id === user.uid);
      
      if (!adminUser || adminUser.data().role !== 'admin') {
        throw new Error("You must be an admin to use this tool");
      }

      // Fetch all data
      const usernamesSnapshot = await getDocs(collection(db, "usernames"));
      const usernamesData: UsernameDocument[] = usernamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UsernameDocument));

      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData: UserDocument[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserDocument));

      // Create lookup maps
      const usernameMap = new Map<string, UsernameDocument>();
      const userMap = new Map<string, UserDocument>();

      usernamesData.forEach(item => {
        usernameMap.set(item.id, item);
      });

      usersData.forEach(user => {
        userMap.set(user.id, user);
      });

      let operationsCount = 0;
      const fixDetails: string[] = [];
      const batch = writeBatch(db);

      // 1. Create missing username documents
      for (const userDoc of usersData) {
        if (userDoc.username) {
          const cleaned = cleanUsername(userDoc.username);
          if (!usernameMap.has(cleaned)) {
            try {
              const usernameDocRef = doc(db, "usernames", cleaned);
              batch.set(usernameDocRef, {
                userId: userDoc.id,
                email: userDoc.email || '',
                displayName: userDoc.displayName || `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim(),
                createdAt: userDoc.createdAt || new Date(),
                updatedAt: new Date(),
                createdByAdmin: user.uid,
                adminAction: true
              });
              operationsCount++;
              fixDetails.push(`✅ Will create username document for ${cleaned}`);
            } catch (error: any) {
              fixDetails.push(`❌ Failed to queue username for ${cleaned}: ${error.message || error}`);
            }
          }
        }
      }

      // 2. Remove orphaned usernames
      for (const usernameDoc of usernamesData) {
        if (!userMap.has(usernameDoc.userId)) {
          try {
            // Check if user actually exists
            const userExists = usersData.some(user => user.id === usernameDoc.userId);
            
            if (!userExists) {
              const usernameDocRef = doc(db, "usernames", usernameDoc.id);
              batch.delete(usernameDocRef);
              operationsCount++;
              fixDetails.push(`🗑️  Will remove orphaned username: ${usernameDoc.id}`);
            }
          } catch (error: any) {
            fixDetails.push(`❌ Failed to queue removal for ${usernameDoc.id}: ${error.message || error}`);
          }
        }
      }

      // 3. Fix mismatched usernames
      for (const usernameDoc of usernamesData) {
        const userDoc = userMap.get(usernameDoc.userId);
        if (userDoc && userDoc.username) {
          const cleanedUserUsername = cleanUsername(userDoc.username);
          if (cleanedUserUsername !== usernameDoc.id) {
            try {
              // Create new username document
              const newUsernameDocRef = doc(db, "usernames", cleanedUserUsername);
              batch.set(newUsernameDocRef, {
                userId: usernameDoc.userId,
                email: usernameDoc.email || userDoc.email || '',
                displayName: userDoc.displayName || usernameDoc.displayName || '',
                createdAt: usernameDoc.createdAt || userDoc.createdAt || new Date(),
                updatedAt: new Date(),
                fixedByAdmin: user.uid,
                adminAction: true,
                previousUsername: usernameDoc.id
              });

              // Delete old username document
              const oldUsernameDocRef = doc(db, "usernames", usernameDoc.id);
              batch.delete(oldUsernameDocRef);

              // Update user document with cleaned username
              const userDocRef = doc(db, "users", userDoc.id);
              batch.update(userDocRef, {
                username: cleanedUserUsername,
                updatedAt: new Date(),
                lastAdminSync: new Date()
              });

              operationsCount += 3; // Count as 3 operations
              fixDetails.push(`🔄 Will fix username mismatch: ${usernameDoc.id} → ${cleanedUserUsername}`);
            } catch (error: any) {
              fixDetails.push(`❌ Failed to queue fix for ${usernameDoc.id}: ${error.message || error}`);
            }
          }
        }
      }

      // Commit all changes in a single batch
      if (operationsCount > 0) {
        fixDetails.unshift(`🔄 Preparing to commit ${operationsCount} operations in batch...`);
        setDetails(fixDetails);
        
        // Show a confirmation before committing
        const shouldProceed = window.confirm(
          `You are about to perform ${operationsCount} operations.\n\n` +
          `This will modify Firestore documents. Are you sure you want to continue?`
        );
        
        if (!shouldProceed) {
          fixDetails.push("❌ Operation cancelled by user");
          setDetails([...fixDetails]);
          setResult({
            type: 'info',
            message: 'Operation cancelled.'
          });
          setLoading(false);
          return;
        }
        
        try {
          await batch.commit();
          fixDetails.push(`\n✅ Successfully committed ${operationsCount} operations!`);
          
          // Update stats
          setStats(prev => ({
            ...prev,
            fixedCount: operationsCount
          }));
          
          setResult({
            type: 'success',
            message: `✅ Successfully applied ${operationsCount} operations!`,
            details: fixDetails
          });
          
          // Refresh the scan to show updated stats
          setTimeout(() => {
            scanForIssues();
          }, 2000);
          
        } catch (error: any) {
          fixDetails.push(`\n❌ Batch commit failed: ${error.message || error}`);
          setDetails(fixDetails);
          setResult({
            type: 'error',
            message: `Batch commit failed: ${error.message || error}`
          });
        }
      } else {
        fixDetails.push("ℹ️ No operations to perform - everything is already synchronized");
        setDetails(fixDetails);
        setResult({
          type: 'info',
          message: 'No changes needed - everything is already synchronized'
        });
      }

    } catch (error: any) {
      console.error("Fix error:", error);
      setResult({
        type: 'error',
        message: `Error: ${error.message || error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setResult(null);
    setDetails([]);
    setStats({
      totalUsernames: 0,
      totalUsers: 0,
      orphansFound: 0,
      usersWithoutUsernames: 0,
      mismatchedUsernames: 0,
      fixedCount: 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Username Synchronization</h2>
          <p className="text-muted-foreground">
            Fix username inconsistencies between 'users' and 'usernames' collections
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>

      {/* Admin Notice */}
      {user && (
        <Alert className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <Key className="w-5 h-5 text-blue-600 mt-0.5" />
            <AlertDescription>
              <p className="font-medium">Admin Mode Active</p>
              <p className="text-sm">Logged in as: {user.email}</p>
              <p className="text-xs mt-1">Batch operations will be performed with admin privileges.</p>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Usernames:</span>
                <span className="font-semibold">{stats.totalUsernames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Users:</span>
                <span className="font-semibold">{stats.totalUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Orphaned usernames:</span>
                <span className="font-semibold">{stats.orphansFound}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Missing username docs:</span>
                <span className="font-semibold">{stats.usersWithoutUsernames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Mismatched usernames:</span>
                <span className="font-semibold">{stats.mismatchedUsernames}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Operations</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.fixedCount}</div>
              <p className="text-sm text-muted-foreground">Total operations applied</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Scan for username issues and fix them using batch operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={scanForIssues}
              disabled={scanning || loading}
              className="flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Scan for Issues
                </>
              )}
            </Button>

            <Button
              onClick={fixIssuesWithBatch}
              disabled={loading || scanning || 
                (stats.orphansFound === 0 && stats.usersWithoutUsernames === 0 && stats.mismatchedUsernames === 0)}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Fix All Issues (Batch)
                </>
              )}
            </Button>

            <Button
              onClick={resetAll}
              variant="outline"
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reset
            </Button>
          </div>

          {result && (
            <Alert className={`
              ${result.type === 'success' ? 'border-green-200 bg-green-50' : ''}
              ${result.type === 'error' ? 'border-red-200 bg-red-50' : ''}
              ${result.type === 'info' ? 'border-blue-200 bg-blue-50' : ''}
            `}>
              <div className="flex items-start gap-2">
                {result.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                {result.type === 'error' && <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                {result.type === 'info' && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                <AlertDescription className="font-medium">
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {details.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Details:</h3>
              <div className="bg-muted p-4 rounded-lg max-h-60 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {details.join('\n')}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Batch Operations Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-800 rounded-full p-1">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium">Single Transaction</h4>
              <p className="text-sm text-muted-foreground">
                All changes are committed in one atomic batch operation
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-green-100 text-green-800 rounded-full p-1">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium">Admin Privileges</h4>
              <p className="text-sm text-muted-foreground">
                Operations are performed with admin-level permissions
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-purple-100 text-purple-800 rounded-full p-1">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium">Audit Trail</h4>
              <p className="text-sm text-muted-foreground">
                All changes are marked with admin ID and timestamp
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsernameSync;