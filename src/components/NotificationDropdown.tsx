// src/components/NotificationDropdown.tsx - MODAL VERSION (NO ROUTES)
import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  ExternalLink, 
  Clock,
  Mail,
  Shield,
  Calendar,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Filter,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  writeBatch,
  Timestamp,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

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

const NotificationDropdown = () => {
  const { user: currentUser } = useAuth();
  
  // Dropdown state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Full view modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [fullViewLoading, setFullViewLoading] = useState(false);
  const [fullViewLoadingMore, setFullViewLoadingMore] = useState(false);
  const [fullViewHasMore, setFullViewHasMore] = useState(true);
  const [fullViewLastDoc, setFullViewLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // Full view filters
  const [fullViewStatusFilter, setFullViewStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [fullViewTypeFilter, setFullViewTypeFilter] = useState<string>('all');
  const [fullViewPriorityFilter, setFullViewPriorityFilter] = useState<string>('all');
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

  // Fetch notifications for dropdown
  const fetchDropdownNotifications = async (initial = false) => {
    if (!currentUser) return;

    try {
      if (initial) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }

      let notificationsQuery;
      
      if (initial) {
        notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(15)
        );
      } else if (lastDocRef.current) {
        notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocRef.current),
          limit(10)
        );
      } else {
        return;
      }

      const snapshot = await getDocs(notificationsQuery);
      
      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      const newNotifications: Notification[] = snapshot.docs.map(documentToNotification);

      if (initial) {
        setNotifications(newNotifications);
        const unread = newNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      setHasMore(snapshot.docs.length === (initial ? 15 : 10));

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
  };

  // Fetch all notifications for full view
  const fetchAllNotifications = async (initial = true) => {
    if (!currentUser) return;

    try {
      if (initial) {
        setFullViewLoading(true);
        setFullViewLastDoc(null);
      } else {
        setFullViewLoadingMore(true);
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
      } else if (fullViewLastDoc) {
        q = query(
          notificationsRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          startAfter(fullViewLastDoc),
          limit(notificationsPerPage)
        );
      } else {
        return;
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setFullViewHasMore(false);
        return;
      }

      const newLastDoc = snapshot.docs[snapshot.docs.length - 1];
      setFullViewLastDoc(newLastDoc);
      const newNotifications: Notification[] = snapshot.docs.map(documentToNotification);

      if (initial) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      setFullViewHasMore(snapshot.docs.length === notificationsPerPage);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      if (initial) {
        setFullViewLoading(false);
      } else {
        setFullViewLoadingMore(false);
      }
    }
  };

  // Apply filters for full view
  useEffect(() => {
    if (!notifications.length) return;

    let filtered = [...notifications];

    // Apply status filter
    if (fullViewStatusFilter === 'read') {
      filtered = filtered.filter(n => n.read);
    } else if (fullViewStatusFilter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    }

    // Apply type filter
    if (fullViewTypeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === fullViewTypeFilter);
    }

    // Apply priority filter
    if (fullViewPriorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === fullViewPriorityFilter);
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
  }, [notifications, fullViewStatusFilter, fullViewTypeFilter, fullViewPriorityFilter, searchQuery, activeTab]);

  // Initial fetch for dropdown
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    fetchDropdownNotifications(true);
  }, [currentUser]);

  // Real-time listener
  useEffect(() => {
    if (!currentUser || !isDropdownOpen) return;

    const newNotificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(newNotificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newNotification = documentToNotification(change.doc);
          
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });
          
          setUnreadCount(prev => prev + 1);
          
          if (!isDropdownOpen) {
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
              action: {
                label: 'View',
                onClick: () => {
                  setIsDropdownOpen(true);
                  markAsRead(newNotification.id);
                }
              }
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, isDropdownOpen]);

  const loadMoreDropdown = () => {
    if (!loadingMore && hasMore) {
      fetchDropdownNotifications(false);
    }
  };

  const loadMoreFullView = () => {
    if (!fullViewLoadingMore && fullViewHasMore) {
      fetchAllNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser || unreadCount === 0) return;

    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(n => !n.read);
      
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      });

      await batch.commit();
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const markNotifications = async (ids: string[], read: boolean) => {
    if (!currentUser || ids.length === 0) return;

    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const notificationRef = doc(db, 'notifications', id);
        batch.update(notificationRef, { read });
      });

      await batch.commit();
      
      setNotifications(prev => 
        prev.map(n => ids.includes(n.id) ? { ...n, read } : n)
      );

      // Update unread count
      const markedReadCount = ids.length;
      if (read) {
        setUnreadCount(prev => Math.max(0, prev - markedReadCount));
      } else {
        // If marking as unread, we need to check if they were actually read before
        const previouslyRead = notifications.filter(n => 
          ids.includes(n.id) && n.read
        ).length;
        setUnreadCount(prev => prev + previouslyRead);
      }

      setSelectedNotifications([]);
      setSelectAll(false);

      toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} marked as ${read ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('Error marking notifications:', error);
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotifications = async (ids: string[]) => {
    if (!currentUser || ids.length === 0) return;

    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const notificationRef = doc(db, 'notifications', id);
        batch.delete(notificationRef);
      });

      await batch.commit();
      
      const deletedNotifications = notifications.filter(n => ids.includes(n.id));
      const unreadDeletedCount = deletedNotifications.filter(n => !n.read).length;
      
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setUnreadCount(prev => Math.max(0, prev - unreadDeletedCount));
      setSelectedNotifications([]);
      setSelectAll(false);

      toast.success(`${ids.length} notification${ids.length > 1 ? 's' : ''} deleted`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    await deleteNotifications([notificationId]);
  };

  const refreshNotifications = async () => {
    if (isModalOpen) {
      await fetchAllNotifications(true);
    } else {
      await fetchDropdownNotifications(true);
    }
    toast.success('Notifications refreshed');
  };

  const openFullView = async () => {
    setIsDropdownOpen(false);
    setIsModalOpen(true);
    await fetchAllNotifications(true);
  };

  const closeFullView = () => {
    setIsModalOpen(false);
    setSelectedNotifications([]);
    setSelectAll(false);
    setSearchQuery('');
    setFullViewStatusFilter('all');
    setFullViewTypeFilter('all');
    setFullViewPriorityFilter('all');
    setActiveTab('all');
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
    setSelectAll(!selectAll);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Bell className="w-4 h-4 text-blue-600" />;
      case 'new_challenge':
        return <Shield className="w-4 h-4 text-green-600" />;
      case 'new_event':
      case 'event_starting':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'challenge_solved':
        return <Check className="w-4 h-4 text-purple-600" />;
      case 'admin':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-gray-600" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-amber-500 bg-amber-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

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
        day: 'numeric' 
      });
    } catch {
      return 'Recently';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.data?.challengeId) {
      window.open(`/challenge/${notification.data.challengeId}`, '_blank');
    } else if (notification.data?.eventId) {
      window.open(`/event/${notification.data.eventId}`, '_blank');
    } else if (notification.data?.link) {
      window.open(notification.data.link, '_blank');
    }
    
    setIsDropdownOpen(false);
  };

  const handleFullViewNotificationClick = (notification: Notification) => {
    if (autoMarkRead && !notification.read) {
      markNotifications([notification.id], true);
    }
    
    if (notification.data?.challengeId) {
      window.open(`/challenge/${notification.data.challengeId}`, '_blank');
    } else if (notification.data?.eventId) {
      window.open(`/event/${notification.data.eventId}`, '_blank');
    } else if (notification.data?.link) {
      window.open(notification.data.link, '_blank');
    }
  };

  // Filter notifications for dropdown
  const dropdownFilteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  // Stats for full view
  const totalNotifications = notifications.length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;
  const todayCount = notifications.filter(n => {
    const today = new Date();
    const notifDate = n.createdAt.toDate();
    return notifDate.toDateString() === today.toDateString();
  }).length;

  if (!currentUser) return null;

  return (
    <>
      {/* Dropdown Button */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-accent"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-96 max-h-[80vh] p-0" align="end" forceMount>
          <div className="sticky top-0 z-10 bg-background border-b">
            <DropdownMenuLabel className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshNotifications}
                  className="h-7 w-7 p-0"
                  title="Refresh"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 text-xs hover:bg-green-500/10 hover:text-green-600"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openFullView}
                  className="h-7 text-xs"
                >
                  View all
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </DropdownMenuLabel>
            
            {/* Filters */}
            <div className="px-4 pb-3 space-y-2">
              <div className="flex gap-2">
                <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                  <SelectTrigger className="h-7 text-xs w-[110px]">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-7 text-xs w-[130px]">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="announcement">Announcements</SelectItem>
                    <SelectItem value="new_challenge">New Challenges</SelectItem>
                    <SelectItem value="new_event">New Events</SelectItem>
                    <SelectItem value="challenge_solved">Solved</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DropdownMenuSeparator />
          </div>

          <ScrollArea className="h-[400px]" ref={scrollAreaRef}>
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading notifications....</p>
              </div>
            ) : dropdownFilteredNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {filter === 'all' && typeFilter === 'all' ? "No notifications yet" : "No notifications match your filter"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll see announcements here
                </p>
                {(filter !== 'all' || typeFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setFilter('all');
                      setTypeFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <DropdownMenuGroup className="p-2">
                {dropdownFilteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`mb-2 rounded-lg border ${getPriorityColor(notification.priority)} ${
                      !notification.read ? 'border-primary/30' : ''
                    }`}
                  >
                    <DropdownMenuItem
                      className={`flex flex-col items-start p-3 cursor-pointer h-auto ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start w-full gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {notification.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs h-5">
                                  Important
                                </Badge>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {notification.data && (
                            <div className="text-xs space-y-1 mb-2 text-muted-foreground">
                              {notification.data.challengeTitle && (
                                <p className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Challenge: <span className="font-medium">{notification.data.challengeTitle}</span>
                                </p>
                              )}
                              {notification.data.eventTitle && (
                                <p className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Event: <span className="font-medium">{notification.data.eventTitle}</span>
                                </p>
                              )}
                              {notification.data.points && (
                                <p className="text-green-600 font-medium">
                                  +{notification.data.points} points
                                </p>
                              )}
                              {notification.data.sentByAdmin && (
                                <p className="text-xs text-blue-600">
                                  From: {notification.data.sentByAdmin}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(notification.createdAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs hover:bg-green-500/10 hover:text-green-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreDropdown}
                      disabled={loadingMore}
                      className="w-full"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More Notifications'
                      )}
                    </Button>
                  </div>
                )}
              </DropdownMenuGroup>
            )}
          </ScrollArea>

          <DropdownMenuSeparator />
          <div className="p-2">
            <Button 
              variant="outline" 
              className="w-full justify-center text-sm"
              onClick={openFullView}
            >
              Open Notification Center
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Full View Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">Notification Center</DialogTitle>
            <DialogDescription>
              Manage all your notifications in one place
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{totalNotifications}</p>
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
                      <p className="text-2xl font-bold text-red-600">{highPriorityCount}</p>
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
                      <p className="text-2xl font-bold text-green-600">{todayCount}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshNotifications}
                  disabled={fullViewLoading}
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
                <Select
                  value={notificationsPerPage.toString()}
                  onValueChange={(value) => setNotificationsPerPage(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10/page</SelectItem>
                    <SelectItem value="20">20/page</SelectItem>
                    <SelectItem value="50">50/page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                <Select value={fullViewStatusFilter} onValueChange={(value: any) => setFullViewStatusFilter(value)}>
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
                <Select value={fullViewTypeFilter} onValueChange={setFullViewTypeFilter}>
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
                <Select value={fullViewPriorityFilter} onValueChange={setFullViewPriorityFilter}>
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

            {/* Auto-mark read setting */}
            <div className="flex items-center space-x-2 mb-6 p-3 bg-muted/30 rounded-lg">
              <Switch
                id="auto-mark-read"
                checked={autoMarkRead}
                onCheckedChange={setAutoMarkRead}
              />
              <Label htmlFor="auto-mark-read" className="text-sm">
                Automatically mark notifications as read when clicked
              </Label>
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
            <ScrollArea className="h-[400px]">
              {fullViewLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || fullViewStatusFilter !== 'all' || fullViewTypeFilter !== 'all' || fullViewPriorityFilter !== 'all'
                      ? "No notifications match your current filters."
                      : "You're all caught up! No notifications right now."}
                  </p>
                  {(searchQuery || fullViewStatusFilter !== 'all' || fullViewTypeFilter !== 'all' || fullViewPriorityFilter !== 'all') && (
                    <Button onClick={() => {
                      setSearchQuery('');
                      setFullViewStatusFilter('all');
                      setFullViewTypeFilter('all');
                      setFullViewPriorityFilter('all');
                      setActiveTab('all');
                    }}>
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
                      onClick={() => handleFullViewNotificationClick(notification)}
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.type.replace('_', ' ')}
                            </Badge>
                            {notification.data?.link && (
                              <ExternalLink className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More */}
                  {fullViewHasMore && (
                    <div className="text-center py-6">
                      <Button
                        variant="outline"
                        onClick={loadMoreFullView}
                        disabled={fullViewLoadingMore}
                      >
                        {fullViewLoadingMore ? (
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
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default NotificationDropdown;