import { formatDateForHeading, shiftDateString, todayDateString } from "@/lib/schedule";

interface DateSwitcherProps {
  date: string;
  onChange: (date: string) => void;
}

export default function DateSwitcher({ date, onChange }: DateSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex overflow-hidden rounded-lg border border-slate-300">
        <button
          type="button"
          onClick={() => onChange(shiftDateString(date, -1))}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={() => onChange(todayDateString())}
          className="border-x border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onChange(shiftDateString(date, 1))}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Next →
        </button>
      </div>
      <span className="text-base font-semibold text-slate-900">{formatDateForHeading(date)}</span>
    </div>
  );
}
