import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">Last Updated: January 27, 2024</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Merchant DataSync ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our GoHighLevel
              integration service ("the Service").
            </p>
            <p>
              By using the Service, you consent to the data practices described in this policy. If you do not agree
              with this policy, please do not use the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold">2.1 Information from GoHighLevel</h3>
            <p>When you install and use the Service, we access and process the following data from your GoHighLevel account:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Contacts:</strong> Contact names, email addresses, phone numbers, and custom fields</li>
              <li><strong>Opportunities:</strong> Opportunity names, stages, values, and pipeline information</li>
              <li><strong>Calendars:</strong> Appointment data and scheduling information</li>
              <li><strong>Locations:</strong> Location ID and basic location information</li>
              <li><strong>Users:</strong> User IDs and names for task assignment</li>
            </ul>

            <h3 className="font-semibold mt-4">2.2 OAuth Tokens</h3>
            <p>
              We store OAuth access tokens and refresh tokens to maintain your connection with GoHighLevel. These tokens
              are encrypted using AES-256-GCM encryption and stored securely in our database.
            </p>

            <h3 className="font-semibold mt-4">2.3 Usage Information</h3>
            <p>We automatically collect certain information about your use of the Service:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Installation and uninstallation events</li>
              <li>Job execution logs (success/failure status)</li>
              <li>API request logs (without sensitive data)</li>
              <li>Error logs (with sensitive data redacted)</li>
            </ul>

            <h3 className="font-semibold mt-4">2.4 Information We Do NOT Collect</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Passwords or login credentials</li>
              <li>Credit card or payment information</li>
              <li>Full contact lists (only sample data for analytics)</li>
              <li>Conversation history or message content</li>
              <li>Social Security numbers or government IDs</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Service Delivery:</strong> To provide daily data synchronization and real-time updates</li>
              <li><strong>Analytics:</strong> To generate insights and reports about your merchant data</li>
              <li><strong>Automation:</strong> To execute automated workflows and update data in GoHighLevel</li>
              <li><strong>Support:</strong> To troubleshoot issues and provide customer support</li>
              <li><strong>Security:</strong> To detect and prevent fraud, abuse, and security incidents</li>
              <li><strong>Compliance:</strong> To maintain audit logs for compliance and legal requirements</li>
              <li><strong>Improvement:</strong> To improve the Service and develop new features</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data Storage and Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold">4.1 Where We Store Data</h3>
            <p>
              Your data is stored in Supabase PostgreSQL databases hosted on secure cloud infrastructure. All data is
              stored in data centers with enterprise-grade physical and network security.
            </p>

            <h3 className="font-semibold mt-4">4.2 Security Measures</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Encryption:</strong> All OAuth tokens are encrypted using AES-256-GCM encryption</li>
              <li><strong>HTTPS:</strong> All data transmission uses HTTPS/TLS encryption</li>
              <li><strong>Row Level Security:</strong> Database-level access control ensures users can only access their own data</li>
              <li><strong>Audit Logging:</strong> All data access and modifications are logged for security monitoring</li>
              <li><strong>Logging Redaction:</strong> Sensitive data is automatically redacted from logs</li>
              <li><strong>Access Control:</strong> Strict access controls limit who can access your data</li>
            </ul>

            <h3 className="font-semibold mt-4">4.3 Data Retention</h3>
            <p>We retain your data for the following periods:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Installation Records:</strong> 30 days after uninstallation</li>
              <li><strong>Audit Logs:</strong> 90 days for compliance purposes</li>
              <li><strong>User Data:</strong> Deleted immediately upon uninstallation</li>
              <li><strong>Sync Data:</strong> Deleted immediately upon uninstallation</li>
              <li><strong>Job Run History:</strong> 30 days after uninstallation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Data Sharing and Disclosure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold">5.1 We Do NOT Sell Your Data</h3>
            <p>
              We will never sell, rent, or trade your personal information or GoHighLevel data to third parties for
              marketing purposes.
            </p>

            <h3 className="font-semibold mt-4">5.2 Service Providers</h3>
            <p>We may share your data with trusted service providers who assist us in operating the Service:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Supabase:</strong> Database hosting and management</li>
              <li><strong>Vercel:</strong> Application hosting and deployment</li>
              <li><strong>GoHighLevel:</strong> OAuth integration and API access</li>
            </ul>
            <p>
              These service providers are contractually obligated to protect your data and use it only for the purposes
              we specify.
            </p>

            <h3 className="font-semibold mt-4">5.3 Legal Requirements</h3>
            <p>We may disclose your information if required by law or in response to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Valid legal process (subpoena, court order, etc.)</li>
              <li>Government or regulatory requests</li>
              <li>Protecting our rights, property, or safety</li>
              <li>Preventing fraud or security threats</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Your Rights (GDPR Compliance)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>If you are located in the European Economic Area (EEA), you have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Right to Access:</strong> Request a copy of your personal data we hold</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to Restriction:</strong> Request limitation of data processing</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to certain types of data processing</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a>. We will
              respond to your request within 30 days.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Data Breach Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              In the event of a data breach that affects your personal information, we will notify you within 72 hours
              of discovering the breach. The notification will include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The nature of the breach</li>
              <li>What data was affected</li>
              <li>Steps we are taking to address the breach</li>
              <li>Recommendations for protecting your information</li>
            </ul>
            <p className="mt-4">
              Report security concerns to{' '}
              <a href="mailto:security@surj.app" className="text-blue-600 hover:underline">security@surj.app</a>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Service is not intended for use by children under the age of 18. We do not knowingly collect personal
              information from children under 18. If you become aware that a child has provided us with personal information,
              please contact us immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Your data may be transferred to and processed in countries other than your country of residence. These
              countries may have different data protection laws. By using the Service, you consent to the transfer of
              your data to the United States and other countries where our service providers operate.
            </p>
            <p>
              We ensure that appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Service uses minimal cookies for essential functionality only:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Session Cookies:</strong> To maintain your login session</li>
              <li><strong>CSRF Tokens:</strong> To protect against cross-site request forgery</li>
            </ul>
            <p>
              We do not use tracking cookies, analytics cookies, or advertising cookies. We do not track your browsing
              activity outside of the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Sending an email to the address associated with your account</li>
              <li>Posting a notice in the Service</li>
              <li>Updating the "Last Updated" date at the top of this policy</li>
            </ul>
            <p className="mt-4">
              Your continued use of the Service after such modifications constitutes your acceptance of the updated
              Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
              please contact us:
            </p>
            <ul className="space-y-2">
              <li><strong>Email:</strong> <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a></li>
              <li><strong>Phone:</strong> <a href="tel:+14052799100" className="text-blue-600 hover:underline">+1 405-279-9100</a></li>
              <li><strong>Security:</strong> <a href="mailto:security@surj.app" className="text-blue-600 hover:underline">security@surj.app</a></li>
              <li><strong>Data Protection:</strong> <a href="mailto:legal@surj.app" className="text-blue-600 hover:underline">legal@surj.app</a></li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 Merchant DataSync. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}