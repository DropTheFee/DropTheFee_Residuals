import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mail, Phone, MessageSquare } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Support Center
          </h1>
          <p className="text-lg text-muted-foreground">
            We're here to help! Get in touch with our support team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Mail className="w-8 h-8 mb-2 text-blue-600" />
              <CardTitle>Email Support</CardTitle>
              <CardDescription>Get help via email</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:support@surj.app" className="text-blue-600 hover:underline font-semibold">
                support@surj.app
              </a>
              <p className="text-sm text-muted-foreground mt-2">Response within 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Phone className="w-8 h-8 mb-2 text-blue-600" />
              <CardTitle>Phone Support</CardTitle>
              <CardDescription>Call us directly</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="tel:+14052799100" className="text-blue-600 hover:underline font-semibold">
                +1 405-279-9100
              </a>
              <p className="text-sm text-muted-foreground mt-2">Mon-Fri, 9 AM - 5 PM CST</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="w-8 h-8 mb-2 text-blue-600" />
              <CardTitle>Documentation</CardTitle>
              <CardDescription>Self-service help</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/docs" className="text-blue-600 hover:underline font-semibold">
                View Documentation
              </a>
              <p className="text-sm text-muted-foreground mt-2">Installation guides & FAQs</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq1">
                <AccordionTrigger>How do I install Merchant DataSync?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    Installation is simple and takes 30-60 seconds. Go to the GoHighLevel Marketplace, search for "Merchant DataSync",
                    click Install, authorize the required permissions, select your location, and you're done! See our{' '}
                    <a href="/docs" className="text-blue-600 hover:underline">documentation</a> for detailed steps.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq2">
                <AccordionTrigger>What permissions does the app need?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    Merchant DataSync requires read/write access to contacts and opportunities, read access to locations, calendars,
                    and users. These permissions are necessary for syncing data and providing automation features. All data is
                    encrypted and secured with enterprise-grade security.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq3">
                <AccordionTrigger>How often does data sync?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    The daily sync runs automatically every day at 2 AM UTC. Real-time updates are also available through webhooks
                    for instant notifications when contacts or opportunities are created or updated.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq4">
                <AccordionTrigger>Is my data secure?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    Yes! We use AES-256 encryption for all OAuth tokens, Row Level Security (RLS) for database access control,
                    and comprehensive audit logging. All data is transmitted over HTTPS. We are GDPR compliant and follow
                    industry best practices for data security.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq5">
                <AccordionTrigger>How do I uninstall the app?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    Navigate to the Merchant DataSync dashboard and click "Uninstall" in the settings. All webhooks and created
                    assets will be automatically cleaned up. Your data will be retained for 30 days in case you want to reinstall.
                    After 30 days, all data is permanently deleted.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq6">
                <AccordionTrigger>What happens to my data after uninstall?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    Installation records are retained for 30 days, audit logs for 90 days, and user/sync data is deleted immediately.
                    This retention period allows you to reinstall without losing your configuration. After the retention period,
                    all data is permanently deleted.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq7">
                <AccordionTrigger>Can I export my data?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    Yes! You have the right to access and export your data at any time. Contact us at{' '}
                    <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a> with your
                    data export request, and we'll provide your data in a portable format within 48 hours.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq8">
                <AccordionTrigger>Do you offer phone support?</AccordionTrigger>
                <AccordionContent>
                  <p>
                    Yes! Call us at <a href="tel:+14052799100" className="text-blue-600 hover:underline">+1 405-279-9100</a> during
                    business hours (Mon-Fri, 9 AM - 5 PM CST). For after-hours support, email us at{' '}
                    <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a> and we'll
                    respond within 24 hours.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report a Bug or Request a Feature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Found a bug or have an idea for a new feature? We'd love to hear from you!
            </p>
            <div className="space-y-2">
              <p>
                <strong>Bug Reports:</strong> Email{' '}
                <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a> with
                details about the issue, steps to reproduce, and any error messages.
              </p>
              <p>
                <strong>Feature Requests:</strong> Email{' '}
                <a href="mailto:support@surj.app" className="text-blue-600 hover:underline">support@surj.app</a> with
                a description of the feature and how it would help your workflow.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Phone Support:</strong> Monday - Friday, 9 AM - 5 PM CST</p>
              <p><strong>Email Support:</strong> 24/7 (response within 24 hours)</p>
              <p><strong>Emergency Support:</strong> For critical issues, call +1 405-279-9100 and leave a message</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}