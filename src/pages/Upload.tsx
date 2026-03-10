import DynamicCSVUpload from '@/components/upload/DynamicCSVUpload';
import ExpenseUpload from '@/components/upload/ExpenseUpload';

export default function Upload() {
  return (
    <div className="space-y-8">
      <DynamicCSVUpload />
      <div className="border-t border-slate-700 my-8"></div>
      <ExpenseUpload />
    </div>
  );
}