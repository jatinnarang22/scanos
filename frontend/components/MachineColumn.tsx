import { PIXELS_PER_SLOT, boardHeight, generateSlotStarts } from "@/lib/schedule";
import { MODALITY_LABEL, MODALITY_STYLES } from "@/lib/theme";
import type { Appointment, Machine } from "@/lib/types";
import AppointmentBlock from "./AppointmentBlock";

interface MachineColumnProps {
  machine: Machine;
  appointments: Appointment[];
  onSlotClick: (machine: Machine, slotStartMinutes: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

/** One column = one machine. The empty-slot grid is a stack of clickable
 *  30-minute buttons; appointment blocks sit in an absolutely positioned
 *  overlay above them, so clicking an occupied area hits the block (to
 *  edit or cancel) while clicking anywhere else hits the underlying slot
 *  (to book). Nothing about slot count or column height is hardcoded --
 *  both come from lib/schedule.ts. */
export default function MachineColumn({
  machine,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: MachineColumnProps) {
  const slots = generateSlotStarts();
  const styles = MODALITY_STYLES[machine.modality];

  return (
    <div className="min-w-[170px] flex-1 border-l border-slate-200 first:border-l-0">
      <div className="sticky top-0 z-10 flex h-11 items-center gap-2 border-b border-slate-200 bg-white px-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
        <span className="truncate text-sm font-semibold text-slate-800">{machine.name}</span>
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.badge}`}
        >
          {MODALITY_LABEL[machine.modality]}
        </span>
      </div>

      <div className="relative">
        <div>
          {slots.map((slotStart) => (
            <button
              key={slotStart}
              type="button"
              onClick={() => onSlotClick(machine, slotStart)}
              className="block w-full border-b border-slate-100 transition-colors hover:bg-slate-50"
              style={{ height: PIXELS_PER_SLOT }}
              aria-label={`Book ${machine.name} at this time`}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0" style={{ height: boardHeight() }}>
          {appointments.map((appointment) => (
            <AppointmentBlock
              key={appointment.id}
              appointment={appointment}
              onClick={() => onAppointmentClick(appointment)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
