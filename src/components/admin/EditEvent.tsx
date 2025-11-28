// src/components/admin/EditEvent.tsx
import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthContext } from "../../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Trophy, 
  Shield,
  ArrowLeft,
  Save,
  Clock,
  DollarSign,
  User,
  Users as TeamIcon,
  Infinity
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface Event {
  id: string;
  name: string;
  title?: string;
  description?: string;
  startDate: string;
  endDate: string;
  participants: string[];
  totalParticipants?: number;
  maxParticipants?: number;
  challengeCount?: number;
  registeredUsers?: string[];
  createdBy?: "admin" | "user";
  createdById?: string;
  location?: string;
  rules?: string;
  prizes?: string;
  status?: string;
  hostingFee?: number;
  hostingPaymentStatus?: string;
  participationType?: "individual" | "team";
  requiresParticipantPayment?: boolean;
  individualPrice?: number;
  currency?: string;
}

interface EditEventProps {
  event: Event;
  onBack: () => void;
  onSave: (eventId: string, updatedEvent: Partial<Event>) => void;
}

const EditEvent = ({ event, onBack, onSave }: EditEventProps) => {
  const { user } = useAuthContext();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  
  // Convert Firestore timestamp strings to Date objects
  const parseDateFromFirestore = (dateString: string): Date => {
    try {
      return new Date(dateString);
    } catch {
      return new Date();
    }
  };

  const [formData, setFormData] = useState({
    name: event.name || "",
    title: event.title || "",
    description: event.description || "",
    location: event.location || "",
    rules: event.rules || "",
    prizes: event.prizes || "",
    maxParticipants: event.maxParticipants || 0,
    participationType: event.participationType || "individual",
    requiresParticipantPayment: event.requiresParticipantPayment || false,
    individualPrice: event.individualPrice || 0,
    currency: event.currency || "ZMW",
    status: event.status || "upcoming",
    startDate: parseDateFromFirestore(event.startDate),
    endDate: parseDateFromFirestore(event.endDate),
    startTime: format(parseDateFromFirestore(event.startDate), "HH:mm"),
    endTime: format(parseDateFromFirestore(event.endDate), "HH:mm")
  });

  // Fetch user role from Firestore
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || "user");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole("user");
      }
    };

    fetchUserRole();
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Combine date and time into a single Date object
  const combineDateAndTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Event name is required' });
      return;
    }

    // Validate dates
    if (!formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      setMessage({ type: 'error', text: 'Start date, end date, and times are required' });
      return;
    }

    const startDateTime = combineDateAndTime(formData.startDate, formData.startTime);
    const endDateTime = combineDateAndTime(formData.endDate, formData.endTime);

    if (endDateTime <= startDateTime) {
      setMessage({ type: 'error', text: 'End date must be after start date' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Prepare update data based on user permissions
      const isAdmin = userRole === 'admin' || userRole === 'moderator';
      const isOwner = user && event.createdById === user.uid;
      
      let updateData: Partial<Event> = {};

      if (isAdmin) {
        // Admins can update all fields including dates
        updateData = {
          name: formData.name.trim(),
          title: formData.title.trim() || null,
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          rules: formData.rules.trim() || null,
          prizes: formData.prizes.trim() || null,
          maxParticipants: formData.maxParticipants > 0 ? formData.maxParticipants : null,
          participationType: formData.participationType,
          requiresParticipantPayment: formData.requiresParticipantPayment,
          individualPrice: formData.requiresParticipantPayment ? formData.individualPrice : null,
          currency: formData.requiresParticipantPayment ? formData.currency : null,
          status: formData.status,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString()
        };
      } else if (isOwner) {
        // Event owners can update basic fields and dates
        updateData = {
          name: formData.name.trim(),
          title: formData.title.trim() || null,
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          rules: formData.rules.trim() || null,
          prizes: formData.prizes.trim() || null,
          participationType: formData.participationType,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString()
        };
        
        // Add optional fields only if they're being changed to valid values
        if (formData.maxParticipants > 0) {
          updateData.maxParticipants = formData.maxParticipants;
        }
        
        // Payment settings - only include if they match the security rules constraints
        if (formData.requiresParticipantPayment !== undefined) {
          updateData.requiresParticipantPayment = formData.requiresParticipantPayment;
        }
        
        if (formData.requiresParticipantPayment) {
          updateData.individualPrice = formData.individualPrice;
          updateData.currency = formData.currency;
        }
      }

      // Update in Firestore
      await updateDoc(doc(db, "events", event.id), updateData);
      
      setMessage({ type: 'success', text: 'Event updated successfully!' });
      onSave(event.id, updateData);
      
    } catch (error: any) {
      console.error("Error updating event:", error);
      
      // Handle specific Firestore permission errors
      if (error.code === 'permission-denied') {
        setMessage({ 
          type: 'error', 
          text: 'Permission denied: You do not have permission to update this event or some fields.' 
        });
      } else {
        setMessage({ type: 'error', text: `Failed to update event: ${error.message}` });
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getEventStatus = (startDate: string, endDate: string): string => {
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (now < start) return "UPCOMING";
      if (now > end) return "ENDED";
      return "LIVE";
    } catch {
      return "UPCOMING";
    }
  };

  // Permission logic aligned with Firestore security rules
  const isAdmin = userRole === 'admin' || userRole === 'moderator';
  const isOwner = user && event.createdById === user.uid && event.createdBy === 'user';
  const canEdit = isAdmin || isOwner;

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edit Event</h2>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert className="bg-red-500/10 border-red-200">
          <AlertDescription className="text-red-600">
            You don't have permission to edit this event.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Edit Event</h2>
          <p className="text-muted-foreground">
            {isAdmin ? 'Full administrative access' : 'Limited editing access - some fields are restricted'}
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}>
          <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update the core details of your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter event name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter event title (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your event..."
                  rows={4}
                />
              </div>

              {/* Date and Time Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.startDate ? (
                          format(formData.startDate, "PPP")
                        ) : (
                          <span>Pick a start date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => handleInputChange('startDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.endDate ? (
                          format(formData.endDate, "PPP")
                        ) : (
                          <span>Pick an end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => handleInputChange('endDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Physical or virtual location"
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Rules & Prizes</CardTitle>
              <CardDescription>Set the rules and prize information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rules">Rules & Guidelines</Label>
                <Textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => handleInputChange('rules', e.target.value)}
                  placeholder="Enter event rules and guidelines..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prizes">Prizes & Rewards</Label>
                <Textarea
                  id="prizes"
                  value={formData.prizes}
                  onChange={(e) => handleInputChange('prizes', e.target.value)}
                  placeholder="Describe the prizes and rewards..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participation Settings</CardTitle>
              <CardDescription>Configure how users can participate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="participationType">Participation Type</Label>
                <Select value={formData.participationType} onValueChange={(value: "individual" | "team") => handleInputChange('participationType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select participation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Individual
                      </div>
                    </SelectItem>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <TeamIcon className="w-4 h-4" />
                        Team
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maximum Participants</Label>
                <div className="flex gap-2">
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={formData.maxParticipants === 0 ? "" : formData.maxParticipants}
                    onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value) || 0)}
                    placeholder="Enter number for limited participants"
                    min="1"
                    disabled={!isAdmin && event.createdBy === 'user'}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={formData.maxParticipants === 0 ? "default" : "outline"}
                    onClick={() => handleInputChange('maxParticipants', 0)}
                    disabled={!isAdmin && event.createdBy === 'user'}
                    className="whitespace-nowrap"
                  >
                    <Infinity className="w-4 h-4 mr-1" />
                    Unlimited
                  </Button>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {formData.maxParticipants === 0 ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Infinity className="w-4 h-4" />
                      Unlimited participation enabled
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Limited to {formData.maxParticipants} participants
                    </p>
                  )}
                  {!isAdmin && event.createdBy === 'user' && (
                    <p className="text-sm text-muted-foreground">
                      Participant limit settings are restricted for user-created events
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-required">Require Payment</Label>
                  <p className="text-sm text-muted-foreground">
                    Charge participants to join this event
                  </p>
                </div>
                <Switch
                  id="payment-required"
                  checked={formData.requiresParticipantPayment}
                  onCheckedChange={(checked) => handleInputChange('requiresParticipantPayment', checked)}
                  disabled={!isAdmin && event.createdBy === 'user'}
                />
              </div>

              {formData.requiresParticipantPayment && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="individualPrice">Price per Participant</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="individualPrice"
                        type="number"
                        value={formData.individualPrice}
                        onChange={(e) => handleInputChange('individualPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="pl-9"
                        disabled={!isAdmin && event.createdBy === 'user'}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={formData.currency} 
                      onValueChange={(value) => handleInputChange('currency', value)}
                      disabled={!isAdmin && event.createdBy === 'user'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZMW">ZMW</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!isAdmin && event.createdBy === 'user' && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">
                        Payment settings are restricted for user-created events
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Only Settings */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>Advanced event configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Event Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Event Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Start Date</span>
                </div>
                <p className="font-medium">{formatDate(event.startDate)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>End Date</span>
                </div>
                <p className="font-medium">{formatDate(event.endDate)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>Current Participants</span>
                </div>
                <p className="font-medium">
                  {event.participants?.length || event.totalParticipants || 0}
                  {event.maxParticipants ? ` / ${event.maxParticipants}` : ' (Unlimited)'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Challenges</span>
                </div>
                <p className="font-medium">{event.challengeCount || 0}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Current Status</span>
                </div>
                <p className="font-medium capitalize">{getEventStatus(event.startDate, event.endDate).toLowerCase()}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Created By</span>
                </div>
                <p className="font-medium capitalize">{event.createdBy || 'user'}</p>
              </div>

              {!isAdmin && (
                <Alert className="bg-blue-500/10 border-blue-200">
                  <AlertDescription className="text-blue-600 text-sm">
                    As event owner, you can edit basic information, rules, prizes, and event dates. Some settings are admin-only.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Button 
                onClick={onBack} 
                variant="outline" 
                className="w-full mt-2"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;