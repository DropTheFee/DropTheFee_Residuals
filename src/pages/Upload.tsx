import { useState } from 'react';
import PendingMappings from '@/components/upload/PendingMappings';
import DynamicCSVUpload from '@/components/upload/DynamicCSVUpload';
import ExpenseUpload from '@/components/upload/ExpenseUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Upload() {
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  return (
    <div className="space-y-8">
      <PendingMappings />

      <DynamicCSVUpload />

      <div className="relative py-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-4 border-slate-600"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-900 px-6 text-lg font-bold text-slate-300 tracking-wide">
            EXPENSE UPLOAD
          </span>
        </div>
      </div>

      <ExpenseUpload />

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader
          className="cursor-pointer hover:bg-slate-800/30 transition-colors"
          onClick={() => setInstructionsOpen(!instructionsOpen)}
        >
          <CardTitle className="text-white flex items-center justify-between">
            <span>Instructions</span>
            {instructionsOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        {instructionsOpen && (
          <CardContent className="text-slate-300 space-y-2 pt-0">
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-white mb-2">Residual Upload:</p>
                <p>1. Select the report period (month and year)</p>
                <p>2. Select the processor from the dropdown</p>
                <p>3. For Paysafe/PCS: optionally enter an Oracle Agent Number to filter</p>
                <p>4. Click "Choose File" to select your file</p>
                <p>5. If using a custom processor for the first time, you'll be asked to map columns</p>
                <p>6. Click "Upload & Process" to import the data</p>
                <p className="text-slate-400 text-sm mt-2">
                  Supported formats: CSV (.csv), Excel (.xlsx, .xls)
                </p>
                <p className="text-slate-400 text-sm">
                  Note: Paysafe and PCS require .xlsx files, Link2Pay requires .xlsx or .xls files, Payarc requires .csv files
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Expense Upload:</p>
                <p>1. Select the report period (month and year)</p>
                <p>2. Select the expense vendor (currently Dejavoo)</p>
                <p>3. Click "Choose File" to select your .xlsx file</p>
                <p>4. Click "Upload & Process" to import expense data</p>
                <p className="text-slate-400 text-sm mt-2">
                  Expenses will be matched to merchants automatically
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}