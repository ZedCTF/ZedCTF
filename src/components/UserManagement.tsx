// src/components/UserManagement.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const updateUserRole = async (userId, newRole) => {
    await updateDoc(doc(db, "users", userId), {
      role: newRole
    });
    // Refresh users list
  };

  return (
    <div>
      <h2>User Management ({users.length} users)</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.displayName}</td>
              <td>{user.email}</td>
              <td>
                <select 
                  value={user.role} 
                  onChange={(e) => updateUserRole(user.id, e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>
                <button>View Details</button>
                <button>Suspend</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};