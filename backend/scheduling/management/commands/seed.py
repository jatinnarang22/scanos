from datetime import date, datetime, time

from django.core.management.base import BaseCommand

from scheduling.models import Appointment, Machine
from scheduling.services import create_appointment


class Command(BaseCommand):
    help = "Seed the 3 machines and ~10 appointments for today, so the board isn't empty on first run."

    def handle(self, *args, **options):
        machines = {}
        for name, modality in [
            ("MRI-1", Machine.Modality.MRI),
            ("CT-1", Machine.Modality.CT),
            ("Ultrasound-1", Machine.Modality.ULTRASOUND),
        ]:
            machine, _ = Machine.objects.get_or_create(name=name, defaults={"modality": modality})
            machines[name] = machine

        today = date.today()

        # Idempotent: clear today's appointments first so re-running this
        # command doesn't hit our own overlap rule on the second run.
        deleted, _ = Appointment.objects.filter(start_time__date=today).delete()
        if deleted:
            self.stdout.write(f"Cleared {deleted} existing appointment(s) for {today}.")

        def dt(hour, minute):
            return datetime.combine(today, time(hour, minute))

        seed_plan = [
            ("MRI-1", "Alice Wong", 8, 0, 9, 0),
            ("MRI-1", "Brian Lee", 9, 0, 9, 30),
            ("MRI-1", "Carla Gomez", 10, 0, 11, 30),
            ("MRI-1", "Derek Patel", 13, 0, 14, 0),
            ("CT-1", "Ethan Brooks", 8, 30, 9, 0),
            ("CT-1", "Fatima Noor", 9, 30, 10, 30),
            ("CT-1", "George Kim", 11, 0, 12, 30),
            ("CT-1", "Hana Ito", 14, 0, 14, 30),
            ("Ultrasound-1", "Isla Novak", 8, 0, 8, 30),
            ("Ultrasound-1", "Jamal Whitfield", 9, 0, 10, 0),
        ]

        created = 0
        for machine_name, patient, sh, sm, eh, em in seed_plan:
            create_appointment(
                machine=machines[machine_name],
                patient_name=patient,
                start_time=dt(sh, sm),
                end_time=dt(eh, em),
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(machines)} machines and {created} appointments for {today}."
        ))
