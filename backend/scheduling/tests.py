from datetime import datetime

from django.test import TestCase

from .models import Machine
from .services import BookingError, create_appointment


class CreateAppointmentTests(TestCase):
    """The overlap rule is the highest-risk piece of this whole app, so
    it gets tested directly against the boundaries the brief calls out:
    back-to-back is allowed, everything else that touches an existing
    appointment is not, and the shape rules (grid, hours, duration) are
    enforced independently of the overlap check.
    """

    def setUp(self):
        self.machine = Machine.objects.create(name="MRI-1", modality=Machine.Modality.MRI)
        self.other_machine = Machine.objects.create(name="CT-1", modality=Machine.Modality.CT)

    def _dt(self, hour, minute=0):
        return datetime(2026, 7, 16, hour, minute)

    def test_creates_a_valid_appointment(self):
        appt = create_appointment(
            machine=self.machine,
            patient_name="Jane Doe",
            start_time=self._dt(9, 0),
            end_time=self._dt(9, 30),
        )
        self.assertIsNotNone(appt.id)

    def test_back_to_back_is_allowed(self):
        create_appointment(
            machine=self.machine,
            patient_name="First Patient",
            start_time=self._dt(9, 0),
            end_time=self._dt(10, 0),
        )
        second = create_appointment(
            machine=self.machine,
            patient_name="Second Patient",
            start_time=self._dt(10, 0),
            end_time=self._dt(10, 30),
        )
        self.assertIsNotNone(second.id)

    def test_overlapping_booking_is_rejected(self):
        create_appointment(
            machine=self.machine,
            patient_name="First Patient",
            start_time=self._dt(9, 0),
            end_time=self._dt(10, 0),
        )
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="Second Patient",
                start_time=self._dt(9, 30),
                end_time=self._dt(10, 30),
            )
        self.assertEqual(ctx.exception.code, "OVERLAP")

    def test_fully_contained_overlap_is_rejected(self):
        # A 90-minute booking (the longest valid duration), then a
        # shorter booking fully nested inside it -- must still be caught.
        create_appointment(
            machine=self.machine,
            patient_name="First Patient",
            start_time=self._dt(9, 0),
            end_time=self._dt(10, 30),
        )
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="Second Patient",
                start_time=self._dt(9, 30),
                end_time=self._dt(10, 0),
            )
        self.assertEqual(ctx.exception.code, "OVERLAP")

    def test_same_time_different_machine_is_allowed(self):
        create_appointment(
            machine=self.machine,
            patient_name="First Patient",
            start_time=self._dt(9, 0),
            end_time=self._dt(10, 0),
        )
        other = create_appointment(
            machine=self.other_machine,
            patient_name="Second Patient",
            start_time=self._dt(9, 0),
            end_time=self._dt(10, 0),
        )
        self.assertIsNotNone(other.id)

    def test_rejects_off_grid_start(self):
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="Jane Doe",
                start_time=self._dt(9, 15),
                end_time=self._dt(9, 45),
            )
        self.assertEqual(ctx.exception.code, "OFF_GRID")

    def test_rejects_invalid_duration(self):
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="Jane Doe",
                start_time=self._dt(9, 0),
                end_time=self._dt(9, 45),
            )
        self.assertEqual(ctx.exception.code, "INVALID_DURATION")

    def test_rejects_before_operating_hours(self):
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="Jane Doe",
                start_time=self._dt(7, 30),
                end_time=self._dt(8, 0),
            )
        self.assertEqual(ctx.exception.code, "OUTSIDE_HOURS")

    def test_rejects_after_operating_hours(self):
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="Jane Doe",
                start_time=self._dt(19, 30),
                end_time=self._dt(20, 30),
            )
        self.assertEqual(ctx.exception.code, "OUTSIDE_HOURS")

    def test_rejects_end_before_start(self):
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="Jane Doe",
                start_time=self._dt(9, 30),
                end_time=self._dt(9, 0),
            )
        self.assertEqual(ctx.exception.code, "INVALID_RANGE")

    def test_rejects_blank_patient_name(self):
        with self.assertRaises(BookingError) as ctx:
            create_appointment(
                machine=self.machine,
                patient_name="   ",
                start_time=self._dt(9, 0),
                end_time=self._dt(9, 30),
            )
        self.assertEqual(ctx.exception.code, "INVALID_PATIENT_NAME")
