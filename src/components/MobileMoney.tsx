// MobileMoney.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Smartphone, Clock } from "lucide-react";

interface MobileMoneyProps {
  amount: number;
  currency: string;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
  eventId?: string;
}

const MobileMoney: React.FC<MobileMoneyProps> = ({
  amount,
  currency,
  description,
  onSuccess,
  onCancel,
  eventId
}) => {
  return (
    <Card className="w-full max-w-md mx-auto border border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="w-5 h-5 text-blue-600" />
          Mobile Money Payment
        </CardTitle>
        <CardDescription>
          Mobile Money service coming soon
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-4">
          <Alert className="bg-yellow-50 border-yellow-200">
            <Clock className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-600">
              Mobile Money payment integration is currently under development and will be available soon.
            </AlertDescription>
          </Alert>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-center">
              <h3 className="font-semibold text-blue-800 mb-2">Service Coming Soon</h3>
              <p className="text-sm text-blue-600">
                We're working on integrating Mobile Money payments to provide you with a seamless registration experience.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <div className="flex gap-2 pt-3 px-6 pb-6">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          disabled
          className="flex-1 bg-gray-400"
        >
          Service Coming Soon
        </Button>
      </div>
    </Card>
  );
};

export default MobileMoney;