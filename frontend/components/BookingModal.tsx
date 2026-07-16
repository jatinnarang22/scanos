"use client";

import { useState, type FormEvent } from "react";
import { ApiRequestError, createAppointment } from "@/lib/api";
import { VALID_DURATIONS_MINUTES, buildIsoDateTime, minutesToTimeLabel } from "@/lib/schedule";
import type { Appointment, Machine } from "@/lib/types";

interface BookingModalProps {
  machine: Machine;
  date: string;
  slotStartMinutes: number;
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
}

/** Pre-filled with the machine and start time the user clicked. Errors
 *  from the server -- overlap, off-grid, whatever -- render inline as a
 *  specific message rather than closing the modal or failing silently,
 *  per the brief's explicit requirement that conflict handling live in
 *  the UI, not just the API. */
export default function BookingModal({
  machine,
  date,
  slotStartMinutes,
  onClose,
  onCreated,
}: BookingModalProps) {
  const [patientName, setPatientName] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!patientName.trim()) {
      setErrorMessage("Patient name is required.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const appointment = await createAppointment({
        machine: machine.id,
        patient_name: patientName.trim(),
        start_time: buildIsoDateTime(date, slotStartMinutes),
        end_time: buildIsoDateTime(date, slotStartMinutes + duration),
      });
      onCreated(appointment);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Could not create the booking. Please try again.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">Book {machine.name}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Starting at {minutesToTimeLabel(slotStartMinutes)}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="patient-name">
              Patient name
            </label>
            <input
              id="patient-name"
              type="text"
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Jane Doe"
              autoFocus
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">Duration</span>
            <div className="mt-1 flex gap-2">
              {VALID_DURATIONS_MINUTES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    duration === minutes
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Booking…" : "Book appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
