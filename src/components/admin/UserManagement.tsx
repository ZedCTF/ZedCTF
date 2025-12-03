// src/components/admin/UserManagement.tsx
import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc 
} from "firebase/firestore";
import { db } from "../../firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Crown,
  GraduationCap,
  User,
  Play,
  Pause,
  Trash2,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserManagementProps {
  onBack: () => void;
}

interface User {
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt?: any;
  isActive?: boolean;
  requestedHostRole?: boolean;
  hostRequestReason?: string;
  hostRequestDate?: any;
  firstName?: string;
  lastName?: string;
  institution?: string;
  bio?: string;
  challengesSolved?: number;
}

const UserManagement = ({ onBack }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [pendingHostRequests, setPendingHostRequests] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users, activeTab]);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      console.log("📊 Fetched users:", usersData);
      
      setUsers(usersData);
      
      // Get pending host requests
      const pendingRequests = usersData.filter(user => user.requestedHostRole === true);
      setPendingHostRequests(pendingRequests);
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply tab filter
    if (activeTab === "admins") {
      filtered = filtered.filter(user => user.role === "admin");
    } else if (activeTab === "moderators") {
      filtered = filtered.filter(user => user.role === "moderator");
    } else if (activeTab === "students") {
      filtered = filtered.filter(user => user.role === "student");
    } else if (activeTab === "pending") {
      filtered = filtered.filter(user => user.requestedHostRole === true);
    } else if (activeTab === "active") {
      filtered = filtered.filter(user => user.isActive !== false);
    } else if (activeTab === "suspended") {
      filtered = filtered.filter(user => user.isActive === false);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      console.log("🔄 Attempting to update user role:", { userId, newRole });
      
      const updateData: any = { role: newRole };
      
      // If approving host request or making admin, clear the request
      if (newRole === "admin" || newRole === "moderator") {
        updateData.requestedHostRole = false;
        updateData.hostRequestReason = null;
      }

      // Update in Firestore
      await updateDoc(doc(db, "users", userId), updateData);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updateData } : user
      ));

      console.log("✅ User role updated successfully");
      setMessage({ type: 'success', text: `User role updated to ${newRole}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("❌ Error updating user role:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      setMessage({ type: 'error', text: `Failed to update user role: ${error.message}` });
    }
  };

  const handleHostRequest = async (userId: string, approved: boolean) => {
    try {
      console.log("🔄 Handling host request:", { userId, approved });
      
      const updateData: any = {
        requestedHostRole: false,
        hostRequestReason: null
      };

      if (approved) {
        updateData.role = "moderator";
      }

      await updateDoc(doc(db, "users", userId), updateData);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updateData } : user
      ));

      const action = approved ? "approved" : "rejected";
      setMessage({ type: 'success', text: `Host request ${action}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("Error handling host request:", error);
      setMessage({ type: 'error', text: `Failed to process host request: ${error.message}` });
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      console.log("🔄 Toggling user status:", { userId, currentStatus });
      
      const newStatus = !currentStatus;
      
      // Update in Firestore
      await updateDoc(doc(db, "users", userId), {
        isActive: newStatus
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: newStatus } : user
      ));

      const action = newStatus ? "activated" : "suspended";
      console.log("✅ User status updated successfully:", action);
      setMessage({ type: 'success', text: `User ${action}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("❌ Error updating user status:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      setMessage({ type: 'error', text: `Failed to update user status: ${error.message}` });
    }
  };

  // New function to delete user account
  const deleteUserAccount = async () => {
    if (!userToDelete) return;

    try {
      console.log("🗑️ Deleting user account:", userToDelete.id);

      // Delete from Firestore
      await deleteDoc(doc(db, "users", userToDelete.id));
      
      // Update local state
      setUsers(users.filter(user => user.id !== userToDelete.id));

      console.log("✅ User account deleted successfully");
      setMessage({ type: 'success', text: `Account for ${userToDelete.displayName || userToDelete.email} has been deleted` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("❌ Error deleting user account:", error);
      setMessage({ type: 'error', text: `Failed to delete account: ${error.message}` });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Function to open delete confirmation dialog
  const confirmDelete = (user: User) => {
    // Prevent admins from deleting themselves
    if (user.role === "admin") {
      setMessage({ 
        type: 'error', 
        text: 'You cannot delete an administrator account. Please demote to student first.' 
      });
      return;
    }
    
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "moderator": return "default";
      case "student": return "secondary";
      default: return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Crown className="w-3 h-3" />;
      case "moderator": return <Shield className="w-3 h-3" />;
      case "student": return <GraduationCap className="w-3 h-3" />;
      default: return <User className="w-3 h-3" />;
    }
  };

  const getStatusText = (user: User) => {
    if (user.requestedHostRole) return "Pending Host";
    if (user.isActive === false) return "Suspended";
    return "Active";
  };

  const getStatusBadgeVariant = (user: User) => {
    if (user.requestedHostRole) return "default";
    if (user.isActive === false) return "destructive";
    return "default";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-3">
            ← Back to Admin
          </Button>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles, permissions, and host requests
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{users.length}</div>
          <div className="text-sm text-muted-foreground">Total Users</div>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{users.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => u.role === "admin").length}
            </div>
            <div className="text-xs text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === "moderator").length}
            </div>
            <div className="text-xs text-muted-foreground">Moderators</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === "student").length}
            </div>
            <div className="text-xs text-muted-foreground">Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {pendingHostRequests.length}
            </div>
            <div className="text-xs text-muted-foreground">Pending Hosts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {users.filter(u => u.isActive === false).length}
            </div>
            <div className="text-xs text-muted-foreground">Suspended</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all" className="text-xs">All Users</TabsTrigger>
          <TabsTrigger value="admins" className="text-xs">Admins</TabsTrigger>
          <TabsTrigger value="moderators" className="text-xs">Moderators</TabsTrigger>
          <TabsTrigger value="students" className="text-xs">Students</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending {pendingHostRequests.length > 0 && `(${pendingHostRequests.length})`}
          </TabsTrigger>
          <TabsTrigger value="suspended" className="text-xs">Suspended</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {activeTab === "all" && "All Users"}
                    {activeTab === "admins" && "Administrators"}
                    {activeTab === "moderators" && "Moderators"}
                    {activeTab === "students" && "Students"}
                    {activeTab === "pending" && "Pending Host Requests"}
                    {activeTab === "suspended" && "Suspended Users"}
                  </CardTitle>
                  <CardDescription>
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{user.displayName || "No Name"}</p>
                          {user.role === "admin" && <Crown className="w-4 h-4 text-yellow-600" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        {user.institution && (
                          <p className="text-xs text-muted-foreground truncate">{user.institution}</p>
                        )}
                        
                        {/* Host request reason */}
                        {user.requestedHostRole && user.hostRequestReason && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <strong>Host Request:</strong> {user.hostRequestReason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          {user.role}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(user)}>
                          {getStatusText(user)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {/* Role selection */}
                      <select 
                        value={user.role} 
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="p-2 border rounded text-sm bg-background"
                      >
                        <option value="student">Student</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      {/* Host request actions */}
                      {user.requestedHostRole && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHostRequest(user.id, true)}
                            className="h-9 w-9 p-0 text-green-600 border-green-200"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHostRequest(user.id, false)}
                            className="h-9 w-9 p-0 text-red-600 border-red-200"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Suspend/Activate */}
                      {!user.requestedHostRole && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.isActive ?? true)}
                          className={`flex items-center gap-1 ${
                            user.isActive === false 
                              ? "text-green-600 border-green-200 hover:bg-green-50" 
                              : "text-red-600 border-red-200 hover:bg-red-50"
                          }`}
                        >
                          {user.isActive === false ? (
                            <>
                              <Play className="w-3 h-3" />
                              Activate
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3" />
                              Suspend
                            </>
                          )}
                        </Button>
                      )}
                      
                      {/* Delete button - Hidden for admins */}
                      {user.role !== "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDelete(user)}
                          className="h-9 w-9 p-0 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No users found matching your criteria.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-medium">
                Are you sure you want to delete this user account?
              </p>
              
              {userToDelete && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      {getRoleIcon(userToDelete.role)}
                    </div>
                    <div>
                      <p className="font-medium">{userToDelete.displayName || "No Name"}</p>
                      <p className="text-xs text-muted-foreground">{userToDelete.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Role:</span>
                      <Badge variant={getRoleBadgeVariant(userToDelete.role)} className="ml-2">
                        {userToDelete.role}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusBadgeVariant(userToDelete)} className="ml-2">
                        {getStatusText(userToDelete)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                <p className="text-sm text-red-700 font-medium">⚠️ This action cannot be undone.</p>
                <p className="text-xs text-red-600 mt-1">
                  All user data will be permanently deleted from the database.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUserAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;