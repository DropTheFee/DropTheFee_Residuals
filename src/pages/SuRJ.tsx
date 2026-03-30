import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { startOfMonth, format } from "date-fns";

interface Rep {
  id: string;
  full_name: string;
  email: string;
}

interface SurjClient {
  id: string;
  company_name: string;
  rep_user_id: string;
}

interface SurjService {
  id: string;
  service_type: string;
  surj_client_id: string;
  surj_clients?: SurjClient;
}

interface SurjEntry {
  id: string;
  rep_user_id: string;
  period_month: string;
  entry_type: string;
  amount: number;
  merchant_name: string;
  surj_service_id?: string;
  surj_services?: SurjService;
  rep_name?: string;
  commission?: number;
}

const ENTRY_TYPES = [
  { label: "Monthly Subscription", value: "subscription" },
  { label: "Setup Fee - Full Pay", value: "setup_full" },
  { label: "Setup Fee - Split Pay Installment", value: "setup_split" },
];

export default function SuRJ() {
  const { toast } = useToast();
  const [reps, setReps] = useState<Rep[]>([]);
  const [entries, setEntries] = useState<SurjEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clients, setClients] = useState<SurjClient[]>([]);
  const [services, setServices] = useState<SurjService[]>([]);
  const [expenseServices, setExpenseServices] = useState<SurjService[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState(
    format(startOfMonth(new Date()), "yyyy-MM")
  );

  const [formData, setFormData] = useState({
    repId: "",
    clientId: "",
    serviceId: "",
    entryType: "",
    amount: "",
  });

  const [expenseFormData, setExpenseFormData] = useState({
    repId: "",
    clientId: "",
    serviceId: "",
    description: "",
    amount: "",
    recurring: false,
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchReps();
      fetchEntries();
      fetchClients();
    }
  }, [currentUser, selectedPeriod]);

  useEffect(() => {
    if (formData.clientId) {
      fetchServices(formData.clientId);
    } else {
      setServices([]);
      setFormData(prev => ({ ...prev, serviceId: "" }));
    }
  }, [formData.clientId]);

  useEffect(() => {
    if (expenseFormData.clientId) {
      fetchExpenseServices(expenseFormData.clientId);
    } else {
      setExpenseServices([]);
      setExpenseFormData(prev => ({ ...prev, serviceId: "" }));
    }
  }, [expenseFormData.clientId]);

  useEffect(() => {
    if (formData.serviceId) {
      autoPopulateRep(formData.clientId, 'entry');
    }
  }, [formData.serviceId]);

  useEffect(() => {
    if (expenseFormData.serviceId) {
      autoPopulateRep(expenseFormData.clientId, 'expense');
    }
  }, [expenseFormData.serviceId]);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    setCurrentUser(data);
  };

  const fetchReps = async () => {
    if (!currentUser) return;

    let query = supabase
      .from("users")
      .select("id, full_name, email");

    if (currentUser.role !== "superadmin") {
      query = query.eq("agency_id", currentUser.agency_id);
    }

    const { data, error } = await query.order("full_name");

    if (error) {
      toast({
        title: "Error fetching reps",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setReps(data || []);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("surj_clients")
      .select("id, company_name, rep_user_id")
      .eq("agency_id", "ed9c6a52-c619-4d92-82f2-2b9cb4b35622")
      .order("company_name");

    if (error) {
      toast({
        title: "Error fetching clients",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setClients(data || []);
  };

  const fetchServices = async (clientId: string) => {
    const { data, error } = await supabase
      .from("surj_services")
      .select("id, service_type, surj_client_id")
      .eq("surj_client_id", clientId)
      .order("service_type");

    if (error) {
      toast({
        title: "Error fetching services",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setServices(data || []);
  };

  const fetchExpenseServices = async (clientId: string) => {
    const { data, error } = await supabase
      .from("surj_services")
      .select("id, service_type, surj_client_id")
      .eq("surj_client_id", clientId)
      .order("service_type");

    if (error) {
      toast({
        title: "Error fetching services",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setExpenseServices(data || []);
  };

  const autoPopulateRep = async (clientId: string, formType: 'entry' | 'expense') => {
    const client = clients.find(c => c.id === clientId);
    if (client && client.rep_user_id) {
      if (formType === 'entry') {
        setFormData(prev => ({ ...prev, repId: client.rep_user_id }));
      } else {
        setExpenseFormData(prev => ({ ...prev, repId: client.rep_user_id }));
      }
    }
  };

  const fetchEntries = async () => {
    if (!currentUser) return;

    const periodDate = new Date(selectedPeriod + "-01T12:00:00Z");

    let query = supabase
      .from("surj_entries")
      .select(
        `
        id,
        rep_user_id,
        period_month,
        entry_type,
        amount,
        merchant_name,
        surj_service_id,
        surj_services (
          id,
          service_type,
          surj_client_id,
          surj_clients (
            id,
            company_name
          )
        ),
        rep:rep_user_id (
          full_name
        )
      `
      )
      .eq("period_month", periodDate.toISOString());

    if (currentUser.role !== "superadmin") {
      query = query.eq("agency_id", currentUser.agency_id);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      toast({
        title: "Error fetching entries",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEntries((data || []).map((entry: any) => ({
      ...entry,
      rep_name: entry.rep?.full_name || "Unknown",
    })));
  };

  const processEntriesForDisplay = () => {
    const expensesMap = new Map<string, number>();

    entries.forEach((entry) => {
      if (entry.entry_type === 'expense' && entry.surj_service_id) {
        const current = expensesMap.get(entry.surj_service_id) || 0;
        expensesMap.set(entry.surj_service_id, current + Math.abs(entry.amount));
      }
    });

    const displayEntries: any[] = [];

    entries.forEach(entry => {
      if (entry.entry_type === 'expense') {
        return;
      }

      const expenseAmount = entry.surj_service_id ? (expensesMap.get(entry.surj_service_id) || 0) : 0;
      const netRevenue = Math.max(0, entry.amount - expenseAmount);

      let commission = 0;
      if (netRevenue > 0) {
        switch (entry.entry_type) {
          case "subscription":
            commission = netRevenue * 0.5;
            break;
          case "setup_full":
            commission = entry.amount >= 1500 ? netRevenue * 0.15 : 0;
            break;
          case "setup_split":
            commission = netRevenue * 0.1;
            break;
        }
      }

      displayEntries.push({
        ...entry,
        expenseAmount,
        netRevenue,
        commission,
      });
    });

    return displayEntries;
  };

  const getEntryTypeLabel = (entryType: string): string => {
    const type = ENTRY_TYPES.find((t) => t.value === entryType);
    return type ? type.label : entryType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (
      !selectedPeriod ||
      !formData.repId ||
      !formData.serviceId ||
      !formData.entryType ||
      !formData.amount
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields including service selection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const [year, month] = selectedPeriod.split('-').map(Number);
    const periodMonth = `${year}-${String(month).padStart(2, '0')}-01T12:00:00`;

    const selectedClient = clients.find(c => c.id === formData.clientId);

    const { error } = await supabase.from("surj_entries").insert({
      agency_id: currentUser.agency_id,
      rep_user_id: formData.repId,
      period_month: periodMonth,
      entry_type: formData.entryType,
      amount: parseFloat(formData.amount),
      merchant_name: selectedClient?.company_name || "",
      surj_service_id: formData.serviceId,
      created_by: currentUser.id,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error adding entry",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Entry added",
      description: "SüRJ entry has been added successfully",
    });

    setFormData({
      repId: "",
      clientId: "",
      serviceId: "",
      entryType: "",
      amount: "",
    });

    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("surj_entries").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting entry",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Entry deleted",
      description: "SüRJ entry has been deleted successfully",
    });

    fetchEntries();
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (
      !selectedPeriod ||
      !expenseFormData.repId ||
      !expenseFormData.serviceId ||
      !expenseFormData.description ||
      !expenseFormData.amount
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields including service selection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const [year, month] = selectedPeriod.split('-').map(Number);
    const periodMonth = `${year}-${String(month).padStart(2, '0')}-01T12:00:00`;
    const expenseAmount = -Math.abs(parseFloat(expenseFormData.amount));

    const selectedClient = clients.find(c => c.id === expenseFormData.clientId);

    const { error } = await supabase.from("surj_entries").insert({
      agency_id: currentUser.agency_id,
      rep_user_id: expenseFormData.repId,
      period_month: periodMonth,
      entry_type: "expense",
      amount: expenseAmount,
      merchant_name: `${selectedClient?.company_name || ""} - ${expenseFormData.description}`,
      surj_service_id: expenseFormData.serviceId,
      created_by: currentUser.id,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Expense added",
      description: "SüRJ expense has been added successfully",
    });

    setExpenseFormData({
      repId: "",
      clientId: "",
      serviceId: "",
      description: "",
      amount: "",
      recurring: false,
    });

    fetchEntries();
  };

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const value = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy");
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">SüRJ Platform</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add SüRJ Entry</CardTitle>
          <CardDescription>
            Record revenue from the SüRJ platform for commission calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: value })
                  }
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service">Service Type</Label>
                <Select
                  value={formData.serviceId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, serviceId: value })
                  }
                  disabled={!formData.clientId}
                >
                  <SelectTrigger id="service">
                    <SelectValue placeholder={formData.clientId ? "Select service" : "Select client first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.service_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rep">Rep</Label>
                <Select
                  value={formData.repId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, repId: value })
                  }
                >
                  <SelectTrigger id="rep">
                    <SelectValue placeholder="Auto-populated" />
                  </SelectTrigger>
                  <SelectContent>
                    {reps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.full_name || rep.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryType">Entry Type</Label>
                <Select
                  value={formData.entryType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, entryType: value })
                  }
                >
                  <SelectTrigger id="entryType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add SüRJ Expense</CardTitle>
          <CardDescription>
            Record expenses against SüRJ clients (reduces net revenue for commission)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expensePeriod">Period</Label>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger id="expensePeriod">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseClient">Client</Label>
                <Select
                  value={expenseFormData.clientId}
                  onValueChange={(value) =>
                    setExpenseFormData({ ...expenseFormData, clientId: value })
                  }
                >
                  <SelectTrigger id="expenseClient">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseService">Service Type</Label>
                <Select
                  value={expenseFormData.serviceId}
                  onValueChange={(value) =>
                    setExpenseFormData({ ...expenseFormData, serviceId: value })
                  }
                  disabled={!expenseFormData.clientId}
                >
                  <SelectTrigger id="expenseService">
                    <SelectValue placeholder={expenseFormData.clientId ? "Select service" : "Select client first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.service_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseRep">Rep</Label>
                <Select
                  value={expenseFormData.repId}
                  onValueChange={(value) =>
                    setExpenseFormData({ ...expenseFormData, repId: value })
                  }
                >
                  <SelectTrigger id="expenseRep">
                    <SelectValue placeholder="Auto-populated" />
                  </SelectTrigger>
                  <SelectContent>
                    {reps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.full_name || rep.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDescription">Description</Label>
                <Input
                  id="expenseDescription"
                  value={expenseFormData.description}
                  onChange={(e) =>
                    setExpenseFormData({ ...expenseFormData, description: e.target.value })
                  }
                  placeholder="e.g. Google Ads Management"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseAmount">Amount</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  step="0.01"
                  value={expenseFormData.amount}
                  onChange={(e) =>
                    setExpenseFormData({ ...expenseFormData, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 flex items-end pb-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="recurring"
                    checked={expenseFormData.recurring}
                    onCheckedChange={(checked) =>
                      setExpenseFormData({ ...expenseFormData, recurring: checked })
                    }
                  />
                  <Label htmlFor="recurring">Recurring</Label>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SüRJ Entries</CardTitle>
          <CardDescription>View and manage SüRJ platform entries</CardDescription>
          <div className="mt-4">
            <Label htmlFor="viewPeriod">View Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger id="viewPeriod" className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep Name</TableHead>
                <TableHead>Client/Company</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Entry Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net Revenue</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Period</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No entries found for this period
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const displayEntries = processEntriesForDisplay();
                  return displayEntries.map((entry: any) => {
                    const periodDate = new Date(entry.period_month.replace(/Z$/, '') + (entry.period_month.includes('T') ? '' : 'T12:00:00'));

                    const clientName = entry.surj_services?.surj_clients?.company_name || entry.merchant_name;
                    const serviceType = entry.surj_services?.service_type || '-';

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.rep_name}</TableCell>
                        <TableCell>{clientName}</TableCell>
                        <TableCell>{serviceType}</TableCell>
                        <TableCell>{getEntryTypeLabel(entry.entry_type)}</TableCell>
                        <TableCell>${entry.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">
                          {entry.expenseAmount > 0 ? `-$${entry.expenseAmount.toFixed(2)}` : "$0.00"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${entry.netRevenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ${entry.commission.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {format(periodDate, "MMMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
