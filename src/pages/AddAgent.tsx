import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader as Loader2 } from 'lucide-react';

interface Trainer {
  id: string;
  email: string;
  sales_rep_id: string | null;
}

const roleOptions = [
  { value: 'sr_sae', label: 'Sr SAE', contractType: 'sr_sae' },
  { value: 'jr_ae', label: 'Jr AE', contractType: 'jr_ae' },
  { value: 'katlyn_flat', label: 'Katlyn Flat', contractType: 'katlyn_flat' },
  { value: 'venture_apps', label: 'Venture Apps', contractType: 'venture_apps' },
];

const officeCodeOptions = ['RMSOK01', 'RMSOK02', 'RMSOK03', 'RMSOK05', 'RMSOK06'];

export default function AddAgent() {
  const navigate = useNavigate();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: '',
    office_code: '',
    trainer_id: '',
  });

  useEffect(() => {
    checkUserRole();
    fetchTrainers();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (userData?.role !== 'SuperAdmin') {
        navigate('/dashboard');
        return;
      }

      setCurrentUserRole(userData.role);
      setLoading(false);
    } catch (error) {
      console.error('Error checking user role:', error);
      navigate('/dashboard');
    }
  };

  const fetchTrainers = async () => {
    try {
      const { data: trainers } = await supabase
        .from('users')
        .select('id, email, sales_rep_id')
        .eq('agency_id', 'ed9c6a52-c619-4d92-82f2-2b9cb4b35622')
        .eq('role', 'sales_rep')
        .order('email');

      if (trainers) {
        setTrainers(trainers);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const getContractType = (role: string): string => {
    const roleOption = roleOptions.find(r => r.value === role);
    return roleOption?.contractType || role;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          sales_rep_id: formData.office_code === 'none' ? null : formData.office_code || null,
          trainer_id: formData.trainer_id === 'none' ? null : formData.trainer_id || null,
          agency_id: 'ed9c6a52-c619-4d92-82f2-2b9cb4b35622',
          agency_name: 'RMSOK',
          contract_type: getContractType(formData.role),
          override_target_user_id: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create agent');
      }

      setSuccessMessage(`Successfully created agent: ${formData.full_name} (${formData.email})`);
      setFormData({
        full_name: '',
        email: '',
        role: '',
        office_code: '',
        trainer_id: '',
      });
    } catch (error: any) {
      console.error('Error creating agent:', error);
      setErrorMessage(error.message || 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUserRole !== 'SuperAdmin') {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Add New Agent</CardTitle>
          <CardDescription>
            Create a new agent account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value, trainer_id: '' })}
                disabled={submitting}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role && formData.role !== 'venture_apps' && (
              <div className="space-y-2">
                <Label htmlFor="office_code">Office Code</Label>
                <Select
                  value={formData.office_code}
                  onValueChange={(value) => setFormData({ ...formData, office_code: value })}
                  disabled={submitting}
                >
                  <SelectTrigger id="office_code">
                    <SelectValue placeholder="Select an office code (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {officeCodeOptions.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.role === 'jr_ae' && (
              <div className="space-y-2">
                <Label htmlFor="trainer_id">Trainer</Label>
                <Select
                  value={formData.trainer_id}
                  onValueChange={(value) => setFormData({ ...formData, trainer_id: value })}
                  disabled={submitting}
                >
                  <SelectTrigger id="trainer_id">
                    <SelectValue placeholder="Select a trainer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {trainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.role && (
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Input
                  value={getContractType(formData.role)}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}

            {successMessage && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={submitting || !formData.full_name || !formData.email || !formData.role}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Agent...
                </>
              ) : (
                'Create Agent'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
