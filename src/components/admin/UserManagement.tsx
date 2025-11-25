// src/components/admin/UserManagement.tsx
import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, UserPlus, Shield, Users, Clock, CheckCircle, XCircle, Mail, Crown } from "lucide-react";

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
}

const UserManagement = ({ onBack }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [pendingHostRequests, setPendingHostRequests] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const updateData: any = { role: newRole };
      
      // If approving host request or making admin, clear the request
      if (newRole === "admin" || newRole === "moderator") {
        updateData.requestedHostRole = false;
        updateData.hostRequestReason = null;
      }

      await updateDoc(doc(db, "users", userId), updateData);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updateData } : user
      ));

      setMessage({ type: 'success', text: `User role updated to ${newRole}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error updating user role:", error);
      setMessage({ type: 'error', text: 'Failed to update user role' });
    }
  };

  const handleHostRequest = async (userId: string, approved: boolean) => {
    try {
      const updateData = {
        requestedHostRole: false,
        hostRequestReason: null
      };

      if (approved) {
        updateData.role = "moderator"; // Give moderator privileges for hosting
      }

      await updateDoc(doc(db, "users", userId), updateData);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updateData } : user
      ));

      const action = approved ? "approved" : "rejected";
      setMessage({ type: 'success', text: `Host request ${action}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error handling host request:", error);
      setMessage({ type: 'error', text: 'Failed to process host request' });
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isActive: !currentStatus
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: !currentStatus } : user
      ));

      const action = !currentStatus ? "activated" : "suspended";
      setMessage({ type: 'success', text: `User ${action}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error updating user status:", error);
      setMessage({ type: 'error', text: 'Failed to update user status' });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "moderator": return "default";
      default: return "secondary";
    }
  };

  const getStatusBadgeVariant = (user: User) => {
    if (user.requestedHostRole) return "default";
    if (user.isActive === false) return "secondary";
    return "default";
  };

  const getStatusText = (user: User) => {
    if (user.requestedHostRole) return "Pending Host";
    if (user.isActive === false) return "Suspended";
    return "Active";
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{users.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === "admin").length}
            </div>
            <div className="text-xs text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === "moderator").length}
            </div>
            <div className="text-xs text-muted-foreground">Moderators</div>
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
            <div className="text-2xl font-bold text-red-600">
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
          <TabsTrigger value="pending" className="text-xs">
            Pending Hosts {pendingHostRequests.length > 0 && `(${pendingHostRequests.length})`}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
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
                    {activeTab === "pending" && "Pending Host Requests"}
                    {activeTab === "active" && "Active Users"}
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
                      <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        {user.role === "admin" ? (
                          <Crown className="w-5 h-5 text-primary" />
                        ) : (
                          <span className="font-medium text-sm">
                            {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{user.displayName || "No Name"}</p>
                          {user.role === "admin" && <Crown className="w-4 h-4 text-yellow-600" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        
                        {/* Host request reason */}
                        {user.requestedHostRole && user.hostRequestReason && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <strong>Host Request:</strong> {user.hostRequestReason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
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
                        className="p-2 border rounded text-sm"
                      >
                        <option value="user">User</option>
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
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHostRequest(user.id, false)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
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
                          onClick={() => toggleUserStatus(user.id, user.isActive || true)}
                          className={user.isActive === false ? "text-green-600" : "text-red-600"}
                        >
                          {user.isActive === false ? "Activate" : "Suspend"}
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
    </div>
  );
};

export default UserManagement;