// src/hooks/useFirestore.ts
import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Challenge {
  id?: string;
  title: string;
  description: string;
  category: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  flag: string;
  solvedBy?: string[];
  createdAt?: Date;
}

export const useFirestore = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for challenges
  useEffect(() => {
    const challengesQuery = collection(db, 'challenges');
    
    const unsubscribe = onSnapshot(challengesQuery, (snapshot) => {
      const challengesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Challenge[];
      
      setChallenges(challengesData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const addChallenge = async (challenge: Omit<Challenge, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'challenges'), {
        ...challenge,
        createdAt: new Date(),
        solvedBy: []
      });
      return { success: true, id: docRef.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const markChallengeSolved = async (challengeId: string, userId: string) => {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      const challenge = challenges.find(c => c.id === challengeId);
      
      if (challenge && !challenge.solvedBy?.includes(userId)) {
        await updateDoc(challengeRef, {
          solvedBy: [...(challenge.solvedBy || []), userId]
        });
        return { success: true };
      }
      return { success: false, error: 'Already solved or not found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    challenges,
    addChallenge,
    markChallengeSolved,
    loading
  };
};