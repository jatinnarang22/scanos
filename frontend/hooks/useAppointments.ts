"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, getAppointments } from "@/lib/api";
import type { Appointment } from "@/lib/types";

interface UseAppointmentsResult {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Called after a successful create so the new block appears
   *  immediately without waiting on a second round trip. */
  addLocally: (appointment: Appointment) => void;
  /** Called after a successful cancel so the block disappears
   *  immediately. */
  removeLocally: (id: number) => void;
}

/** Refetches whenever the selected date changes. Modality filtering is
 *  intentionally done client-side against this same result set (see
 *  ScheduleBoard) rather than re-fetching per filter change, since the
 *  full day's data for 3 machines is tiny and filtering is instant. */
export function useAppointments(date: string): UseAppointmentsResult {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Resetting loading/error synchronously here is the standard
    // "refetch when the dependency changes" pattern -- there's no
    // actual bug (the async work below is what matters), but the
    // newer react-hooks/set-state-in-effect rule flags any setState
    // at the top of an effect on principle. Suppressed deliberately
    // rather than reaching for a data-fetching library just to
    // satisfy one opinionated rule on a one-day-scoped exercise.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    getAppointments(date)
      .then((data) => {
        if (!cancelled) setAppointments(data);
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err instanceof ApiRequestError ? err.message : "Could not load appointments.";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  const addLocally = useCallback((appointment: Appointment) => {
    setAppointments((prev) => [...prev, appointment]);
  }, []);

  const removeLocally = useCallback((id: number) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { appointments, loading, error, refetch, addLocally, removeLocally };
}
