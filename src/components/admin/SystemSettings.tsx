// src/components/admin/SystemSettings.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { CheckCircle, XCircle } from "lucide-react";

interface SystemSettingsProps {
  onBack: () => void;
}

interface SystemSettings {
  // General Settings
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  
  // Security Settings
  requireEmailVerification: boolean;
  allowRegistrations: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number; // in minutes
  
  // Challenge Settings
  defaultPoints: number;
  allowWriteups: boolean;
  writeupRequired: boolean;
  
  // Email Settings
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  
  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  
  // Rate Limits
  rateLimitRequests: number;
  rateLimitWindow: number; // in minutes
  submissionsPerHour: number;
  
  // UI Settings
  enableDarkMode: boolean;
  enableLeaderboard: boolean;
  showPoints: boolean;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  challengeNotifications: boolean;
  
  // Advanced Settings
  enableAPIAccess: boolean;
  enableWebhook: boolean;
  webhookURL: string;
}

const defaultSettings: SystemSettings = {
  // General Settings
  siteName: "CTF Platform",
  siteDescription: "Capture The Flag Platform for cybersecurity enthusiasts",
  contactEmail: "admin@ctfplatform.com",
  
  // Security Settings
  requireEmailVerification: true,
  allowRegistrations: true,
  maxLoginAttempts: 5,
  sessionTimeout: 1440, // 24 hours in minutes
  
  // Challenge Settings
  defaultPoints: 100,
  allowWriteups: true,
  writeupRequired: false,
  
  // Email Settings
  smtpServer: "",
  smtpPort: 587,
  smtpUsername: "",
  smtpPassword: "",
  
  // Maintenance
  maintenanceMode: false,
  maintenanceMessage: "Platform is under maintenance. Please check back later.",
  
  // Rate Limits
  rateLimitRequests: 100,
  rateLimitWindow: 15, // minutes
  submissionsPerHour: 10,
  
  // UI Settings
  enableDarkMode: true,
  enableLeaderboard: true,
  showPoints: true,
  
  // Notification Settings
  emailNotifications: true,
  pushNotifications: true,
  challengeNotifications: true,
  
  // Advanced Settings
  enableAPIAccess: false,
  enableWebhook: false,
  webhookURL: ""
};

