"use client";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  errorMessage?: string | null;
  busy?: boolean;
}

/** Generic confirm step, used for cancelling a booking. Kept separate
 *  from BookingModal since it's a much simpler, reusable shape. */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
  errorMessage,
  busy,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Cancelling…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
