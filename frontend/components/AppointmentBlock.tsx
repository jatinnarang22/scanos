import { computeBlockGeometry, minutesToTimeLabel, timeStringToMinutes } from "@/lib/schedule";
import { MODALITY_STYLES } from "@/lib/theme";
import type { Appointment } from "@/lib/types";

interface AppointmentBlockProps {
  appointment: Appointment;
  onClick: () => void;
}

/** Position and height come from computeBlockGeometry, which is a pure
 *  function of the appointment's start/end time -- nothing here is a
 *  fixed pixel value. A 90-minute booking renders exactly 3x as tall as
 *  a 30-minute one because both derive from the same slot-to-pixel
 *  ratio. */
export default function AppointmentBlock({ appointment, onClick }: AppointmentBlockProps) {
  const { top, height } = computeBlockGeometry(appointment.start_time, appointment.end_time);
  const styles = MODALITY_STYLES[appointment.modality];
  const startLabel = minutesToTimeLabel(timeStringToMinutes(appointment.start_time));
  const endLabel = minutesToTimeLabel(timeStringToMinutes(appointment.end_time));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-colors ${styles.block}`}
      style={{ top, height: Math.max(height, 22) }}
      title={`${appointment.patient_name} · ${startLabel}–${endLabel} – click to edit`}
    >
      <div className="truncate font-semibold leading-tight">{appointment.patient_name}</div>
      <div className="truncate text-[11px] leading-tight opacity-80">
        {startLabel}–{endLabel}
      </div>
    </button>
  );
}
