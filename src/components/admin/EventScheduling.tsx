// src/components/admin/EventScheduling.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "../../firebase";
import { doc, collection, setDoc } from "firebase/firestore";

interface EventSchedulingProps {
  onBack: () => void;
  userRole: "admin" | "user";
  onEventCreated: (eventId: string, eventData: any) => void;
}

interface EventFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  participationType: "individual" | "team" | "both";
  maxIndividuals?: number;
  individualPrice: number;
  maxTeams?: number;
  teamSize?: number;
  teamPrice: number;
  requiresParticipantPayment: boolean;
  hostingFee: number;
}

const EventScheduling = ({ onBack, userRole, onEventCreated }: EventSchedulingProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    participationType: "both",
    maxIndividuals: 100,
    individualPrice: 0,
    maxTeams: 20,
    teamSize: 5,
    teamPrice: 0,
    requiresParticipantPayment: false,
    hostingFee: userRole === "user" ? 100 : 0,
  });

  const handleParticipationTypeChange = (value: "individual" | "team" | "both") => {
    setFormData(prev => ({
      ...prev,
      participationType: value,
    }));
  };

  const getCurrentDateTimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create an event",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Basic validation
      if (!formData.name.trim()) {
        toast({
          title: "Event name required",
          description: "Please enter an event name",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        toast({
          title: "Dates required",
          description: "Please select both start and end dates",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        toast({
          title: "Invalid dates",
          description: "End date must be after start date",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Prepare event data with lowercase status values for Firestore rules
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        participationType: formData.participationType,
        maxIndividuals: formData.maxIndividuals,
        individualPrice: formData.individualPrice,
        maxTeams: formData.maxTeams,
        teamSize: formData.teamSize,
        teamPrice: formData.teamPrice,
        requiresParticipantPayment: formData.requiresParticipantPayment,
        hostingFee: formData.hostingFee,
        currency: "ZMW",
        // Use lowercase status values to match Firestore rules
        status: userRole === "admin" ? "approved" : "pending",
        createdBy: userRole,
        createdById: user.uid,
        createdAt: new Date().toISOString(),
        requiresHostingPayment: userRole === "user",
        hostingPaymentStatus: userRole === "user" ? "pending" : "not_required",
        createdByUser: {
          uid: user.uid,
          email: user.email || "",
          name: user.displayName || "Event Creator"
        },
        participants: [],
        totalParticipants: 0,
        totalTeams: 0,
        challenges: [],
        challengeCount: 0
      };

      // Submit the event to Firestore
      const createdEvent = await submitEvent(eventData);
      
      if (createdEvent) {
        toast({
          title: userRole === "admin" ? "Event Scheduled!" : "Event Submitted!",
          description: userRole === "admin" 
            ? "Your event has been successfully scheduled and is now live."
            : "Your event has been submitted for admin approval. You will be notified once approved.",
        });
        
        // Call the callback to navigate to challenge management
        if (onEventCreated) {
          onEventCreated(createdEvent.id, createdEvent);
        }
      }

    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to schedule event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitEvent = async (eventData: any) => {
    try {
      // Create the event directly in Firestore
      const eventRef = doc(collection(db, "events"));
      await setDoc(eventRef, eventData);
      
      return { id: eventRef.id, ...eventData };
      
    } catch (firestoreError: any) {
      console.error("Firestore error:", firestoreError);
      
      // Provide specific error messages
      if (firestoreError.code === 'permission-denied') {
        throw new Error("Permission denied. Check your Firestore security rules.");
      } else if (firestoreError.code === 'invalid-argument') {
        throw new Error("Invalid data format. Please check all field values.");
      } else {
        throw new Error(`Firestore error: ${firestoreError.message}`);
      }
    }
  };

  // Handle number input changes safely
  const handleNumberChange = (field: keyof EventFormData, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  // Handle price input changes safely
  const handlePriceChange = (field: keyof EventFormData, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div>
            <CardTitle className="text-xl sm:text-2xl">Schedule New Event</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {userRole === "admin" 
                ? "Create and schedule events instantly" 
                : "Submit events for hosting - hosting fee required"
              }
            </CardDescription>
          </div>
          <Badge variant={userRole === "admin" ? "default" : "secondary"} className="self-start">
            {userRole === "admin" ? "Admin" : "Event Host"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Event Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Event Information</h3>
            
            <div>
              <Label htmlFor="name" className="text-sm sm:text-base">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter event name"
                required
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm sm:text-base">Event Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the event, rules, and objectives..."
                rows={4}
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm sm:text-base">Start Date & Time *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  min={getCurrentDateTimeString()}
                  required
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="endDate" className="text-sm sm:text-base">End Date & Time *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  min={formData.startDate || getCurrentDateTimeString()}
                  required
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Participation Settings */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Participation Settings</h3>
            
            <div>
              <Label className="mb-3 block text-sm sm:text-base">Participation Type</Label>
              <RadioGroup 
                value={formData.participationType} 
                onValueChange={handleParticipationTypeChange}
                className="flex flex-col space-y-3"
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="text-sm sm:text-base">Individual Participation Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="text-sm sm:text-base">Team Participation Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="text-sm sm:text-base">Both Individual and Team</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Individual Participation Settings */}
            {(formData.participationType === "individual" || formData.participationType === "both") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 sm:pl-6 border-l-2 border-blue-200">
                <div className="sm:col-span-2">
                  <Label className="font-semibold text-sm sm:text-base">
                    Individual Participation
                  </Label>
                </div>
                
                <div>
                  <Label htmlFor="maxIndividuals" className="text-sm sm:text-base">Max Individuals</Label>
                  <Input
                    id="maxIndividuals"
                    type="number"
                    value={formData.maxIndividuals === undefined ? "" : formData.maxIndividuals}
                    onChange={(e) => handleNumberChange('maxIndividuals', e.target.value)}
                    min="0"
                    placeholder="0 for unlimited"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set to 0 for unlimited participants
                  </p>
                </div>

                <div>
                  <Label htmlFor="individualPrice" className="text-sm sm:text-base">Individual Fee (ZMW)</Label>
                  <Input
                    id="individualPrice"
                    type="number"
                    value={formData.individualPrice}
                    onChange={(e) => handlePriceChange('individualPrice', e.target.value)}
                    min="0"
                    step="1"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set to 0 for free participation
                  </p>
                </div>
              </div>
            )}

            {/* Team Participation Settings */}
            {(formData.participationType === "team" || formData.participationType === "both") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-4 sm:pl-6 border-l-2 border-green-200">
                <div className="sm:col-span-3">
                  <Label className="font-semibold text-sm sm:text-base">Team Participation</Label>
                </div>
                
                <div>
                  <Label htmlFor="maxTeams" className="text-sm sm:text-base">Max Teams</Label>
                  <Input
                    id="maxTeams"
                    type="number"
                    value={formData.maxTeams === undefined ? "" : formData.maxTeams}
                    onChange={(e) => handleNumberChange('maxTeams', e.target.value)}
                    min="0"
                    placeholder="0 for unlimited"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set to 0 for unlimited teams
                  </p>
                </div>

                <div>
                  <Label htmlFor="teamSize" className="text-sm sm:text-base">Team Size</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    value={formData.teamSize}
                    onChange={(e) => handleNumberChange('teamSize', e.target.value)}
                    min="1"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="teamPrice" className="text-sm sm:text-base">Team Fee (ZMW)</Label>
                  <Input
                    id="teamPrice"
                    type="number"
                    value={formData.teamPrice}
                    onChange={(e) => handlePriceChange('teamPrice', e.target.value)}
                    min="0"
                    step="1"
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set to 0 for free participation
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Settings */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Payment Settings</h3>

            {/* Hosting Fee - Only for users */}
            {userRole === "user" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hostingFee" className="text-sm sm:text-base">Hosting Fee (ZMW) *</Label>
                  <Input
                    id="hostingFee"
                    type="number"
                    value={formData.hostingFee}
                    onChange={(e) => handlePriceChange('hostingFee', e.target.value)}
                    min="1"
                    step="1"
                    required
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Fee paid to admin for event hosting via Mobile Money
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2 text-blue-800">
                    <span className="mt-0.5">💳</span>
                    <div>
                      <p className="text-sm font-medium">
                        Hosting Fee: {formData.hostingFee} ZMW
                      </p>
                      <p className="text-xs">
                        You'll pay this fee to the admin via Mobile Money (Flutterwave) to host your event
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Participant Payment Settings */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requiresParticipantPayment"
                checked={formData.requiresParticipantPayment}
                onChange={(e) => setFormData({...formData, requiresParticipantPayment: e.target.checked})}
                className="rounded"
                disabled={isSubmitting}
              />
              <Label htmlFor="requiresParticipantPayment" className="font-semibold text-sm sm:text-base">
                Require participants to pay registration fees
              </Label>
            </div>

            {formData.requiresParticipantPayment && (
              <div className="pl-6">
                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                  💰 Participant payments will be collected via Flutterwave
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Participants will pay registration fees directly to you when they register
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 order-2 sm:order-1"
            >
              {isSubmitting ? "Processing..." : 
               userRole === "admin" ? "Create Event & Add Challenges" : "Submit Event"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack}
              className="order-1 sm:order-2"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EventScheduling;