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
  "Monthly Subscription",
  "Setup Fee - Full Pay",
  "Setup Fee - Split Pay Installment",
];

export default function SuRJ() {
  const { toast } = useToast();
  const [reps, setReps] = useState<Rep[]>([]);
  const [entries, setEntries] = useState<SurjEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    period: format(startOfMonth(new Date()), "yyyy-MM"),
    repId: "",
    merchantName: "",
    entryType: "",
    amount: "",
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
      .eq("auth_id", user.id)
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

    const entriesWithCommission = (data || []).map((entry: any) => ({
      ...entry,
      rep_name: entry.rep?.full_name || "Unknown",
      commission: calculateCommission(entry.entry_type, entry.amount),
    }));

    setEntries(entriesWithCommission);
  };

  const calculateCommission = (entryType: string, amount: number): number => {
    switch (entryType) {
      case "Monthly Subscription":
        return amount * 0.5;
      case "Setup Fee - Full Pay":
        return amount >= 1500 ? amount * 0.15 : 0;
      case "Setup Fee - Split Pay Installment":
        return amount * 0.1;
      default:
        return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (
      !formData.period ||
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

    const periodDate = new Date(formData.period + "-01T12:00:00Z");

    const { error } = await supabase.from("surj_entries").insert({
      agency_id: currentUser.agency_id,
      rep_user_id: formData.repId,
      period_month: periodDate.toISOString(),
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
      period: format(startOfMonth(new Date()), "yyyy-MM"),
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
                  value={formData.period}
                  onValueChange={(value) =>
                    setFormData({ ...formData, period: value })
                  }
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
                      <SelectItem key={type} value={type}>
                        {type}
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
                <TableHead>Commission</TableHead>
                <TableHead>Period</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No entries found for this period
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.rep_name}</TableCell>
                    <TableCell>{entry.merchant_name}</TableCell>
                    <TableCell>{entry.entry_type}</TableCell>
                    <TableCell>${entry.amount.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${entry.commission?.toFixed(2)}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
