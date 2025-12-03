// src/pages/MigrationPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';

const MigrationPage = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    if (!window.confirm('This will create Firestore documents for all missing users. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Import dynamically
      const module = await import('../utils/migrateUsers');
      const migrationResult = await module.migrateAllUsers();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        alert(`✅ Success! Created ${migrationResult.created} user documents.`);
      } else {
        setError(migrationResult.error || 'Migration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run migration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const module = await import('../utils/migrateUsers');
      const status = await module.checkMigrationStatus();
      setResult(status);
    } catch (err: any) {
      setError(err.message || 'Failed to check status');
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">🔄 User Migration Tool</h1>
            <p className="text-muted-foreground">
              Create Firestore documents for missing users
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-sm text-muted-foreground">
              <strong>Issue:</strong> 30+ users in Firebase Auth, but only 4 in Firestore.
              This tool creates the missing documents.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={runMigration}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Running Migration...' : 'Run User Migration'}
              </button>
              
              <button
                onClick={checkStatus}
                className="w-full bg-muted text-foreground py-3 px-4 rounded-lg font-semibold hover:bg-muted/80 transition-colors"
              >
                Check Current Status
              </button>
              
              <Link 
                to="/login"
                className="w-full text-center text-primary hover:text-primary/80 transition-colors py-2"
              >
                ← Back to Login
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Results:</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;