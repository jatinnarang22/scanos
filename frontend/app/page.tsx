"use client";

import { useState } from "react";
import BookingModal from "@/components/BookingModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import DateSwitcher from "@/components/DateSwitcher";
import ModalityFilter from "@/components/ModalityFilter";
import ScheduleBoard from "@/components/ScheduleBoard";
import { useAppointments } from "@/hooks/useAppointments";
import { useMachines } from "@/hooks/useMachines";
import { ApiRequestError, cancelAppointment } from "@/lib/api";
import { todayDateString } from "@/lib/schedule";
import type { Appointment, Machine, Modality } from "@/lib/types";

export default function Home() {
  const [date, setDate] = useState(todayDateString());
  const [modalityFilter, setModalityFilter] = useState<Modality | "all">("all");

  const { machines, loading: machinesLoading, error: machinesError } = useMachines();
  const {
    appointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    addLocally,
    removeLocally,
  } = useAppointments(date);

  const [bookingTarget, setBookingTarget] = useState<{
    machine: Machine;
    slotStartMinutes: number;
  } | null>(null);

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const filteredMachines =
    modalityFilter === "all" ? machines : machines.filter((m) => m.modality === modalityFilter);
  const filteredMachineIds = new Set(filteredMachines.map((m) => m.id));
  const visibleAppointments = appointments.filter((a) => filteredMachineIds.has(a.machine));

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelAppointment(cancelTarget.id);
      removeLocally(cancelTarget.id);
      setCancelTarget(null);
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Could not cancel this appointment.";
      setCancelError(message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="mx-auto flex h-screen w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 shrink-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">ScanOS</p>
        <h1 className="text-2xl font-bold text-slate-900">Scan Slot Scheduler</h1>
        <p className="mt-1 text-sm text-slate-500">
          Click any open slot to book it. Click a booking to cancel it.
        </p>
      </header>

      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <DateSwitcher date={date} onChange={setDate} />
        <ModalityFilter selected={modalityFilter} onChange={setModalityFilter} />
      </div>

      <div className="min-h-0 flex-1">
        <ScheduleBoard
          machines={filteredMachines}
          appointments={visibleAppointments}
          loading={machinesLoading || appointmentsLoading}
          error={machinesError ?? appointmentsError}
          onSlotClick={(machine, slotStartMinutes) =>
            setBookingTarget({ machine, slotStartMinutes })
          }
          onAppointmentClick={(appointment) => {
            setCancelTarget(appointment);
            setCancelError(null);
          }}
        />
      </div>

      {bookingTarget && (
        <BookingModal
          machine={bookingTarget.machine}
          date={date}
          slotStartMinutes={bookingTarget.slotStartMinutes}
          onClose={() => setBookingTarget(null)}
          onCreated={(appointment) => {
            addLocally(appointment);
            setBookingTarget(null);
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this booking?"
          description={`${cancelTarget.patient_name} on ${cancelTarget.machine_name}`}
          confirmLabel="Cancel booking"
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelTarget(null)}
          errorMessage={cancelError}
          busy={cancelling}
        />
      )}
    </main>
  );
}
