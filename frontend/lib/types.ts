export type Modality = "mri" | "ct" | "ultrasound";

export interface Machine {
  id: number;
  name: string;
  modality: Modality;
}

export interface Appointment {
  id: number;
  machine: number;
  machine_name: string;
  modality: Modality;
  patient_name: string;
  /** ISO-ish datetime with no timezone suffix, e.g. "2026-07-16T09:00:00".
   *  Represents the facility's local wall-clock time -- see lib/schedule.ts
   *  for why we never run these through `new Date()` for time-of-day math. */
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface CreateAppointmentPayload {
  machine: number;
  patient_name: string;
  start_time: string;
  end_time: string;
}

/** Mirrors the backend's one error shape: {"error": {"code", "message"}}.
 *  Every rejection from the API -- validation, overlap, not-found --
 *  takes this same shape, so the frontend never has to guess at format. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
