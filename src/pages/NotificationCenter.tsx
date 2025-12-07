// src/pages/NotificationCenter.tsx - UPDATED VERSION
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  X,
  Clock,
  Mail,
  Shield,
  Calendar,
  AlertCircle,
  Filter,
  Trash2,
  ChevronLeft,
  Eye,
  EyeOff,
  Archive,
  ExternalLink,
  Search,
  Settings,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  updateDoc,
  doc,
  writeBatch,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'new_challenge' | 'new_event' | 'event_starting' | 'challenge_solved' | 'admin' | 'email';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  createdAt: Timestamp;
  data?: {
    challengeId?: string;
    eventId?: string;
    points?: number;
    challengeTitle?: string;
    eventTitle?: string;
    sentByAdmin?: string;
    link?: string;
  };
}

// Helper function to convert Firestore document to Notification
const documentToNotification = (doc: any): Notification => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data?.title || '',
    message: data?.message || '',
    type: data?.type || 'announcement',
    priority: data?.priority || 'low',
    read: data?.read || false,
    createdAt: data?.createdAt || Timestamp.now(),
    data: data?.data || {}
  };
};

const NotificationCenter = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Bulk actions
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [markAction, setMarkAction] = useState<'read' | 'unread'>('read');
  
  // Settings
  const [autoMarkRead, setAutoMarkRead] = useState(true);
  const [notificationsPerPage, setNotificationsPerPage] = useState(20);

  // Fetch notifications
  const fetchNotifications = useCallback(async (initial = true) => {
    if (!currentUser) return;

    try {
      if (initial) {
        setLoading(true);
        setLastDoc(null);
      } else {
        setLoadingMore(true);
      }

      let q;
      const notificationsRef = collection(db, 'notifications');
      
      if (initial) {
        q = query(
          notificationsRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(notificationsPerPage)
        );
      } else if (lastDoc) {
        q = query(
          notificationsRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(notificationsPerPage)
        );
      } else {
        return;
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      const newLastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastDoc(newLastDoc);

      // Use helper function to convert documents
      const newNotifications: Notification[] = snapshot.docs.map(documentToNotification);

      if (initial) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      setHasMore(snapshot.docs.length === notificationsPerPage);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      if (initial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [currentUser, lastDoc, notificationsPerPage]);

  // Apply filters
  useEffect(() => {
    if (!notifications.length) return;

    let filtered = [...notifications];

    // Apply status filter
    if (statusFilter === 'read') {
      filtered = filtered.filter(n => n.read);
    } else if (statusFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query) ||
        n.data?.challengeTitle?.toLowerCase().includes(query) ||
        n.data?.eventTitle?.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (activeTab === 'important') {
      filtered = filtered.filter(n => n.priority === 'high');
    } else if (activeTab === 'challenges') {
      filtered = filtered.filter(n => 
        n.type === 'new_challenge' || n.type === 'challenge_solved'
      );
    } else if (activeTab === 'events') {
      filtered = filtered.filter(n => 
        n.type === 'new_event' || n.type === 'event_starting'
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, statusFilter, typeFilter, priorityFilter, searchQuery, activeTab]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Load more notifications
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(false);
    }
  };

  // Mark notifications as read/unread
  const markNotifications = async (ids: string[], read: boolean) => {
    if (!currentUser || ids.length === 0) return;

    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const notificationRef = doc(db, 'notifications', id);
        batch.update(notificationRef, { read });
      });

      await batch.commit();
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ids.includes(n.id) ? { ...n, read } : n)
      );

      // Clear selection
      setSelectedNotifications([]);
      setSelectAll(false);

      toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} marked as ${read ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('Error marking notifications:', error);
      toast.error('Failed to update notifications');
    }
  };

  // Delete notifications
  const deleteNotifications = async (ids: string[]) => {
    if (!currentUser || ids.length === 0) return;

    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const notificationRef = doc(db, 'notifications', id);
        batch.delete(notificationRef);
      });

      await batch.commit();
      
      // Update local state
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      
      // Clear selection
      setSelectedNotifications([]);
      setSelectAll(false);

      toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} deleted`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await markNotifications(unreadIds, true);
  };

  // Toggle selection
  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (autoMarkRead && !notification.read) {
      markNotifications([notification.id], true);
    }
    
    if (notification.data?.challengeId) {
      navigate(`/challenge/${notification.data.challengeId}`);
    } else if (notification.data?.eventId) {
      navigate(`/event/${notification.data.eventId}`);
    } else if (notification.data?.link) {
      window.open(notification.data.link, '_blank');
    }
  };

  // Format time
  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Bell className="w-5 h-5 text-blue-600" />;
      case 'new_challenge':
        return <Shield className="w-5 h-5 text-green-600" />;
      case 'new_event':
      case 'event_starting':
        return <Calendar className="w-5 h-5 text-amber-600" />;
      case 'challenge_solved':
        return <Check className="w-5 h-5 text-purple-600" />;
      case 'admin':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'email':
        return <Mail className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge className="text-xs bg-amber-500">Medium</Badge>;
      case 'low':
        return <Badge className="text-xs bg-green-500">Low</Badge>;
      default:
        return null;
    }
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Badge variant="outline" className="text-xs">Announcement</Badge>;
      case 'new_challenge':
        return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700">Challenge</Badge>;
      case 'new_event':
      case 'event_starting':
        return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700">Event</Badge>;
      case 'challenge_solved':
        return <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700">Solved</Badge>;
      case 'admin':
        return <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700">Admin</Badge>;
      case 'email':
        return <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-700">Email</Badge>;
      default:
        return null;
    }
  };

  // Refresh notifications
  const refreshNotifications = () => {
    fetchNotifications(true);
    toast.success('Notifications refreshed');
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
    setActiveTab('all');
  };

  // Unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Please log in to view notifications</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="md:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
              <p className="text-muted-foreground">
                Manage your notifications and stay updated
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshNotifications}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={markAllAsRead}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                </div>
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-red-600">
                    {notifications.filter(n => n.priority === 'high').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold text-green-600">
                    {notifications.filter(n => {
                      const today = new Date();
                      const notifDate = n.createdAt.toDate();
                      return notifDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Tabs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Your Notifications</CardTitle>
                <CardDescription>
                  {selectedNotifications.length > 0 
                    ? `${selectedNotifications.length} selected` 
                    : `${filteredNotifications.length} notifications found`}
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full md:w-[250px]"
                  />
                </div>
                
                {/* Settings Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="auto-mark-read" className="text-sm">
                          Auto mark as read
                        </Label>
                        <Switch
                          id="auto-mark-read"
                          checked={autoMarkRead}
                          onCheckedChange={setAutoMarkRead}
                        />
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <Label htmlFor="per-page" className="text-sm mb-2 block">
                        Notifications per page
                      </Label>
                      <Select
                        value={notificationsPerPage.toString()}
                        onValueChange={(value) => setNotificationsPerPage(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Quick Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
                <TabsTrigger value="important">Important</TabsTrigger>
                <TabsTrigger value="challenges">Challenges</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="status-filter" className="mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread Only</SelectItem>
                    <SelectItem value="read">Read Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type-filter" className="mb-2 block">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="announcement">Announcements</SelectItem>
                    <SelectItem value="new_challenge">New Challenges</SelectItem>
                    <SelectItem value="challenge_solved">Solved Challenges</SelectItem>
                    <SelectItem value="new_event">New Events</SelectItem>
                    <SelectItem value="event_starting">Event Starting</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority-filter" className="mb-2 block">Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger id="priority-filter">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMarkAction('read');
                      setShowMarkDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Mark as read
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMarkAction('unread');
                      setShowMarkDialog(true);
                    }}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Mark as unread
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Notifications List */}
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                      ? "No notifications match your current filters."
                      : "You're all caught up! No notifications right now."}
                  </p>
                  {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all') && (
                    <Button onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All */}
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectAll && filteredNotifications.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded"
                      />
                      <Label className="text-sm font-medium">
                        {selectAll ? 'Deselect all' : 'Select all'}
                      </Label>
                    </div>
                  </div>

                  {/* Notifications */}
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group flex items-start gap-4 p-4 rounded-lg border ${
                        !notification.read ? 'border-primary/30 bg-primary/5' : 'border-border'
                      } hover:bg-accent transition-colors cursor-pointer`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleNotificationSelection(notification.id);
                        }}
                        className="h-4 w-4 mt-1"
                      />

                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base">
                              {notification.title}
                            </h4>
                            {getPriorityBadge(notification.priority)}
                            {getTypeBadge(notification.type)}
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotifications([notification.id], !notification.read);
                              }}
                              title={notification.read ? 'Mark as unread' : 'Mark as read'}
                            >
                              {notification.read ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotifications([notification.id]);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-3">
                          {notification.message}
                        </p>

                        {notification.data && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {notification.data.challengeTitle && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                {notification.data.challengeTitle}
                              </Badge>
                            )}
                            {notification.data.eventTitle && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {notification.data.eventTitle}
                              </Badge>
                            )}
                            {notification.data.points && (
                              <Badge className="text-xs bg-green-500">
                                +{notification.data.points} points
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(notification.createdAt)}
                            </span>
                            {notification.data?.sentByAdmin && (
                              <span>From: {notification.data.sentByAdmin}</span>
                            )}
                          </div>
                          {notification.data?.link && (
                            <ExternalLink className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <div className="text-center py-6">
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                            Loading more...
                          </>
                        ) : (
                          'Load More Notifications'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNotifications(selectedNotifications)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark as {markAction === 'read' ? 'Read' : 'Unread'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedNotifications.length} notification{selectedNotifications.length > 1 ? 's' : ''} as {markAction}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => markNotifications(selectedNotifications, markAction === 'read')}
            >
              Mark as {markAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificationCenter;