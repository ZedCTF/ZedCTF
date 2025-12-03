// src/utils/migrateUsers.ts
import { db } from "../firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection,
  getDocs 
} from "firebase/firestore";

export const migrateAllUsers = async () => {
  try {
    console.log("🚀 Starting user migration...");
    
    const usersFromAuth = [
      { uid: "TKGINtq7tiV8GLPM8Q4NzIlsv7I2", email: "a@a.com" },
      { uid: "dB2FJF6cIaQQHDx5P132qpRVHbA3", email: "silweyacourage@gmail.com" },
      { uid: "zf5PamDFf8Y7lAz0ocXMlE6XVA63", email: "hacker@gmail.com" },
      { uid: "ohx7d3w6hsbJagMgn8HomEP9n5D2", email: "ghanishpatil56@gmail.com" },
      { uid: "IGvtocxM2zUYVlfcQ4q4ruAmmr02", email: "andrewbc57@email.com" },
      { uid: "V86ol2bltCMg4wIxziyw4mLLIXO2", email: "miriambanda123456@gmail.com" },
      { uid: "QVx7ZGG0J4P7MqbaSByqZk75K1t1", email: "rootkit@gmail.com" },
      { uid: "beUhFOihjSTdvzzbMuDDUXO3dmx2", email: "johnchapa97@gmail.com" },
      { uid: "K0v1ymOucIZMzVArWlKpHcZNrWq1", email: "mutendesichilongo14@gmail.com" },
      { uid: "2K9CaWiJUCaRZvI6iUQ0h8Jze6p1", email: "shadreckmutale12@gmail.com" },
      { uid: "96427G1vqxOrXfzoYtsBcdi9GFl1", email: "mwapeobed44@gmail.com" },
      { uid: "XmCYMs9HXCOUJdcOCf33cYnHndZ2", email: "threat23von@gmail.com" },
      { uid: "fdU5NsTrZTZHvKzBu8TIDzIftYG2", email: "bembeleemmanuel47@gmail.com" },
      { uid: "YX5xurR6g6aJx1vuoEz5Se2NW383", email: "sakalar266@gmail.com" },
      { uid: "ZZhtIk6aqYOYPoaPgNADkvHqzFd2", email: "kabwemutale50@gmail.com" },
      { uid: "QSnS8LNp9JcrlC4tmgdU9IUASA63", email: "mapandechembo134@gmail.com" },
      { uid: "1d8ppSNmzyaQmfQlUsh1Fr32A5f1", email: "bwafya13@gmail.com" },
      { uid: "xu1DKxtWosh5ho1JFSxI6AcSH2D2", email: "fulanicomfort05@gmail.com" },
      { uid: "nXNTjVLTBcZH601VNz9HkEiE0pd2", email: "chandarodney54@gmail.com" },
      { uid: "w3MOYndqWFXGwDkQRclOW6jRnIY2", email: "praisekabwe83@gmail.com" },
      { uid: "atm5gwUV3CaVBIbzWZwf4s0kwb32", email: "henryjrmutale@gmail.com" },
      { uid: "V6j0HnQ45qhLlADOlO1GmmPq6473", email: "inertcognito@gmail.com" },
      { uid: "NOa7Wab5fxXAVhMO3kDOFhbKs4q2", email: "kmucystutorials@gmail.com" },
      { uid: "XdB7vxgWM3XJHU69LiSoYOuGiHB2", email: "0daysamhtkinertcognito@gmail.com" },
      { uid: "Uwdb7hUje4SKmdbgCYzdnZCCBdH3", email: "aaronnyakapanda@gmail.com" },
      { uid: "uyMvZAO3RwMuzLnNlIgxza5tS3t2", email: "williamziba404@gmail.com" },
      { uid: "HCjamDy0U2PDlvxdBikGdNRk4qq1", email: "kceeydc0396@gmail.com" },
      { uid: "tYOpdvwgldXO7v8Lt4wOs99S5vu2", email: "kulusiangambi589@gmail.com" },
      { uid: "T7zjUcAeBZelBOw6eFgDSa97btb2", email: "bubalajangazya@gmail.com" },
      { uid: "7JoixKgAxqQFbhGB0uOuMeBf1Gn1", email: "s0k0j4m3s@gmail.com", displayName: "James Soko" }
    ];

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userData of usersFromAuth) {
      try {
        const userRef = doc(db, "users", userData.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const username = userData.email.split('@')[0].toLowerCase();
          
          await setDoc(userRef, {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName || userData.email.split('@')[0],
            username: username,
            photoURL: null,
            role: 'user',
            totalPoints: 0,
            challengesSolved: 0,
            currentRank: 0,
            isActive: true,
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            firstName: userData.displayName?.split(' ')[0] || userData.email.split('@')[0],
            lastName: userData.displayName?.split(' ').slice(1).join(' ') || "User",
            bio: "",
            institution: "",
            country: "",
            permissions: ["read"],
            provider: 'password',
            emailVerified: false
          });

          // Create username document
          const usernameRef = doc(db, "usernames", username);
          await setDoc(usernameRef, {
            userId: userData.uid,
            username: username,
            createdAt: serverTimestamp(),
            email: userData.email
          });

          // Create leaderboard entry
          const leaderboardRef = doc(db, "leaderboard", userData.uid);
          await setDoc(leaderboardRef, {
            userId: userData.uid,
            username: username,
            displayName: userData.displayName || userData.email.split('@')[0],
            totalPoints: 0,
            challengesSolved: 0,
            rank: 999,
            lastUpdated: serverTimestamp(),
            avatar: null,
            country: null,
            institution: null,
            lastActive: serverTimestamp()
          });

          createdCount++;
          console.log(`✅ Created: ${userData.email} (${userData.uid})`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped (exists): ${userData.email}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error creating ${userData.email}:`, error);
      }
    }

    console.log(`
🎉 Migration Complete!
━━━━━━━━━━━━━━━━━━━━━━
✅ Created: ${createdCount} users
⏭️  Skipped: ${skippedCount} users
❌ Errors: ${errorCount} users
━━━━━━━━━━━━━━━━━━━━━━
    `);

    return { 
      success: true, 
      created: createdCount, 
      skipped: skippedCount, 
      errors: errorCount 
    };

  } catch (error: any) {
    console.error("❌ Migration failed:", error);
    return { success: false, error: error.message };
  }
};

export const checkMigrationStatus = async () => {
  try {
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);
    const firestoreCount = usersSnap.size;
    
    console.log(`
📊 Current Status:
━━━━━━━━━━━━━━━━━━━━━━
• Firestore Users: ${firestoreCount} documents
• Firebase Auth: ~30+ users
• Missing: ~${Math.max(0, 30 - firestoreCount)} users
━━━━━━━━━━━━━━━━━━━━━━
    `);
    
    return { firestoreCount, estimatedMissing: Math.max(0, 30 - firestoreCount) };
  } catch (error) {
    console.error("Error checking status:", error);
    return { firestoreCount: 0, estimatedMissing: 30 };
  }
};