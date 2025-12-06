// src/components/FirebaseWebChallenge.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Power, Clock, RefreshCw, AlertCircle, Globe, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

interface FirebaseWebInstance {
  id: string;
  url: string;
  status: 'deploying' | 'active' | 'stopped' | 'error';
  createdAt: string;
  expiresAt: string;
  flag?: string;
}

const FirebaseWebChallenge: React.FC<{ challengeId: string }> = ({ challengeId }) => {
  const { user } = useAuthContext();
  const [challenge, setChallenge] = useState<any>(null);
  const [instance, setInstance] = useState<FirebaseWebInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    loadChallenge();
    checkInstance();
  }, [challengeId]);

  useEffect(() => {
    if (!instance?.expiresAt) return;

    const timer = setInterval(() => {
      const expires = new Date(instance.expiresAt).getTime();
      const now = new Date().getTime();
      const minutesLeft = Math.max(0, Math.floor((expires - now) / (1000 * 60)));
      setTimeLeft(minutesLeft);

      if (minutesLeft === 0) {
        checkInstance(); // Refresh status
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [instance]);

  const loadChallenge = async () => {
    try {
      const docRef = doc(db, "challenges", challengeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setChallenge(docSnap.data());
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
    }
  };

  const checkInstance = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/web/instances?userId=${user.uid}&challengeId=${challengeId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.instance) {
          setInstance(data.instance);
        } else {
          setInstance(null);
        }
      }
    } catch (error) {
      console.error("Error checking instance:", error);
    } finally {
      setLoading(false);
    }
  };

  const startInstance = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start a web instance",
        variant: "destructive",
      });
      return;
    }

    try {
      setStarting(true);
      const response = await fetch('/api/web/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          challengeId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInstance(data.instance);
        toast({
          title: "Instance Deploying",
          description: "Your web instance is being deployed. This may take a moment.",
          duration: 5000,
        });

        // Poll for status updates
        pollInstanceStatus(data.instance.id);
      } else {
        throw new Error(data.error || 'Failed to start instance');
      }
    } catch (error: any) {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  const pollInstanceStatus = async (instanceId: string) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) return;

      try {
        const response = await fetch(`/api/web/instances/${instanceId}/status`);
        const data = await response.json();

        if (data.instance.status === 'active') {
          setInstance(data.instance);
          toast({
            title: "Instance Ready!",
            description: "Your web instance is now active and accessible.",
            duration: 3000,
          });
        } else if (data.instance.status === 'error') {
          toast({
            title: "Deployment Error",
            description: "Failed to deploy the web instance.",
            variant: "destructive",
          });
        } else {
          // Still deploying, check again in 10 seconds
          attempts++;
          setTimeout(checkStatus, 10000);
        }
      } catch (error) {
        attempts++;
        setTimeout(checkStatus, 10000);
      }
    };

    checkStatus();
  };

  const stopInstance = async () => {
    if (!instance) return;

    try {
      const response = await fetch(`/api/web/instances/${instance.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInstance(null);
        toast({
          title: "Instance Stopped",
          description: "Your web instance has been stopped and cleaned up.",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop the instance.",
        variant: "destructive",
      });
    }
  };

  if (loading && !challenge) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Challenge Not Found</h3>
            <p className="text-muted-foreground">The requested challenge could not be loaded.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>{challenge.title}</CardTitle>
                <CardDescription>
                  {challenge.description}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="capitalize">
              {challenge.difficulty}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Challenge Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Challenge Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <Badge className="ml-2">{challenge.category}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Points:</span>
                    <Badge variant="secondary" className="ml-2 font-mono">
                      {challenge.points}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium">Web Application</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Runtime:</span>
                    <Badge variant="outline" className="ml-2">
                      {challenge.runtime || 'static'}
                    </Badge>
                  </div>
                </div>
              </div>

              {challenge.instructions && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <div className="prose prose-sm max-w-none">
                    {challenge.instructions}
                  </div>
                </div>
              )}

              {challenge.hints && challenge.hints.length > 0 && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Hints
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {challenge.hints.map((hint: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-yellow-600">{index + 1}.</span>
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Instance Control Panel */}
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    {!user ? (
                      <div className="py-6">
                        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <h4 className="font-semibold mb-2">Sign In Required</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Please sign in to launch a web instance
                        </p>
                      </div>
                    ) : instance ? (
                      <>
                        <div className="mb-4">
                          <Badge className="bg-green-500/20 text-green-600 mb-2">
                            Instance Active
                          </Badge>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Expires in: {timeLeft} minutes</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Button
                            onClick={() => window.open(instance.url, '_blank')}
                            className="w-full"
                            size="lg"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Challenge
                          </Button>

                          <Button
                            variant="outline"
                            onClick={stopInstance}
                            className="w-full"
                          >
                            <Power className="w-4 h-4 mr-2" />
                            Stop Instance
                          </Button>

                          {instance.flag && (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <p className="text-xs font-semibold text-green-800 mb-1">
                                Your Unique Flag:
                              </p>
                              <code className="text-xs font-mono text-green-700 break-all">
                                {instance.flag}
                              </code>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Globe className="w-12 h-12 text-primary mx-auto mb-2" />
                        <h4 className="font-semibold">Start Web Instance</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Launch an isolated instance of this challenge
                        </p>

                        <Button
                          onClick={startInstance}
                          disabled={starting}
                          className="w-full"
                          size="lg"
                        >
                          {starting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deploying...
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              Launch Instance
                            </>
                          )}
                        </Button>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div className="text-xs text-blue-800">
                              <p className="font-semibold mb-1">How it works:</p>
                              <ul className="space-y-1">
                                <li>• Isolated Firebase Hosting site</li>
                                <li>• Automatically stops after 30min</li>
                                <li>• Your own unique flag</li>
                                <li>• No installation required</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted rounded p-3">
                  <div className="text-lg font-bold">
                    {challenge.solvedBy?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Solves</div>
                </div>
                <div className="bg-muted rounded p-3">
                  <div className="text-lg font-bold">
                    {challenge.points}
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Preview (if available) */}
      {challenge.files && Object.keys(challenge.files).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Challenge Files</CardTitle>
            <CardDescription>Files included in this web challenge</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b text-sm font-medium">
                File Structure
              </div>
              <div className="divide-y">
                {Object.keys(challenge.files).map((filename) => (
                  <div key={filename} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileIcon filename={filename} />
                        <span className="font-mono text-sm">{filename}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {challenge.files[filename].length} chars
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const FileIcon: React.FC<{ filename: string }> = ({ filename }) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const icons: Record<string, React.ReactNode> = {
    'html': <div className="w-4 h-4 bg-orange-500 rounded" />,
    'js': <div className="w-4 h-4 bg-yellow-500 rounded" />,
    'css': <div className="w-4 h-4 bg-blue-500 rounded" />,
    'php': <div className="w-4 h-4 bg-purple-500 rounded" />,
    'py': <div className="w-4 h-4 bg-green-500 rounded" />,
    'json': <div className="w-4 h-4 bg-gray-500 rounded" />,
  };
  
  return icons[ext || ''] || <div className="w-4 h-4 bg-gray-300 rounded" />;
};

export default FirebaseWebChallenge;