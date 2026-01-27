import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Terms & Conditions
          </h1>
          <p className="text-muted-foreground">Last Updated: January 27, 2024</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              By installing and using Merchant DataSync ("the Service"), you agree to be bound by these Terms and Conditions
              ("Terms"). If you do not agree to these Terms, do not install or use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you ("User" or "you") and Merchant DataSync
              ("we", "us", or "our") regarding your use of the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Merchant DataSync is a GoHighLevel integration that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Automated synchronization of contacts, opportunities, and pipeline data</li>
              <li>Real-time webhook notifications for data updates</li>
              <li>Analytics dashboard for merchant data insights</li>
              <li>Secure OAuth integration with GoHighLevel</li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with or
              without notice.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. User Obligations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate and complete information during installation</li>
              <li>Maintain the security of your GoHighLevel account credentials</li>
              <li>Use the Service in compliance with all applicable laws and regulations</li>
              <li>Not attempt to reverse engineer, decompile, or disassemble the Service</li>
              <li>Not use the Service for any illegal or unauthorized purpose</li>
              <li>Not interfere with or disrupt the Service or servers</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data Usage and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              By using the Service, you grant us permission to access and process your GoHighLevel data as necessary
              to provide the Service. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Reading and writing contacts and opportunities</li>
              <li>Accessing location and user information</li>
              <li>Creating webhooks for real-time updates</li>
            </ul>
            <p>
              All data is encrypted and secured according to our Privacy Policy. We will never sell or share your data
              with third parties without your explicit consent.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Service, including all software, code, designs, graphics, and content, is owned by Merchant DataSync
              and is protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You are granted a limited, non-exclusive, non-transferable license to use the Service for your internal
              business purposes only. This license does not grant you any ownership rights to the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MERCHANT DATASYNC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY
              OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p>
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL DAMAGES EXCEED THE AMOUNT PAID BY YOU FOR THE SERVICE
              IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
            <p>
              The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied,
              including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              You agree to indemnify, defend, and hold harmless Merchant DataSync, its officers, directors, employees,
              and agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees,
              arising out of or in any way connected with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              You may terminate your use of the Service at any time by uninstalling the app from your GoHighLevel account.
            </p>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause,
              with or without notice, effective immediately. This includes, but is not limited to, violations of these Terms
              or illegal activities.
            </p>
            <p>
              Upon termination:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your right to use the Service will immediately cease</li>
              <li>Webhooks and created assets will be automatically cleaned up</li>
              <li>Installation records will be retained for 30 days</li>
              <li>Audit logs will be retained for 90 days</li>
              <li>User and sync data will be deleted immediately</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by
              email or through the Service. Your continued use of the Service after such modifications constitutes your
              acceptance of the updated Terms.
            </p>
            <p>
              It is your responsibility to review these Terms periodically for changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Oklahoma,
              United States, without regard to its conflict of law provisions.
            </p>
            <p>
              Any disputes arising from these Terms or your use of the Service shall be resolved in the courts of
              Oklahoma County, Oklahoma.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Severability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall
              remain in full force and effect. The invalid or unenforceable provision shall be replaced with a valid
              provision that most closely matches the intent of the original provision.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Entire Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Merchant
              DataSync regarding the Service and supersede all prior agreements and understandings, whether written or oral.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="space-y-2">
              <li><strong>Email:</strong> <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a></li>
              <li><strong>Phone:</strong> <a href="tel:+14052799100" className="text-blue-600 hover:underline">+1 405-279-9100</a></li>
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