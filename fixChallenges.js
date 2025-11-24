// fixChallenges.js - Run this in browser console to fix existing challenges
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const fixExistingChallenges = async () => {
  try {
    const challengesQuery = collection(db, "challenges");
    const challengesSnapshot = await getDocs(challengesQuery);
    
    const updates = challengesSnapshot.docs.map(async (docSnapshot) => {
      const challenge = docSnapshot.data();
      // Only update if these fields don't exist or challenge is active
      if (challenge.isActive && (
        challenge.featuredOnPractice === undefined || 
        challenge.availableInPractice === undefined ||
        challenge.challengeType === undefined
      )) {
        await updateDoc(doc(db, "challenges", docSnapshot.id), {
          featuredOnPractice: challenge.featuredOnPractice || false,
          availableInPractice: challenge.availableInPractice !== false, // Default to true
          challengeType: challenge.challengeType || 'practice'
        });
        console.log(`Updated challenge: ${challenge.title}`);
        return challenge.title;
      }
      return null;
    });
    
    const results = await Promise.all(updates);
    const updatedChallenges = results.filter(r => r !== null);
    console.log(`Successfully updated ${updatedChallenges.length} challenges:`, updatedChallenges);
  } catch (error) {
    console.error('Error updating challenges:', error);
  }
};

// Run the fix
fixExistingChallenges();