// components/FirestoreDebug.tsx
import { useEffect, useState } from 'react';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';

const FirestoreDebug = () => {
  const [collections, setCollections] = useState<{name: string, count: number, sample: any}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkCollections = async () => {
      try {
        // More comprehensive list of possible collection names
        const collectionsToCheck = [
          'users', 'user', 'members', 'profiles',
          'challenges', 'challenge', 'ctfChallenges', 'practice', 
          'events', 'event', 'liveEvents', 'competitions',
          'submissions', 'submission', 'solves', 'completions',
          'activity', 'activities', 'logs'
        ];
        
        const results: {name: string, count: number, sample: any}[] = [];

        for (const collName of collectionsToCheck) {
          try {
            const snapshot = await getDocs(collection(db, collName));
            console.log(`Collection ${collName}:`, snapshot.size, 'documents');
            
            if (!snapshot.empty) {
              const sampleDoc = snapshot.docs[0].data();
              results.push({
                name: collName,
                count: snapshot.size,
                sample: sampleDoc
              });
            }
          } catch (error: any) {
            console.log(`Collection ${collName}:`, error.message);
            // Don't add to results if collection doesn't exist
          }
        }

        setCollections(results);
        
        if (results.length === 0) {
          setError('No collections found. Check Firestore permissions and collection names.');
        }
        
      } catch (err: any) {
        setError(`Firestore connection error: ${err.message}`);
        console.error('Firestore debug error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkCollections();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p>🔍 Scanning Firestore collections...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
      <h3 className="font-bold text-lg mb-2">Firestore Debug Information</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 font-semibold">Error: {error}</p>
          <p className="text-sm text-red-600 mt-1">
            Check your Firestore security rules and make sure the collections exist.
          </p>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="text-red-600">
          <p>❌ No collections found. Possible issues:</p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>Firestore security rules blocking access</li>
            <li>Collections have different names than expected</li>
            <li>No data has been added to Firestore yet</li>
            <li>Firebase configuration issues</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-green-600 font-semibold">
            ✅ Found {collections.length} collection(s)
          </p>
          {collections.map((coll) => (
            <div key={coll.name} className="border rounded p-3 bg-white">
              <h4 className="font-semibold">
                📁 {coll.name} <span className="text-sm text-gray-600">({coll.count} documents)</span>
              </h4>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-blue-600">View Sample Document</summary>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto mt-1 max-h-40">
                  {JSON.stringify(coll.sample, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FirestoreDebug;