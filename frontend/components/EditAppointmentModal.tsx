"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiRequestError, getAppointments, updateAppointment } from "@/lib/api";
import {
  DAY_END_MINUTES,
  VALID_DURATIONS_MINUTES,
  buildIsoDateTime,
  generateSlotStarts,
  minutesToTimeLabel,
  timeStringToMinutes,
} from "@/lib/schedule";
import { MODALITY_LABEL } from "@/lib/theme";
import type { Appointment, Machine } from "@/lib/types";

interface EditAppointmentModalProps {
  appointment: Appointment;
  machines: Machine[];
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
  onRequestCancel: () => void;
}

/** Full edit form for an existing booking: machine, patient, date, time,
 *  and notes are all changeable. The time controls are the tricky part
 *  -- see the availability effect below -- everything else is a plain
 *  controlled input following BookingModal's conventions. */
export default function EditAppointmentModal({
  appointment,
  machines,
  onClose,
  onSaved,
  onRequestCancel,
}: EditAppointmentModalProps) {
  const [machineId, setMachineId] = useState(appointment.machine);
  const [patientName, setPatientName] = useState(appointment.patient_name);
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [dateStr, setDateStr] = useState(appointment.start_time.slice(0, 10));
  const [startMinutes, setStartMinutes] = useState(
    timeStringToMinutes(appointment.start_time)
  );
  const [duration, setDuration] = useState(
    timeStringToMinutes(appointment.end_time) - timeStringToMinutes(appointment.start_time)
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Every other booking on the chosen machine/date, refetched whenever
  // either changes, so the time picker can rule out slots that would
  // overlap -- the same rule the backend enforces, surfaced up front
  // instead of only discovered on submit.
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Same "refetch when the dependency changes" pattern used by
    // useAppointments/useMachines -- see those for why this is
    // suppressed rather than restructured.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingAvailability(true);
    getAppointments(dateStr, machineId)
      .then((data) => {
        if (!cancelled) setDayAppointments(data);
      })
      .catch(() => {
        if (!cancelled) setDayAppointments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateStr, machineId]);

  const slotStarts = useMemo(() => generateSlotStarts(), []);

  const isRangeFree = useMemo(() => {
    return (start: number, durationMinutes: number) => {
      const end = start + durationMinutes;
      if (end > DAY_END_MINUTES) return false;
      return !dayAppointments.some((other) => {
        if (other.id === appointment.id) return false;
        const otherStart = timeStringToMinutes(other.start_time);
        const otherEnd = timeStringToMinutes(other.end_time);
        return start < otherEnd && end > otherStart;
      });
    };
  }, [dayAppointments, appointment.id]);

  // Changing the machine, date, or duration can invalidate the
  // currently selected start time (it might now run past close, or
  // land on top of another booking). Rather than silently snapping the
  // selection somewhere else, the start dropdown just disables whatever
  // no longer fits and the banner below tells the user to pick again --
  // predictable, and it avoids the value briefly disagreeing with what
  // the picker shows while dayAppointments is still loading.
  const currentRangeIsFree = !loadingAvailability && isRangeFree(startMinutes, duration);
  const noSlotFitsDuration =
    !loadingAvailability && !slotStarts.some((s) => isRangeFree(s, duration));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!patientName.trim()) {
      setErrorMessage("Patient name is required.");
      return;
    }
    if (!currentRangeIsFree) {
      setErrorMessage("That time is no longer available. Pick a different time.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await updateAppointment(appointment.id, {
        machine: machineId,
        patient_name: patientName.trim(),
        start_time: buildIsoDateTime(dateStr, startMinutes),
        end_time: buildIsoDateTime(dateStr, startMinutes + duration),
        notes: notes.trim(),
      });
      onSaved(updated);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : "Could not save these changes. Please try again.";
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">Edit booking</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Update the details below, or cancel the booking entirely.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="edit-patient-name">
              Patient name
            </label>
            <input
              id="edit-patient-name"
              type="text"
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Jane Doe"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="edit-machine">
              Machine
            </label>
            <select
              id="edit-machine"
              value={machineId}
              onChange={(event) => setMachineId(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name} ({MODALITY_LABEL[machine.modality]})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="edit-date">
                Date
              </label>
              <input
                id="edit-date"
                type="date"
                value={dateStr}
                onChange={(event) => setDateStr(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="edit-start-time">
                Start time
              </label>
              <select
                id="edit-start-time"
                value={startMinutes}
                onChange={(event) => setStartMinutes(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {slotStarts.map((slot) => {
                  const free = isRangeFree(slot, duration);
                  return (
                    <option key={slot} value={slot} disabled={!free}>
                      {minutesToTimeLabel(slot)}
                      {!free ? " — booked" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
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
            <p className="mt-1.5 text-xs text-slate-500">
              {loadingAvailability
                ? "Checking availability…"
                : `Ends at ${minutesToTimeLabel(startMinutes + duration)}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="edit-notes">
              Notes / message
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional -- prep instructions, contact info, anything worth flagging."
            />
          </div>

          {noSlotFitsDuration && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No {duration}-minute slot is free on {dateStr} for this machine. Try a different
              duration, date, or machine.
            </div>
          )}

          {!noSlotFitsDuration && !currentRangeIsFree && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              That start time now conflicts with another booking. Pick a different start time
              above.
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onRequestCancel}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Cancel booking
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || loadingAvailability || !currentRangeIsFree}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
