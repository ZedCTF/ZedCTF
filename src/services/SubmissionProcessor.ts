import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc
} from "firebase/firestore";

class SubmissionProcessor {
  private static instance: SubmissionProcessor;
  private unsubscribe: (() => void) | null = null;

  static getInstance(): SubmissionProcessor {
    if (!SubmissionProcessor.instance) {
      SubmissionProcessor.instance = new SubmissionProcessor();
    }
    return SubmissionProcessor.instance;
  }

  start() {
    if (this.unsubscribe) return;

    console.log("🔍 Starting submission processor...");
    
    // Listen for new correct submissions
    const submissionsRef = collection(db, "submissions");
    const q = query(submissionsRef, where("isCorrect", "==", true));
    
    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const submission = change.doc.data();
          await this.processCorrectSubmission(submission);
        }
      });
    });
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log("🔍 Submission processor stopped");
    }
  }

  private async processCorrectSubmission(submission: any) {
    try {
      const { userId, pointsAwarded, challengeId } = submission;
      
      if (!userId || !pointsAwarded) return;
      
      console.log(`🏆 Processing correct submission for user ${userId}: +${pointsAwarded} points`);
      
      // 1. Update user's points and challenges solved
      await this.updateUserStats(userId, pointsAwarded, challengeId);
      
      // 2. Update leaderboard
      await this.updateLeaderboard(userId, pointsAwarded);
      
      console.log(`✅ Updated leaderboard for user ${userId}`);
      
    } catch (error) {
      console.error("❌ Error processing submission:", error);
    }
  }

  private async updateUserStats(userId: string, points: number, challengeId?: string) {
    try {
      const userRef = doc(db, "users", userId);
      
      // Check if user exists
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.error(`User ${userId} not found`);
        return;
      }
      
      // Update user document
      await updateDoc(userRef, {
        totalPoints: increment(points),
        challengesSolved: increment(1),
        lastActive: new Date()
      });
      
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
    }
  }

  private async updateLeaderboard(userId: string, points: number) {
    try {
      const leaderboardRef = doc(db, "leaderboard", userId);
      
      // Check if leaderboard entry exists
      const leaderboardSnap = await getDoc(leaderboardRef);
      
      if (leaderboardSnap.exists()) {
        // Update existing entry
        await updateDoc(leaderboardRef, {
          totalPoints: increment(points),
          challengesSolved: increment(1),
          lastUpdated: new Date()
        });
      } else {
        // Create new entry
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          await setDoc(leaderboardRef, {
            userId: userId,
            username: userData.username || `user_${userId.substring(0, 8)}`,
            displayName: userData.displayName || "Unknown User",
            totalPoints: points,
            challengesSolved: 1,
            rank: 999,
            lastUpdated: new Date(),
            avatar: userData.photoURL || null,
            country: userData.country || null,
            institution: userData.institution || null
          });
        }
      }
      
    } catch (error) {
      console.error(`Error updating leaderboard for ${userId}:`, error);
    }
  }

  // Manual fix for existing submissions
  async fixAllSubmissions() {
    try {
      console.log("🔧 Fixing all existing submissions...");
      
      const submissionsRef = collection(db, "submissions");
      const q = query(submissionsRef, where("isCorrect", "==", true));
      const snapshot = await getDoc(q);
      
      let fixed = 0;
      
      for (const docSnap of snapshot.docs) {
        const submission = docSnap.data();
        await this.processCorrectSubmission(submission);
        fixed++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Fixed ${fixed} submissions`);
      return fixed;
      
    } catch (error) {
      console.error("Error fixing submissions:", error);
      return 0;
    }
  }
}

export default SubmissionProcessor;