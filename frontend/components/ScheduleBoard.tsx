import type { Appointment, Machine } from "@/lib/types";
import MachineColumn from "./MachineColumn";
import TimeAxis from "./TimeAxis";

interface ScheduleBoardProps {
  machines: Machine[];
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  onSlotClick: (machine: Machine, slotStartMinutes: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

/** Owns the board's loading / error / empty states, then renders one
 *  TimeAxis plus one MachineColumn per machine, sharing a single
 *  scrollable row so everything stays aligned regardless of how many
 *  machines are visible after filtering. */
export default function ScheduleBoard({
  machines,
  appointments,
  loading,
  error,
  onSlotClick,
  onAppointmentClick,
}: ScheduleBoardProps) {
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
        Loading schedule…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-4 text-center">
        <p className="text-sm font-semibold text-red-700">Couldn&rsquo;t load the schedule</p>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (machines.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
        No machines match the selected filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-w-fit">
        <TimeAxis />
        {machines.map((machine) => (
          <MachineColumn
            key={machine.id}
            machine={machine}
            appointments={appointments.filter((a) => a.machine === machine.id)}
            onSlotClick={onSlotClick}
            onAppointmentClick={onAppointmentClick}
          />
        ))}
      </div>
    </div>
  );
}
