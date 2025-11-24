// src/components/admin/SystemSettings.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface SystemSettingsProps {
  onBack: () => void;
}

const SystemSettings = ({ onBack }: SystemSettingsProps) => {
  const [settings, setSettings] = useState({
    // General Settings
    siteName: "CTF Platform",
    siteDescription: "Capture The Flag Platform for cybersecurity enthusiasts",
    contactEmail: "admin@ctfplatform.com",
    
    // Security Settings
    requireEmailVerification: true,
    allowRegistrations: true,
    maxLoginAttempts: 5,
    sessionTimeout: 24,
    
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
    maintenanceMode: false
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      alert("Settings saved successfully!");
      setLoading(false);
    }, 1000);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      // Reset to default values
      setSettings({
        siteName: "CTF Platform",
        siteDescription: "Capture The Flag Platform for cybersecurity enthusiasts",
        contactEmail: "admin@ctfplatform.com",
        requireEmailVerification: true,
        allowRegistrations: true,
        maxLoginAttempts: 5,
        sessionTimeout: 24,
        defaultPoints: 100,
        allowWriteups: true,
        writeupRequired: false,
        smtpServer: "",
        smtpPort: 587,
        smtpUsername: "",
        smtpPassword: "",
        maintenanceMode: false
      });
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
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
                onChange={(e) => updateSetting("maxLoginAttempts", parseInt(e.target.value))}
                min="1"
                max="10"
              />
            </div>
            <div>
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value))}
                min="1"
                max="720"
              />
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
              onChange={(e) => updateSetting("defaultPoints", parseInt(e.target.value))}
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
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Maintenance mode is enabled. Only administrators can access the platform.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default SystemSettings;