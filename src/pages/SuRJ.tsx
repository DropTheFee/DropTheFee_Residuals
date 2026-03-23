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

interface SurjEntry {
  id: string;
  rep_user_id: string;
  period_month: string;
  entry_type: string;
  amount: number;
  merchant_name: string;
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

  const [sharedPeriod, setSharedPeriod] = useState(
    format(startOfMonth(new Date()), "yyyy-MM")
  );

  const [formData, setFormData] = useState({
    repId: "",
    merchantName: "",
    entryType: "",
    amount: "",
  });

  const [expenseFormData, setExpenseFormData] = useState({
    repId: "",
    clientName: "",
    description: "",
    amount: "",
    recurring: false,
  });

  const [selectedPeriod, setSelectedPeriod] = useState(
    format(startOfMonth(new Date()), "yyyy-MM")
  );

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchReps();
      fetchEntries();
    }
  }, [currentUser, selectedPeriod]);

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

    const entriesWithCommission = (data || []).map((entry: any) => {
      const amount = entry.entry_type === 'expense' ? Math.abs(entry.amount) : entry.amount;
      return {
        ...entry,
        rep_name: entry.rep?.full_name || "Unknown",
        commission: calculateCommission(entry.entry_type, amount),
      };
    });

    setEntries(entriesWithCommission);
  };

  const calculateCommission = (entryType: string, amount: number): number => {
    switch (entryType) {
      case "subscription":
        return amount * 0.5;
      case "setup_full":
        return amount >= 1500 ? amount * 0.15 : 0;
      case "setup_split":
        return amount * 0.1;
      case "expense":
        return 0;
      default:
        return 0;
    }
  };

  const calculateClientStats = () => {
    const clientStats = new Map<string, { revenue: number; expenses: number; net: number; repId: string; repName: string }>();

    entries.forEach((entry) => {
      const key = `${entry.rep_user_id}-${entry.merchant_name}`;
      if (!clientStats.has(key)) {
        clientStats.set(key, { revenue: 0, expenses: 0, net: 0, repId: entry.rep_user_id, repName: entry.rep_name || "" });
      }
      const stats = clientStats.get(key)!;

      if (entry.entry_type === 'expense') {
        stats.expenses += Math.abs(entry.amount);
      } else {
        stats.revenue += entry.amount;
      }
      stats.net = stats.revenue - stats.expenses;
    });

    return clientStats;
  };

  const getEntryTypeLabel = (entryType: string): string => {
    const type = ENTRY_TYPES.find((t) => t.value === entryType);
    return type ? type.label : entryType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (
      !sharedPeriod ||
      !formData.repId ||
      !formData.merchantName ||
      !formData.entryType ||
      !formData.amount
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const [year, month] = sharedPeriod.split('-').map(Number);
    const periodMonth = `${year}-${String(month).padStart(2, '0')}-01T12:00:00`;

    const { error } = await supabase.from("surj_entries").insert({
      agency_id: currentUser.agency_id,
      rep_user_id: formData.repId,
      period_month: periodMonth,
      entry_type: formData.entryType,
      amount: parseFloat(formData.amount),
      merchant_name: formData.merchantName,
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
      merchantName: "",
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
      !sharedPeriod ||
      !expenseFormData.repId ||
      !expenseFormData.clientName ||
      !expenseFormData.description ||
      !expenseFormData.amount
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const [year, month] = sharedPeriod.split('-').map(Number);
    const periodMonth = `${year}-${String(month).padStart(2, '0')}-01T12:00:00`;
    const expenseAmount = -Math.abs(parseFloat(expenseFormData.amount));

    const { error } = await supabase.from("surj_entries").insert({
      agency_id: currentUser.agency_id,
      rep_user_id: expenseFormData.repId,
      period_month: periodMonth,
      entry_type: "expense",
      amount: expenseAmount,
      merchant_name: expenseFormData.clientName,
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
      clientName: "",
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
                  value={sharedPeriod}
                  onValueChange={setSharedPeriod}
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
                <Label htmlFor="rep">Rep</Label>
                <Select
                  value={formData.repId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, repId: value })
                  }
                >
                  <SelectTrigger id="rep">
                    <SelectValue placeholder="Select rep" />
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
                <Label htmlFor="merchantName">Client/Company Name</Label>
                <Input
                  id="merchantName"
                  value={formData.merchantName}
                  onChange={(e) =>
                    setFormData({ ...formData, merchantName: e.target.value })
                  }
                  placeholder="Enter client name"
                />
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
                  value={sharedPeriod}
                  onValueChange={setSharedPeriod}
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
                <Label htmlFor="expenseRep">Rep</Label>
                <Select
                  value={expenseFormData.repId}
                  onValueChange={(value) =>
                    setExpenseFormData({ ...expenseFormData, repId: value })
                  }
                >
                  <SelectTrigger id="expenseRep">
                    <SelectValue placeholder="Select rep" />
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
                <Label htmlFor="clientName">Client/Company Name</Label>
                <Input
                  id="clientName"
                  value={expenseFormData.clientName}
                  onChange={(e) =>
                    setExpenseFormData({ ...expenseFormData, clientName: e.target.value })
                  }
                  placeholder="Must match SüRJ client"
                />
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
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No entries found for this period
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const clientStats = calculateClientStats();
                  return entries.map((entry) => {
                    const key = `${entry.rep_user_id}-${entry.merchant_name}`;
                    const stats = clientStats.get(key);
                    const isExpense = entry.entry_type === 'expense';
                    const displayAmount = isExpense ? Math.abs(entry.amount) : entry.amount;

                    return (
                      <TableRow key={entry.id} className={isExpense ? "bg-red-50" : ""}>
                        <TableCell>{entry.rep_name}</TableCell>
                        <TableCell>{entry.merchant_name}</TableCell>
                        <TableCell>{isExpense ? "Expense" : getEntryTypeLabel(entry.entry_type)}</TableCell>
                        <TableCell className={isExpense ? "text-red-600" : ""}>
                          {isExpense ? "-" : ""}${displayAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {stats && stats.expenses > 0 ? `-$${stats.expenses.toFixed(2)}` : "$0.00"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {stats ? `$${stats.net.toFixed(2)}` : `$${entry.amount.toFixed(2)}`}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {isExpense ? "$0.00" : `$${entry.commission?.toFixed(2)}`}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.period_month), "MMMM yyyy")}
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
