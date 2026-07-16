import { MODALITY_LABEL } from "@/lib/theme";
import type { Modality } from "@/lib/types";

const ALL_MODALITIES: Modality[] = ["mri", "ct", "ultrasound"];

interface ModalityFilterProps {
  selected: Modality | "all";
  onChange: (value: Modality | "all") => void;
}

export default function ModalityFilter({ selected, onChange }: ModalityFilterProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          selected === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        All
      </button>
      {ALL_MODALITIES.map((modality) => (
        <button
          key={modality}
          type="button"
          onClick={() => onChange(modality)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            selected === modality ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {MODALITY_LABEL[modality]}
        </button>
      ))}
    </div>
  );
}
