import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle, CreditCard, XCircle, Smartphone } from "lucide-react";

interface PaidEventRegistrationProps {
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

const PaidEventRegistration = ({ event, onCancel, onSuccess }: PaidEventRegistrationProps) => {
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const price = event.individualPrice || 0;
  const currency = event.currency || 'ZMW';

  const processPayment = async () => {
    setProcessing(true);
    setMessage(null);

    try {
      // For now, simulate payment processing
      // Later this will redirect to actual mobile money service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo, always succeed
      setMessage({ 
        type: 'success', 
        text: `Payment successful! You have been registered for ${event.name}.` 
      });
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (error: any) {
      console.error("Payment error:", error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Payment processing failed. Please try again.' 
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-green-600" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Complete your registration by paying the participation fee.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-4">
          {/* Payment Summary */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-800">Registration Fee</span>
              <span className="text-lg font-bold text-green-800">
                {price} {currency}
              </span>
            </div>
            <p className="text-xs text-green-600">Event: {event.name}</p>
          </div>
          
          {/* Mobile Money Instructions */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-600" />
              Mobile Money Payment
            </h5>
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-1">Send payment to:</p>
                <div className="text-sm space-y-1">
                  <p className="text-blue-700">📱 Airtel Money: <span className="font-mono font-bold">0774713037</span></p>
                  <p className="text-blue-700">📱 MTN Money: <span className="font-mono font-bold">0969209404</span></p>
                </div>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open your mobile money app</li>
                <li>Send <strong>{price} {currency}</strong> to one of the numbers above</li>
                <li>Use event name as reference: <strong>{event.name}</strong></li>
                <li>Click "Complete Payment" below once payment is sent</li>
              </ol>
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  💡 <strong>Note:</strong> Your registration will be confirmed once payment is verified.
                </p>
              </div>
            </div>
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
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          onClick={processPayment}
          disabled={processing}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {processing ? (
            <>
              <div className="animate-spin w-4 h-4 border border-white border-t-transparent rounded-full mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Complete Payment
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaidEventRegistration;