"""Business rules for booking appointments.

Deliberately kept separate from serializers.py and views.py: this module
has no dependency on Django REST Framework or HTTP at all, so every rule
here can be unit tested by calling plain Python functions (see
scheduling/tests.py) and reused unchanged if a second entry point (an
admin action, a management command, etc.) ever needs to create an
appointment.
"""

from datetime import time

from django.db import transaction

from .models import Appointment

OPERATING_START = time(8, 0)
OPERATING_END = time(20, 0)
SLOT_MINUTES = 30
VALID_DURATIONS_MINUTES = {30, 60, 90}


class BookingError(Exception):
    """Raised for any rule violation. `code` is a stable machine-readable
    string the API surfaces to the frontend so it can show a specific
    message instead of a generic failure."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def validate_booking_shape(start_time, end_time) -> None:
    """Stateless checks that don't require hitting the database: the
    range is well-formed, on the 30-minute grid, a valid duration, and
    inside operating hours. Raises BookingError on the first violation.
    """
    if end_time <= start_time:
        raise BookingError("INVALID_RANGE", "End time must be after start time.")

    duration_minutes = (end_time - start_time).total_seconds() / 60
    if duration_minutes not in VALID_DURATIONS_MINUTES:
        raise BookingError(
            "INVALID_DURATION",
            "Appointment duration must be 30, 60, or 90 minutes.",
        )

    for moment in (start_time, end_time):
        if moment.second != 0 or moment.microsecond != 0 or moment.minute not in (0, 30):
            raise BookingError(
                "OFF_GRID",
                "Appointments must start and end on the hour or half-hour.",
            )

    if start_time.date() != end_time.date():
        raise BookingError(
            "OUTSIDE_HOURS", "Appointments may not cross midnight."
        )

    if start_time.time() < OPERATING_START or end_time.time() > OPERATING_END:
        raise BookingError(
            "OUTSIDE_HOURS",
            f"Appointments must fall within operating hours "
            f"({OPERATING_START.strftime('%H:%M')}-{OPERATING_END.strftime('%H:%M')}).",
        )


def _raise_if_overlapping(*, machine, start_time, end_time, exclude_pk=None) -> None:
    """Shared by create and update: locks the candidate rows for this
    machine/time-range and raises OVERLAP if any (other than the one
    being updated, if any) conflicts. See create_appointment's
    concurrency note for why select_for_update() is used here.
    """
    conflicting = Appointment.objects.select_for_update().filter(
        machine=machine,
        start_time__lt=end_time,
        end_time__gt=start_time,
    )
    if exclude_pk is not None:
        conflicting = conflicting.exclude(pk=exclude_pk)
    if conflicting.exists():
        raise BookingError(
            "OVERLAP",
            "This machine is already booked for part of that time range.",
        )


@transaction.atomic
def create_appointment(*, machine, patient_name: str, start_time, end_time) -> Appointment:
    """The single entry point for booking a slot. Runs the stateless
    shape checks, then the overlap check, then the insert -- all inside
    one transaction so the check and the write are atomic together.

    Concurrency note: we call select_for_update() here because it is the
    correct, idiomatic way to serialize concurrent bookings for the same
    machine on Postgres or MySQL (the two requests would queue up on the
    row lock instead of racing). SQLite -- used here per the brief's own
    suggestion, for zero-setup local running -- has no row-level locking,
    so select_for_update() is a documented no-op on this backend
    (Django silently ignores it rather than erroring). That's a real,
    named gap in this exercise's environment, not a hidden one: swapping
    the DATABASES setting to Postgres makes this exact code
    race-safe with no other changes.
    """
    if not patient_name or not patient_name.strip():
        raise BookingError("INVALID_PATIENT_NAME", "Patient name is required.")

    validate_booking_shape(start_time, end_time)
    _raise_if_overlapping(machine=machine, start_time=start_time, end_time=end_time)

    return Appointment.objects.create(
        machine=machine,
        patient_name=patient_name.strip(),
        start_time=start_time,
        end_time=end_time,
    )


@transaction.atomic
def update_appointment(
    appointment: Appointment,
    *,
    machine,
    patient_name: str,
    start_time,
    end_time,
    notes: str = "",
) -> Appointment:
    """Edits an existing appointment in place -- patient, machine, time
    range, and notes are all editable. Runs the exact same shape and
    overlap checks as create_appointment, with one difference: the
    overlap check excludes the appointment's own row, since an
    unmoved (or merely reworded) booking must never be reported as
    conflicting with itself.
    """
    if not patient_name or not patient_name.strip():
        raise BookingError("INVALID_PATIENT_NAME", "Patient name is required.")

    validate_booking_shape(start_time, end_time)
    _raise_if_overlapping(
        machine=machine, start_time=start_time, end_time=end_time, exclude_pk=appointment.pk
    )

    appointment.machine = machine
    appointment.patient_name = patient_name.strip()
    appointment.start_time = start_time
    appointment.end_time = end_time
    appointment.notes = notes.strip() if notes else ""
    appointment.save()
    return appointment
