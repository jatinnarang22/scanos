import type {
  ApiErrorBody,
  Appointment,
  CreateAppointmentPayload,
  Machine,
  UpdateAppointmentPayload,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/**
 * Thrown for every rejected request. `code` is the backend's stable
 * error code (OVERLAP, OFF_GRID, OUTSIDE_HOURS, ...) -- components can
 * switch on it instead of pattern-matching a human sentence.
 */
export class ApiRequestError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiRequestError";
  }
}

async function parseErrorBody(res: Response): Promise<ApiRequestError> {
  try {
    const body: ApiErrorBody = await res.json();
    if (body?.error?.code && body?.error?.message) {
      return new ApiRequestError(body.error.code, body.error.message);
    }
  } catch {
    // fall through to generic error below
  }
  return new ApiRequestError(
    "UNKNOWN_ERROR",
    `Something went wrong (HTTP ${res.status}). Please try again.`
  );
}

export async function getMachines(): Promise<Machine[]> {
  const res = await fetch(`${API_BASE_URL}/machines/`);
  if (!res.ok) throw await parseErrorBody(res);
  return res.json();
}

export async function getAppointments(
  date: string,
  machineId?: number
): Promise<Appointment[]> {
  const params = new URLSearchParams({ date });
  if (machineId) params.set("machine", String(machineId));
  const res = await fetch(`${API_BASE_URL}/appointments/?${params.toString()}`);
  if (!res.ok) throw await parseErrorBody(res);
  return res.json();
}

export async function createAppointment(
  payload: CreateAppointmentPayload
): Promise<Appointment> {
  const res = await fetch(`${API_BASE_URL}/appointments/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseErrorBody(res);
  return res.json();
}

export async function updateAppointment(
  id: number,
  payload: UpdateAppointmentPayload
): Promise<Appointment> {
  const res = await fetch(`${API_BASE_URL}/appointments/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseErrorBody(res);
  return res.json();
}

export async function cancelAppointment(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/appointments/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw await parseErrorBody(res);
}
