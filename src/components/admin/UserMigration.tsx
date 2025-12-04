import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Shield,
  FileText
} from 'lucide-react';

interface UserMigrationProps {
  onBack?: () => void;
}

interface MigrationStats {
  firestoreCount: number;
  authCount: number;
  missingCount: number;
  existingCount: number;
  missingUsers: Array<{uid: string, email: string}>;
  percentageComplete: number;
}

const UserMigration = ({ onBack }: UserMigrationProps) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [migrationStats, setMigrationStats] = useState<MigrationStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    setError(null);
    setMigrationStats(null);

    try {
      // Import the migration function
      const module = await import('../../utils/migrateUsers');
      const stats = await module.getUserMigrationStats();
      setMigrationStats(stats);
    } catch (err: any) {
      console.error('Error checking migration status:', err);
      setError(err.message || 'Failed to check migration status');
    } finally {
      setIsChecking(false);
    }
  };

  const runMigration = async () => {
    if (!window.confirm('This will create Firestore documents for all users missing from Firestore. Continue?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationStatus('idle');
    setError(null);
    setMigrationResult(null);

    try {
      // Import the migration function
      const module = await import('../../utils/migrateUsers');
      const result = await module.migrateAllUsers();
      
      setMigrationResult(result);
      
      if (result.success) {
        setMigrationStatus('success');
        
        // Refresh stats after migration
        const stats = await module.getUserMigrationStats();
        setMigrationStats(stats);
        
        // Auto-refresh after successful migration
        setTimeout(() => {
          checkMigrationStatus();
        }, 2000);
      } else {
        setMigrationStatus('error');
        setError(result.error || 'Migration failed');
      }
    } catch (err: any) {
      console.error('Migration error:', err);
      setMigrationStatus('error');
      setError(err.message || 'Failed to run migration');
    } finally {
      setIsMigrating(false);
    }
  };

  const runQuickTest = async () => {
    try {
      const { db } = await import('../../firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      // Test with a known user
      const testUid = "7JoixKgAxqQFbhGB0uOuMeBf1Gn1"; // Your admin user
      const userRef = doc(db, "users", testUid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        alert(`✅ Test user found in Firestore!\nEmail: ${userSnap.data().email}`);
      } else {
        alert('❌ Test user not found in Firestore');
      }
    } catch (err: any) {
      alert('Test failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="w-6 h-6" />
            User Migration Tool
          </h2>
          <p className="text-muted-foreground">
            Fix missing user documents between Firebase Auth and Firestore
          </p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back to Dashboard
          </Button>
        )}
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Current Status
          </CardTitle>
          <CardDescription>
            Check the sync status between Firebase Authentication and Firestore
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={checkMigrationStatus}
              disabled={isChecking || isMigrating}
              variant="outline"
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Status
                </>
              )}
            </Button>
            
            <Button 
              onClick={runQuickTest}
              variant="outline"
              className="flex-1"
            >
              <Shield className="w-4 h-4 mr-2" />
              Test Connection
            </Button>
          </div>

          {migrationStats && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sync Progress</span>
                  <span className="font-semibold">{migrationStats.percentageComplete}%</span>
                </div>
                <Progress value={migrationStats.percentageComplete} className="h-2" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-2xl font-bold">{migrationStats.authCount}</div>
                  <div className="text-sm text-muted-foreground">Firebase Auth Users</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-2xl font-bold">{migrationStats.firestoreCount}</div>
                  <div className="text-sm text-muted-foreground">Firestore Documents</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{migrationStats.existingCount}</div>
                  <div className="text-sm text-muted-foreground">Synced Users</div>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{migrationStats.missingCount}</div>
                  <div className="text-sm text-muted-foreground">Missing Users</div>
                </div>
              </div>

              {/* Missing Users List */}
              {migrationStats.missingUsers.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Missing Users ({migrationStats.missingUsers.length} shown)
                  </h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                      {migrationStats.missingUsers.map((user, index) => (
                        <div key={user.uid} className="flex items-center justify-between py-1">
                          <span className="font-mono text-xs truncate">{user.email}</span>
                          <Badge variant="outline" className="text-xs">Missing</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && !migrationStats && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertTitle>Check Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Migration Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Run Migration
          </CardTitle>
          <CardDescription>
            Create missing Firestore documents for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runMigration}
            disabled={isMigrating || (migrationStats?.missingCount === 0 && migrationStats)}
            className="w-full"
            variant="default"
            size="lg"
          >
            {isMigrating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Migration...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {migrationStats?.missingCount === 0 ? 'All Users Synced' : 'Run User Migration'}
              </>
            )}
          </Button>

          {/* Migration Results */}
          {migrationStatus === 'success' && migrationResult && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertTitle className="text-green-800">Migration Successful!</AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{migrationResult.created || 0}</div>
                      <div className="text-xs">Created</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">{migrationResult.skipped || 0}</div>
                      <div className="text-xs">Skipped</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-600">{migrationResult.errors || 0}</div>
                      <div className="text-xs">Errors</div>
                    </div>
                  </div>
                  <p className="text-sm mt-2">✅ User documents have been created in Firestore</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {migrationStatus === 'error' && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertTitle>Migration Failed</AlertTitle>
              <AlertDescription>
                {error || 'An unknown error occurred during migration'}
              </AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <FileText className="w-4 h-4" />
              <span className="font-semibold">What happens during migration?</span>
            </div>
            <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
              <li>Creates Firestore document for each missing user</li>
              <li>Sets username (derived from email)</li>
              <li>Assigns default role: "user"</li>
              <li>Sets points and challenges to 0</li>
              <li>Creates leaderboard entry</li>
              <li>Existing users are skipped (no data loss)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Troubleshooting
          </CardTitle>
          <CardDescription>
            Common issues and solutions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">Issue: "Missing or insufficient permissions"</h4>
              <p className="text-sm text-muted-foreground">
                Solution: Update Firestore rules to allow admin to create user documents. 
                Check the Admin Dashboard documentation for updated rule sets.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-1">Issue: Migration creates 0 users</h4>
              <p className="text-sm text-muted-foreground">
                Solution: Users already exist in Firestore. This is normal after the first migration.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-1">Issue: Users still can't login after migration</h4>
              <p className="text-sm text-muted-foreground">
                Solution: Check the user's UID matches between Auth and Firestore. 
                Use the "Test Connection" button above.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-2">Quick Actions</h4>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Open browser console
                  console.log('=== USER MIGRATION DEBUG ===');
                  console.log('Current user migration tools available:');
                  if (window.userMigrationTools) {
                    console.log('• window.userMigrationTools.migrateAllUsers()');
                    console.log('• window.userMigrationTools.getUserMigrationStats()');
                  }
                  console.log('==========================');
                  alert('Debug tools logged to console (F12)');
                }}
              >
                Open Debug Console
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserMigration;