import type { Modality } from "./types";

export const MODALITY_LABEL: Record<Modality, string> = {
  mri: "MRI",
  ct: "CT",
  ultrasound: "Ultrasound",
};

export const MODALITY_STYLES: Record<
  Modality,
  { block: string; badge: string; dot: string }
> = {
  mri: {
    block: "bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
  },
  ct: {
    block: "bg-violet-50 border-violet-300 text-violet-900 hover:bg-violet-100",
    badge: "bg-violet-100 text-violet-800",
    dot: "bg-violet-500",
  },
  ultrasound: {
    block: "bg-teal-50 border-teal-300 text-teal-900 hover:bg-teal-100",
    badge: "bg-teal-100 text-teal-800",
    dot: "bg-teal-500",
  },
};
