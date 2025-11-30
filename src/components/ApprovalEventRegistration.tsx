import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle, Clock, UserCheck, XCircle, Smartphone } from "lucide-react";

interface ApprovalEventRegistrationProps {
  event: {
    id: string;
    name: string;
    individualPrice?: number;
    currency?: string;
    maxParticipants?: number;
    participants?: string[];
    registeredUsers?: string[];
  };
  onCancel: () => void;
  onSuccess: () => void;
}

const ApprovalEventRegistration = ({ event, onCancel, onSuccess }: ApprovalEventRegistrationProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const price = event.individualPrice || 0;
  const currency = event.currency || 'ZMW';

  const submitForApproval = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      // Simulate API call for approval request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMessage({ 
        type: 'success', 
        text: 'Registration request submitted! Your status is now "Pending Approval". Admin will review and approve your registration.' 
      });
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (error: any) {
      console.error("Error submitting approval request:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to submit approval request: ${error.message}` 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="w-5 h-5 text-blue-600" />
          Request Registration Approval
        </CardTitle>
        <CardDescription>
          Submit your registration for admin/moderator approval.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-4">
          {/* Approval Info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Approval Required</p>
              <p className="text-xs text-blue-600">Admin/moderator will review and approve your registration.</p>
            </div>
          </div>

          {/* Payment Section (if paid event) */}
          {event.individualPrice && event.individualPrice > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-800">Registration Fee</span>
                <span className="text-lg font-bold text-green-800">
                  {price} {currency}
                </span>
              </div>
              <p className="text-xs text-green-600">Event: {event.name}</p>
              
              {/* Mobile Money Instructions for paid approval events */}
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <h6 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  Payment Instructions
                </h6>
                <div className="text-xs space-y-1">
                  <p className="text-blue-700">📱 Airtel Money: <span className="font-mono font-bold">0774713037</span></p>
                  <p className="text-blue-700">📱 MTN Money: <span className="font-mono font-bold">0969209404</span></p>
                  <p className="text-blue-700 mt-1">Reference: <span className="font-bold">{event.name}</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Approval Process Info */}
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">After submitting your request:</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Your status will be <strong>"Pending Approval"</strong></li>
              <li>Admins/moderators will review your request</li>
              <li>You'll receive notification when approved</li>
              <li>Registration will be confirmed upon approval</li>
              <li>This process usually takes 1-2 hours</li>
            </ul>
          </div>
        </div>

        {message && (
          <Alert className={`mt-3 ${message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                {message.text}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-3">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={submitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          onClick={submitForApproval}
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? (
            <>
              <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              Request Approval
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ApprovalEventRegistration;