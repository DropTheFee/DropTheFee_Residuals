import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Merchant DataSync Documentation
          </h1>
          <p className="text-lg text-muted-foreground">
            Complete guide to installing and using Merchant DataSync with GoHighLevel
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>What is Merchant DataSync?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Merchant DataSync is a powerful integration for GoHighLevel that automatically syncs and manages your merchant data,
              contacts, opportunities, and pipeline information. It provides real-time synchronization, automated workflows, and
              comprehensive analytics to help you manage your business more effectively.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Real-Time Sync</h3>
                <p className="text-sm text-muted-foreground">Automatic synchronization of contacts and opportunities</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Automated Workflows</h3>
                <p className="text-sm text-muted-foreground">Streamline your processes with intelligent automation</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-sm text-muted-foreground">Comprehensive insights into your merchant data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installation Guide</CardTitle>
            <CardDescription>Step-by-step installation process</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="step1">
                <AccordionTrigger>Step 1: Install from Marketplace</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>1. Navigate to the GoHighLevel Marketplace</p>
                  <p>2. Search for "Merchant DataSync"</p>
                  <p>3. Click the "Install" button</p>
                  <p>4. You will be redirected to the authorization page</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step2">
                <AccordionTrigger>Step 2: Authorize Permissions</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>Review the requested permissions:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Read and write contacts</li>
                    <li>Read and write opportunities</li>
                    <li>Read location information</li>
                    <li>Read calendars and appointments</li>
                    <li>Read user information</li>
                  </ul>
                  <p className="mt-2">Click "Authorize" to grant permissions</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step3">
                <AccordionTrigger>Step 3: Select Location</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>1. Choose the location where you want to install Merchant DataSync</p>
                  <p>2. Click "Continue" to proceed</p>
                  <p>3. The app will create necessary webhooks and configurations</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step4">
                <AccordionTrigger>Step 4: Complete Setup</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>1. You will be redirected to the Merchant DataSync dashboard</p>
                  <p>2. The initial sync will begin automatically</p>
                  <p>3. Access the app from the custom menu item in your GHL subaccount</p>
                  <p className="font-semibold mt-2">Installation complete! Estimated time: 30-60 seconds</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>What Merchant DataSync can do for you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge>Sync</Badge>
                <div>
                  <h3 className="font-semibold">Daily Data Synchronization</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically syncs contacts, opportunities, and pipeline data every day at 2 AM UTC
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge>Webhooks</Badge>
                <div>
                  <h3 className="font-semibold">Real-Time Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Receive instant notifications when contacts or opportunities are created or updated
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge>Analytics</Badge>
                <div>
                  <h3 className="font-semibold">Comprehensive Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    View detailed analytics and insights about your merchant data and pipeline performance
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge>Security</Badge>
                <div>
                  <h3 className="font-semibold">Enterprise-Grade Security</h3>
                  <p className="text-sm text-muted-foreground">
                    AES-256 encryption, Row Level Security, and comprehensive audit logging
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OAuth Scopes</CardTitle>
            <CardDescription>Permissions required by Merchant DataSync</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono">contacts.readonly</code>
                  <Badge variant="secondary">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Read access to contacts for daily sync and analytics
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono">contacts.write</code>
                  <Badge variant="secondary">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Update contacts for automation workflows
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono">opportunities.readonly</code>
                  <Badge variant="secondary">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Read access to opportunities for pipeline analytics
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono">opportunities.write</code>
                  <Badge variant="secondary">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage opportunities and update pipeline stages
                </p>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono">locations.readonly</code>
                  <Badge variant="secondary">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Identify location during installation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
            <CardDescription>Common issues and solutions</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="issue1">
                <AccordionTrigger>Installation fails or times out</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>
                    <strong>Solution:</strong> Try clearing your browser cache and cookies, then attempt installation again.
                    If the issue persists, contact support at support@surj.app
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="issue2">
                <AccordionTrigger>Data not syncing</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>
                    <strong>Solution:</strong> Check that your installation status is "active" in the dashboard. The daily sync
                    runs at 2 AM UTC. For immediate sync, contact support.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="issue3">
                <AccordionTrigger>Cannot access dashboard</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>
                    <strong>Solution:</strong> Ensure you're accessing the app from the custom menu item in your GHL subaccount.
                    If you still cannot access, try reinstalling the app.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="issue4">
                <AccordionTrigger>How to uninstall</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>
                    Navigate to the Merchant DataSync dashboard and click "Uninstall" in the settings. All created assets will
                    be automatically cleaned up. Your data will be retained for 30 days in case you want to reinstall.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Email:</strong> <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a>
            </p>
            <p>
              <strong>Phone:</strong> <a href="tel:+14052799100" className="text-blue-600 hover:underline">+1 405-279-9100</a>
            </p>
            <p>
              <strong>Response Time:</strong> Within 24 hours (business days)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}