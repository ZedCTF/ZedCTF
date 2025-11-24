// src/components/admin/WriteupReview.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface WriteupReviewProps {
  onBack: () => void;
}

const WriteupReview = ({ onBack }: WriteupReviewProps) => {
  // Mock data for demonstration
  const mockWriteups = [
    {
      id: "1",
      user: "john_doe",
      challenge: "SQL Injection Master",
      submittedAt: "2024-01-15",
      status: "pending",
      content: "This is a mock write-up content...",
      rating: 0
    },
    {
      id: "2", 
      user: "jane_smith",
      challenge: "Crypto Challenge 1",
      submittedAt: "2024-01-14",
      status: "approved",
      content: "Another mock write-up...",
      rating: 4
    }
  ];

  const handleApprove = (writeupId: string) => {
    // TODO: Implement approval logic
    console.log("Approving writeup:", writeupId);
    alert(`Write-up ${writeupId} approved!`);
  };

  const handleReject = (writeupId: string) => {
    // TODO: Implement rejection logic
    console.log("Rejecting writeup:", writeupId);
    alert(`Write-up ${writeupId} rejected!`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "approved": return <Badge variant="default">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Write-ups</CardTitle>
        <CardDescription>
          Review and approve user write-ups for challenges ({mockWriteups.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {mockWriteups.map((writeup) => (
            <div key={writeup.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{writeup.challenge}</h3>
                  <p className="text-sm text-muted-foreground">
                    Submitted by {writeup.user} on {writeup.submittedAt}
                  </p>
                </div>
                {getStatusBadge(writeup.status)}
              </div>

              <div>
                <Label>Write-up Content</Label>
                <div className="mt-1 p-3 border rounded bg-muted/50">
                  {writeup.content}
                </div>
              </div>

              {writeup.status === "pending" && (
                <div className="space-y-3">
                  <Label htmlFor={`feedback-${writeup.id}`}>Feedback (Optional)</Label>
                  <Textarea
                    id={`feedback-${writeup.id}`}
                    placeholder="Provide feedback for the user..."
                    rows={3}
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(writeup.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleReject(writeup.id)}
                    >
                      Request Changes
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleReject(writeup.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {writeup.status !== "pending" && (
                <div className="text-sm text-muted-foreground">
                  Write-up has been {writeup.status}. {writeup.rating > 0 && `Rating: ${writeup.rating}/5`}
                </div>
              )}
            </div>
          ))}

          {mockWriteups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No write-ups to review at this time.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WriteupReview;