const SystemSettings = ({ onBack }: SystemSettingsProps) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log("📋 Fetching system settings...");
      
      const settingsRef = doc(db, "config", "systemSettings");
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const savedSettings = settingsDoc.data() as SystemSettings;
        console.log("✅ Loaded saved settings:", savedSettings);
        
        // Merge with defaults to ensure all fields exist
        const mergedSettings = { ...defaultSettings, ...savedSettings };
        setSettings(mergedSettings);
      } else {
        console.log("📝 No saved settings found, using defaults");
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load settings. Using defaults.' 
      });
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log("💾 Saving system settings...", settings);
      
      const settingsRef = doc(db, "config", "systemSettings");
      await setDoc(settingsRef, settings);
      
      console.log("✅ Settings saved successfully");
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setIsDirty(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to save settings. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset all settings to default? This cannot be undone.")) {
      try {
        setSaving(true);
        console.log("🔄 Resetting settings to default...");
        
        const settingsRef = doc(db, "config", "systemSettings");
        await setDoc(settingsRef, defaultSettings);
        
        setSettings(defaultSettings);
        setMessage({ type: 'success', text: 'Settings reset to defaults!' });
        setIsDirty(false);
        
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error("Error resetting settings:", error);
        setMessage({ 
          type: 'error', 
          text: 'Failed to reset settings. Please try again.' 
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Convert minutes to hours for display (optional)
  const sessionHours = Math.floor(settings.sessionTimeout / 60);
  const sessionMinutes = settings.sessionTimeout % 60;

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="mb-6 -ml-3">
          ← Back to Admin
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Loading system settings...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-2 -ml-3">
          ← Back to Admin
        </Button>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure platform-wide settings and preferences
        </p>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              value={settings.siteName}
              onChange={(e) => updateSetting("siteName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e) => updateSetting("siteDescription", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={settings.contactEmail}
              onChange={(e) => updateSetting("contactEmail", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Authentication and security configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Users must verify their email address before accessing the platform
              </p>
            </div>
            <Switch
              id="requireEmailVerification"
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked) => updateSetting("requireEmailVerification", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowRegistrations">Allow New Registrations</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to register on the platform
              </p>
            </div>
            <Switch
              id="allowRegistrations"
              checked={settings.allowRegistrations}
              onCheckedChange={(checked) => updateSetting("allowRegistrations", checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => updateSetting("maxLoginAttempts", parseInt(e.target.value) || 5)}
                min="1"
                max="10"
              />
              <p className="text-xs text-muted-foreground mt-1">Before temporary lockout</p>
            </div>
            <div>
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value) || 1440)}
                min="1"
                max="43200" // 30 days in minutes
              />
              <p className="text-xs text-muted-foreground mt-1">
                {sessionHours > 0 ? `${sessionHours}h ` : ''}{sessionMinutes}m
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenge Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Challenge Settings</CardTitle>
          <CardDescription>Challenge and write-up configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultPoints">Default Points for New Challenges</Label>
            <Input
              id="defaultPoints"
              type="number"
              value={settings.defaultPoints}
              onChange={(e) => updateSetting("defaultPoints", parseInt(e.target.value) || 100)}
              min="1"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowWriteups">Allow Write-ups</Label>
              <p className="text-sm text-muted-foreground">
                Users can submit write-ups for challenges
              </p>
            </div>
            <Switch
              id="allowWriteups"
              checked={settings.allowWriteups}
              onCheckedChange={(checked) => updateSetting("allowWriteups", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="writeupRequired">Write-ups Required</Label>
              <p className="text-sm text-muted-foreground">
                Users must submit a write-up to get points
              </p>
            </div>
            <Switch
              id="writeupRequired"
              checked={settings.writeupRequired}
              onCheckedChange={(checked) => updateSetting("writeupRequired", checked)}
              disabled={!settings.allowWriteups}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>Control API and submission rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rateLimitRequests">API Requests Limit</Label>
              <Input
                id="rateLimitRequests"
                type="number"
                value={settings.rateLimitRequests}
                onChange={(e) => updateSetting("rateLimitRequests", parseInt(e.target.value) || 100)}
                min="10"
                max="1000"
              />
              <p className="text-xs text-muted-foreground mt-1">Requests per window</p>
            </div>
            <div>
              <Label htmlFor="rateLimitWindow">Rate Limit Window (minutes)</Label>
              <Input
                id="rateLimitWindow"
                type="number"
                value={settings.rateLimitWindow}
                onChange={(e) => updateSetting("rateLimitWindow", parseInt(e.target.value) || 15)}
                min="1"
                max="60"
              />
            </div>
            <div>
              <Label htmlFor="submissionsPerHour">Submissions per Hour</Label>
              <Input
                id="submissionsPerHour"
                type="number"
                value={settings.submissionsPerHour}
                onChange={(e) => updateSetting("submissionsPerHour", parseInt(e.target.value) || 10)}
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground mt-1">Per user limit</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI Settings */}
      <Card>
        <CardHeader>
          <CardTitle>UI Settings</CardTitle>
          <CardDescription>Platform appearance and features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableDarkMode">Enable Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to toggle dark theme
              </p>
            </div>
            <Switch
              id="enableDarkMode"
              checked={settings.enableDarkMode}
              onCheckedChange={(checked) => updateSetting("enableDarkMode", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableLeaderboard">Enable Leaderboard</Label>
              <p className="text-sm text-muted-foreground">
                Show global leaderboard to users
              </p>
            </div>
            <Switch
              id="enableLeaderboard"
              checked={settings.enableLeaderboard}
              onCheckedChange={(checked) => updateSetting("enableLeaderboard", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showPoints">Show Points</Label>
              <p className="text-sm text-muted-foreground">
                Display point values on challenges
              </p>
            </div>
            <Switch
              id="showPoints"
              checked={settings.showPoints}
              onCheckedChange={(checked) => updateSetting("showPoints", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
          <CardDescription>Take the platform offline for maintenance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenanceMode">Enable Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Platform will be unavailable to regular users
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => updateSetting("maintenanceMode", checked)}
            />
          </div>

          {settings.maintenanceMode && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={settings.maintenanceMessage || ""}
                  onChange={(e) => updateSetting("maintenanceMessage", e.target.value)}
                  placeholder="Platform is under maintenance. Please check back later."
                />
              </div>
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Maintenance mode is active
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Only administrators can access the platform. Regular users will see the maintenance message.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Developer and integration settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableAPIAccess">Enable API Access</Label>
              <p className="text-sm text-muted-foreground">
                Allow third-party applications to access the API
              </p>
            </div>
            <Switch
              id="enableAPIAccess"
              checked={settings.enableAPIAccess}
              onCheckedChange={(checked) => updateSetting("enableAPIAccess", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableWebhook">Enable Webhook</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications to external services
              </p>
            </div>
            <Switch
              id="enableWebhook"
              checked={settings.enableWebhook}
              onCheckedChange={(checked) => updateSetting("enableWebhook", checked)}
            />
          </div>

          {settings.enableWebhook && (
            <div>
              <Label htmlFor="webhookURL">Webhook URL</Label>
              <Input
                id="webhookURL"
                type="url"
                value={settings.webhookURL}
                onChange={(e) => updateSetting("webhookURL", e.target.value)}
                placeholder="https://api.example.com/webhook"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL to send challenge solve notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button 
          onClick={handleSave} 
          disabled={saving || !isDirty}
          className="flex-1"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={saving}
        >
          Reset to Defaults
        </Button>
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>

      <div className="text-xs text-muted-foreground pt-2">
        <p>Settings are saved to Firestore config/systemSettings document.</p>
        <p>These settings affect the entire platform and all users.</p>
      </div>
    </div>
  );
};

export default SystemSettings;