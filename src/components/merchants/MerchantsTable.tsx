import { useState, useEffect } from 'react';
import { Search, TrendingUp, DollarSign, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Merchant } from '@/types';

export default function MerchantsTable() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProcessor, setFilterProcessor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<keyof Merchant>('total_lifetime_income');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single();
      console.log('agency_id:', profile?.agency_id);
      const { data, error } = await supabase
        .from('merchants')
        .select(`
          *,
          merchant_history (
            monthly_volume,
            monthly_income,
            report_date
          )
        `)
        .eq('agency_id', profile.agency_id)
        .order('merchant_name', { ascending: true });
      console.log('merchants result:', data, error);
      setMerchants(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSort = (column: keyof Merchant) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedMerchants = merchants
    .filter((merchant) => {
      const matchesSearch = merchant.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           merchant.merchant_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProcessor = filterProcessor === 'all' || merchant.processor === filterProcessor;
      const matchesStatus = filterStatus === 'all' || merchant.status === filterStatus;
      return matchesSearch && matchesProcessor && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  const totalStats = {
    totalMerchants: filteredAndSortedMerchants.length,
    totalLifetimeIncome: filteredAndSortedMerchants.reduce((sum, m) => sum + (m.total_lifetime_income || 0), 0),
    totalMonthlyAvg: filteredAndSortedMerchants.reduce((sum, m) => sum + (m.average_monthly_income || 0), 0),
    totalAnnualized: filteredAndSortedMerchants.reduce((sum, m) => sum + ((m.average_monthly_income || 0) * 12), 0)
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading merchants...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalMerchants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalLifetimeIncome)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalMonthlyAvg)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Annualized Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalAnnualized)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by merchant name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterProcessor} onValueChange={setFilterProcessor}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Processor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processors</SelectItem>
                <SelectItem value="EPI">EPI</SelectItem>
                <SelectItem value="Paysafe">Paysafe</SelectItem>
                <SelectItem value="Vivid">Vivid</SelectItem>
                <SelectItem value="Link2Pay">Link2Pay</SelectItem>
                <SelectItem value="Payarc">Payarc</SelectItem>
                <SelectItem value="CoastalPay">CoastalPay</SelectItem>
                <SelectItem value="BCMS/Card-X">BCMS/Card-X</SelectItem>
                <SelectItem value="Paya ACH">Paya ACH</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Merchants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Merchant Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('merchant_name')} className="cursor-pointer hover:bg-muted/50">
                    Merchant Name {sortBy === 'merchant_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Processor</TableHead>
                  <TableHead className="text-right">Current Volume</TableHead>
                  <TableHead className="text-right">Current Residual</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedMerchants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No merchants found. Upload a CSV file to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedMerchants.map((merchant) => {
                    const latestHistory = (merchant as any).merchant_history
                      ?.sort((a: any, b: any) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0];
                    const currentVolume = latestHistory?.monthly_volume || 0;
                    const currentIncome = latestHistory?.monthly_income || 0;
                    const lastActivity = latestHistory?.report_date
                      ? new Date(latestHistory.report_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : 'N/A';

                    return (
                      <TableRow key={merchant.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{merchant.merchant_name}</TableCell>
                        <TableCell>{merchant.processor || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(currentVolume)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(currentIncome)}</TableCell>
                        <TableCell>{lastActivity}</TableCell>
                        <TableCell>
                          <Badge variant={merchant.status === 'active' ? 'default' : 'secondary'}>
                            {merchant.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}