import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getRepDisplayName } from "@/utils/displayNames";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { startOfMonth } from "date-fns";

interface Rep {
  id: string;
  full_name: string;
  email: string;
}

interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  recurring: boolean;
  rep_name?: string;
}

interface ManualExpensesProps {
  selectedPeriod: string;
}

export default function ManualExpenses({ selectedPeriod }: ManualExpensesProps) {
  const { toast } = useToast();
  const [reps, setReps] = useState<Rep[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    repId: "",
    recurring: false,
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchReps();
      fetchExpenses();
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

  const fetchExpenses = async () => {
    if (!currentUser) return;

    const periodDate = new Date(selectedPeriod + "T12:00:00Z");

    let query = supabase
      .from("expenses")
      .select(
        `
        id,
        user_id,
        description,
        amount,
        recurring,
        rep:user_id (
          full_name
        )
      `
      )
      .eq("period_month", periodDate.toISOString())
      .eq("expense_type", "manual")
      .eq("status", "active");

    if (currentUser.role !== "superadmin") {
      query = query.eq("agency_id", currentUser.agency_id);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      toast({
        title: "Error fetching expenses",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const expensesWithRepName = (data || []).map((expense: any) => ({
      ...expense,
      rep_name: getRepDisplayName(expense.rep?.id, expense.rep?.full_name),
    }));

    setExpenses(expensesWithRepName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formData.description || !formData.amount || !formData.repId) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const periodDate = new Date(selectedPeriod + "T12:00:00Z");
    const expenseDate = startOfMonth(periodDate);

    const { error } = await supabase.from("expenses").insert({
      agency_id: currentUser.agency_id,
      user_id: formData.repId,
      expense_type: "manual",
      amount: parseFloat(formData.amount),
      description: formData.description,
      expense_date: expenseDate.toISOString(),
      recurring: formData.recurring,
      period_month: periodDate.toISOString(),
      status: "active",
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
      description: "Manual expense has been added successfully",
    });

    setFormData({
      description: "",
      amount: "",
      repId: "",
      recurring: false,
    });

    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Expense deleted",
      description: "Manual expense has been deleted successfully",
    });

    fetchExpenses();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter expense description"
            />
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
                    {getRepDisplayName(rep.id, rep.full_name) || rep.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurring">Recurring</Label>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="recurring"
                checked={formData.recurring}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, recurring: checked })
                }
              />
              <Label htmlFor="recurring" className="text-sm text-muted-foreground">
                {formData.recurring ? "Yes" : "No"}
              </Label>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Expense"}
        </Button>
      </form>

      {expenses.length > 0 && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.rep_name}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>${expense.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    {expense.recurring ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
