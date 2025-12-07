// src/components/admin/AdminNotifications.tsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  where,
  Timestamp,
  writeBatch,
  doc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Send, 
  Users, 
  Mail, 
  Bell, 
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  History,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  displayName?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  emailNotifications?: boolean;
  createdAt: Timestamp;
}

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: 'email' | 'in_app' | 'both';
  sentBy: string;
  sentTo: number; // Number of users
  sentAt: Timestamp;
  status: 'sent' | 'failed' | 'partial';
}

interface AdminNotificationsProps {
  onBack?: () => void;
}

const AdminNotifications: React.FC<AdminNotificationsProps> = ({ onBack }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  
  // Notification form state
  const [notificationType, setNotificationType] = useState<'in_app' | 'email' | 'both'>('both');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);

  // Check if current user is admin or moderator
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    checkAdminStatus();
    fetchUsers();
    fetchNotificationHistory();
  }, [currentUser]);

  const checkAdminStatus = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', currentUser.uid)
      ));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        const role = userData.role || 'user';
        const isAdmin = role === 'admin';
        const isModerator = role === 'moderator' || role === 'admin';
        
        setUserRole(role);
        setHasAdminAccess(isAdmin || isModerator);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, 'users'),
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const usersData: User[] = [];
      
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          ...data
        } as User);
      });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationHistory = async () => {
    if (!currentUser) return;
    
    try {
      const historyQuery = query(
        collection(db, 'notificationHistory'),
        where('sentBy', '==', currentUser.uid),
        where('sentAt', '>=', Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) // Last 30 days
      );
      
      const historySnapshot = await getDocs(historyQuery);
      const historyData: NotificationHistory[] = [];
      
      historySnapshot.forEach(doc => {
        const data = doc.data();
        historyData.push({
          id: doc.id,
          ...data
        } as NotificationHistory);
      });
      
      setNotificationHistory(historyData.sort((a, b) => 
        b.sentAt.toMillis() - a.sentAt.toMillis()
      ));
    } catch (error) {
      console.error('Error fetching notification history:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (sendToAll) return;
    
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const sendNotification = async () => {
    if (!currentUser || !hasAdminAccess) {
      toast.error('Admin or moderator privileges required');
      return;
    }

    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);

    try {
      // Determine target users
      const targetUsers = sendToAll 
        ? users 
        : users.filter(user => selectedUsers.has(user.id));
      
      if (targetUsers.length === 0) {
        toast.error('No users selected');
        return;
      }

      // Create notification batch
      const batch = writeBatch(db);
      let successfulSends = 0;

      // Prepare notification data
      const notificationData = {
        title: title.trim(),
        message: message.trim(),
        type: 'announcement',
        priority: priority,
        data: {},
        read: false,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
      };

      // Send in-app notifications
      if (notificationType === 'in_app' || notificationType === 'both') {
        targetUsers.forEach(user => {
          const notificationRef = doc(collection(db, 'notifications'));
          batch.set(notificationRef, {
            ...notificationData,
            userId: user.id
          });
          successfulSends++;
        });
      }

      // Send email notifications (would require backend integration)
      if (notificationType === 'email' || notificationType === 'both') {
        // This would call your backend email service
        await sendEmailNotifications(targetUsers, title, message);
      }

      // Commit batch
      await batch.commit();

      // Save to history
      const historyRef = doc(collection(db, 'notificationHistory'));
      await batch.set(historyRef, {
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        sentBy: currentUser.uid,
        sentTo: targetUsers.length,
        sentAt: Timestamp.now(),
        status: 'sent'
      });

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedUsers(new Set());
      
      // Refresh history
      fetchNotificationHistory();

      toast.success(`Notification sent to ${targetUsers.length} users successfully!`);
      
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error(`Failed to send notification: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendEmailNotifications = async (users: User[], subject: string, body: string) => {
    // This would call your backend API to send emails
    // For now, we'll just simulate it
    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: users.map(u => ({ email: u.email, name: u.displayName })),
          subject,
          body,
          type: 'notification'
        }),
      });

      if (!response.ok) {
        throw new Error('Email service failed');
      }

      return true;
    } catch (error) {
      console.error('Error sending emails:', error);
      // Continue with in-app notifications even if emails fail
      return false;
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-yellow-500">Partial</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'in_app':
        return <Bell className="w-4 h-4" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Mail className="w-3 h-3" />
            <Bell className="w-3 h-3" />
          </div>
        );
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // If not admin or moderator, show warning
  if (!hasAdminAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Admin Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Send announcements to all users
            </p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Access Denied</strong> - This section is only available to administrators and moderators.
            Please contact a system administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER WITH BACK BUTTON */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Admin Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Send announcements to all users via email or in-app notifications
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={userRole === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                {userRole === 'admin' ? 'Administrator' : 'Moderator'}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {users.length} Active Users
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Exit Preview
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Preview Mode
              </>
            )}
          </Button>
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send" className="gap-2">
            <Send className="w-4 h-4" />
            Send Notification
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History ({notificationHistory.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          {/* Preview Card */}
          {previewMode && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>How your notification will appear to users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{title || 'Notification Title'}</h3>
                    <Badge variant="outline" className={`
                      ${priority === 'high' ? 'bg-red-500/10 text-red-600' : ''}
                      ${priority === 'medium' ? 'bg-yellow-500/10 text-yellow-600' : ''}
                      ${priority === 'low' ? 'bg-green-500/10 text-green-600' : ''}
                    `}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                    </Badge>
                  </div>
                  <div className="p-3 bg-card rounded-lg border">
                    <p className="text-sm">{message || 'Notification message will appear here...'}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Just now
                    </div>
                    <div className="flex items-center gap-1">
                      {notificationType === 'email' && <Mail className="w-3 h-3" />}
                      {notificationType === 'in_app' && <Bell className="w-3 h-3" />}
                      {notificationType === 'both' && (
                        <>
                          <Mail className="w-3 h-3" />
                          <Bell className="w-3 h-3" />
                        </>
                      )}
                      {notificationType === 'email' ? 'Email Only' : 
                       notificationType === 'in_app' ? 'In-App Only' : 'Email + In-App'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Notification</CardTitle>
              <CardDescription>
                Send announcements to users via email, in-app notifications, or both
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., New Challenge Available!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {title.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message"> Message </Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your announcement message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {message.length}/500 characters
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Notification Type</Label>
                    <Select value={notificationType} onValueChange={(value: any) => setNotificationType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Email & In-App</SelectItem>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="in_app">In-App Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="send-to-all">Send to all active users</Label>
                      <p className="text-sm text-muted-foreground">
                        {sendToAll ? `All ${users.length} users will receive this` : 'Select specific users below'}
                      </p>
                    </div>
                    <Switch
                      id="send-to-all"
                      checked={sendToAll}
                      onCheckedChange={setSendToAll}
                    />
                  </div>

                  {!sendToAll && (
                    <div className="space-y-3">
                      <Label>Select Users ({selectedUsers.size} selected)</Label>
                      <ScrollArea className="h-48 rounded-md border p-4">
                        <div className="space-y-2">
                          {users.map(user => (
                            <div
                              key={user.id}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                                selectedUsers.has(user.id)
                                  ? 'bg-primary/10 border border-primary/20'
                                  : 'hover:bg-accent'
                              }`}
                              onClick={() => toggleUserSelection(user.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {user.displayName?.charAt(0) || user.email.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {user.displayName || 'No name'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                              {selectedUsers.has(user.id) && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allIds = new Set(users.map(u => u.id));
                            setSelectedUsers(allIds);
                          }}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUsers(new Set())}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {sendToAll ? (
                    <span>This will be sent to all {users.length} active users</span>
                  ) : (
                    <span>This will be sent to {selectedUsers.size} selected users</span>
                  )}
                </div>
                <Button
                  onClick={sendNotification}
                  disabled={sending || !title.trim() || !message.trim()}
                  className="gap-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Notification
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                Recent notifications sent by you (last 30 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notification history found</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {notificationHistory.map(history => (
                      <div
                        key={history.id}
                        className="p-4 rounded-lg border flex items-start justify-between hover:bg-accent/50"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              {getTypeIcon(history.type)}
                            </div>
                            <div>
                              <h4 className="font-semibold">{history.title}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                {getStatusBadge(history.status)}
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(history.sentAt)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  To: {history.sentTo} users
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground ml-12">
                            {history.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>
                {users.length} users who can receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {users.map(user => (
                      <div
                        key={user.id}
                        className="p-3 rounded-lg border flex items-center justify-between hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="font-medium">
                              {user.displayName?.charAt(0) || user.email.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.displayName || 'No name'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs space-y-1">
                            <Badge variant="outline" className={`
                              ${user.emailNotifications ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}
                            `}>
                              {user.emailNotifications ? 'Email Enabled' : 'Email Disabled'}
                            </Badge>
                            {user.isAdmin && (
                              <Badge variant="secondary" className="ml-2">
                                Admin
                              </Badge>
                            )}
                            {user.isModerator && !user.isAdmin && (
                              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">
                                Moderator
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined: {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNotifications;