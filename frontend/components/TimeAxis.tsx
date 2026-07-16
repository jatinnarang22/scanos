import { PIXELS_PER_SLOT, generateSlotStarts, minutesToTimeLabel } from "@/lib/schedule";

/** The shared left-hand time labels. Row height comes from the same
 *  PIXELS_PER_SLOT constant every MachineColumn uses, so this column
 *  always lines up with the appointment grid regardless of how many
 *  slots there are. */
export default function TimeAxis() {
  const slots = generateSlotStarts();

  return (
    <div className="w-16 shrink-0 border-r border-slate-200">
      <div className="h-11 border-b border-slate-200" />
      <div>
        {slots.map((slotStart) => (
          <div
            key={slotStart}
            className="relative border-b border-slate-100"
            style={{ height: PIXELS_PER_SLOT }}
          >
            {slotStart % 60 === 0 && (
              <span className="absolute -top-2 right-2 text-[11px] font-medium text-slate-500">
                {minutesToTimeLabel(slotStart)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
