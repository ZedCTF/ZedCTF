import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, CreditCard } from "lucide-react";
import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const HostEventSection = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showHostingDialog, setShowHostingDialog] = useState(false);
  const [eventName, setEventName] = useState("");

  // Open hosting dialog
  const openHostingDialog = () => {
    setShowHostingDialog(true);
    setEventName("");
  };

  // Process Flutterwave payment for event hosting
  const processHostingPayment = async () => {
    if (!user || !eventName.trim()) {
      alert("Please enter an event name");
      return;
    }
    
    setProcessingPayment(true);

    try {
      // Create hosting request in Firestore with pending status
      const hostRequestRef = await addDoc(collection(db, "hostRequests"), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        eventName: eventName.trim(),
        hostingFee: 5,
        status: "pending_payment",
        submittedAt: new Date(),
        paymentMethod: "flutterwave_mobile_money",
        type: "event_hosting"
      });

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the host request to paid status
      await updateDoc(hostRequestRef, {
        status: "paid",
        paidAt: new Date()
      });

      // Create the event with user as owner
      const eventData = {
        name: eventName.trim(),
        title: eventName.trim(),
        createdBy: "user",
        createdById: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName || user.email,
        status: "draft",
        hostingFee: 5,
        hostingPaymentStatus: "paid",
        participants: [],
        registeredUsers: [],
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const eventRef = await addDoc(collection(db, "events"), eventData);

      setShowHostingDialog(false);
      
      // Redirect to event management after successful payment
      navigate(`/admin?tab=events&event=${eventRef.id}`);
      
    } catch (error) {
      console.error("Payment processing error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Card className="max-w-4xl mx-auto mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-bold text-lg">Want to Host Your Own Event?</h3>
                <p className="text-muted-foreground text-sm">
                  Submit a hosting request and get access to event management tools
                </p>
              </div>
            </div>
            <Button 
              onClick={openHostingDialog}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Get Hosting Access - 5 ZMW
            </Button>
          </div>

          {/* Hosting Access Info */}
          <div className="mt-4 p-4 bg-background/50 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-foreground">Event Hosting Fee:</span>
              <span className="text-lg font-bold text-primary">ZMW 5</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Pay 5 ZMW via Mobile Money to unlock event hosting capabilities for your event and get access to:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-foreground">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Challenge Creation Tools
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Event Scheduling
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Challenge Management
              </p>
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                Event Management
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Note: This payment grants hosting access for a single event. Each event requires its own hosting payment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hosting Dialog */}
      <Dialog open={showHostingDialog} onOpenChange={setShowHostingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Host Your Event</DialogTitle>
            <DialogDescription>
              Enter a name for your event and complete the payment to get hosting access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                placeholder="Enter your event name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Hosting Fee:</span>
                <span className="text-lg font-bold text-primary">ZMW 5</span>
              </div>
              <p className="text-sm text-muted-foreground">
                After payment, you'll be redirected to event management where you can set up your event details, challenges, and schedule.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowHostingDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={processHostingPayment}
              disabled={processingPayment || !eventName.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {processingPayment ? "Processing Payment..." : "Pay 5 ZMW"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HostEventSection;