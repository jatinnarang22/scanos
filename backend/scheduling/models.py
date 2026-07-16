from django.db import models


class Machine(models.Model):
    """A scanning machine in the imaging center's fleet.

    No CRUD is needed for machines per the brief -- they're seeded once
    (see scheduling/management/commands/seed.py) and treated as static
    reference data for the lifetime of the app.
    """

    class Modality(models.TextChoices):
        MRI = "mri", "MRI"
        CT = "ct", "CT"
        ULTRASOUND = "ultrasound", "Ultrasound"

    name = models.CharField(max_length=50, unique=True)
    modality = models.CharField(max_length=20, choices=Modality.choices)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Appointment(models.Model):
    """A single booking of a machine for a patient over a time range.

    start_time / end_time are stored as timezone-aware DateTimeFields
    (not separate date + time columns). That's a deliberate choice: the
    overlap query and the "is this on the 30-minute grid" check both
    become simple comparisons/arithmetic on a single instant, rather than
    having to stitch a date and a time back together every time we need
    to reason about ordering. Filtering "appointments for a given date"
    is then just a start_time range filter for that calendar day.
    """

    machine = models.ForeignKey(
        Machine, on_delete=models.CASCADE, related_name="appointments"
    )
    patient_name = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["machine", "start_time"]),
        ]

    def __str__(self):
        return f"{self.patient_name} on {self.machine.name} ({self.start_time} - {self.end_time})"
