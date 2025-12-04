// src/components/admin/LeaderboardRecalc.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  writeBatch, 
  doc, 
  getDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../../firebase";

interface LeaderboardRecalcProps {
  onBack?: () => void;
}

const LeaderboardRecalc = ({ onBack }: LeaderboardRecalcProps) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<any>(null);

  const recalculateLeaderboard = async () => {
    try {
      setIsRecalculating(true);
      setStatus("running");
      setMessage("Starting leaderboard recalculation...");
      
      // Step 1: Get all correct submissions
      setMessage("Fetching correct submissions...");
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("isCorrect", "==", true)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      
      setMessage(`Found ${submissionsSnapshot.size} correct submissions`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Calculate user scores
      setMessage("Calculating user scores...");
      const userScores = new Map();
      
      submissionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;
        
        if (!userId) return;
        
        const points = data.pointsAwarded || data.points || 0;
        const username = data.userName || data.username || `User_${userId.substring(0, 6)}`;
        
        if (!userScores.has(userId)) {
          userScores.set(userId, {
            totalPoints: 0,
            username,
            correctCount: 0,
            lastSubmission: data.submittedAt || null
          });
        }
        
        const user = userScores.get(userId);
        user.totalPoints += points;
        user.correctCount++;
        
        if (data.submittedAt && (!user.lastSubmission || data.submittedAt > user.lastSubmission)) {
          user.lastSubmission = data.submittedAt;
        }
      });
      
      const userIds = Array.from(userScores.keys());
      setProgress({ current: 0, total: userIds.length });
      
      // Step 3: Update user documents
      setMessage("Updating user documents...");
      const batch = writeBatch(db);
      
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const userData = userScores.get(userId);
        const userRef = doc(db, "users", userId);
        
        batch.set(userRef, {
          uid: userId,
          username: userData.username,
          totalPoints: userData.totalPoints,
          correctSubmissions: userData.correctCount,
          lastSubmission: userData.lastSubmission || serverTimestamp(),
          updatedAt: serverTimestamp(),
          leaderboardRecalculated: serverTimestamp()
        }, { merge: true });
        
        setProgress({ current: i + 1, total: userIds.length });
        
        // Commit in batches of 500 (Firestore limit)
        if ((i + 1) % 500 === 0 || i === userIds.length - 1) {
          await batch.commit();
          setMessage(`Updated ${i + 1}/${userIds.length} users...`);
        }
      }
      
      // Step 4: Update leaderboard
      setMessage("Updating leaderboard...");
      const sortedUsers = Array.from(userScores.entries())
        .sort((a, b) => {
          // Sort by points (descending), then by last submission (ascending)
          if (b[1].totalPoints !== a[1].totalPoints) {
            return b[1].totalPoints - a[1].totalPoints;
          }
          const aTime = a[1].lastSubmission?.seconds || 0;
          const bTime = b[1].lastSubmission?.seconds || 0;
          return aTime - bTime;
        })
        .map(([userId, data], index) => ({
          userId,
          username: data.username,
          totalPoints: data.totalPoints,
          correctSubmissions: data.correctCount,
          rank: index + 1
        }));
      
      const leaderboardRef = doc(db, "leaderboard", "current");
      await batch.set(leaderboardRef, {
        users: sortedUsers,
        updatedAt: serverTimestamp(),
        totalUsers: sortedUsers.length,
        recalculatedAt: serverTimestamp()
      });
      await batch.commit();
      
      // Step 5: Show results
      setResults({
        totalUsers: userIds.length,
        totalSubmissions: submissionsSnapshot.size,
        totalPoints: sortedUsers.reduce((sum, user) => sum + user.totalPoints, 0),
        topUsers: sortedUsers.slice(0, 5)
      });
      
      setStatus("success");
      setMessage("Leaderboard recalculated successfully!");
      
    } catch (error: any) {
      console.error("Error recalculating leaderboard:", error);
      setStatus("error");
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  const quickRecalc = async () => {
    try {
      setIsRecalculating(true);
      setStatus("running");
      setMessage("Quick recalculating leaderboard...");
      
      // Simple recalculation using existing users data
      const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("totalPoints", "desc")));
      const rankedUsers = usersSnapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          userId: doc.id,
          username: data.username || `User_${doc.id.substring(0, 6)}`,
          totalPoints: data.totalPoints || 0,
          correctSubmissions: data.correctSubmissions || 0,
          rank: index + 1
        };
      });
      
      const leaderboardRef = doc(db, "leaderboard", "current");
      const batch = writeBatch(db);
      batch.set(leaderboardRef, {
        users: rankedUsers,
        updatedAt: serverTimestamp(),
        totalUsers: rankedUsers.length,
        quickRecalculated: serverTimestamp()
      });
      await batch.commit();
      
      setStatus("success");
      setMessage("Leaderboard quickly recalculated!");
      
    } catch (error: any) {
      setStatus("error");
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Leaderboard Recalculation
        </CardTitle>
        <CardDescription>
          Fix missing points and update leaderboard rankings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        {status === "running" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-800">{message}</p>
                {progress.total > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-blue-700 mb-1">
                      <span>Progress</span>
                      <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {status === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{message}</p>
                {results && (
                  <div className="mt-3 space-y-2 text-sm text-green-700">
                    <p>• Updated {results.totalUsers} users</p>
                    <p>• Processed {results.totalPoints} total points</p>
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="font-medium mb-1">Top Users:</p>
                      {results.topUsers.map((user: any) => (
                        <p key={user.userId}>#{user.rank} {user.username}: {user.totalPoints} pts</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="font-medium text-red-800">{message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={recalculateLeaderboard}
            disabled={isRecalculating}
            className="w-full"
          >
            {isRecalculating && status === "running" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Full Recalculate Leaderboard
              </>
            )}
          </Button>
          
          <Button
            onClick={quickRecalc}
            disabled={isRecalculating}
            variant="outline"
            className="w-full"
          >
            Quick Recalculate (Fast)
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            Full recalc: Updates user scores from submissions. Quick recalc: Just sorts existing users.
          </p>
        </div>

        {/* Information */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">When to use this:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• After user migration</li>
            <li>• When leaderboard shows incorrect scores</li>
            <li>• When users have points but aren't showing in leaderboard</li>
            <li>• After fixing submission data</li>
          </ul>
        </div>
        
        {onBack && (
          <Button variant="outline" onClick={onBack} className="w-full">
            Back to Dashboard
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardRecalc;