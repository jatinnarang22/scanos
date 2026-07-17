from rest_framework import serializers

from .models import Appointment, Machine


class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = ["id", "name", "modality"]


class AppointmentSerializer(serializers.ModelSerializer):
    """Read/write serializer for appointments.

    Field-level parsing only (types, required-ness) lives here. The
    scheduling *rules* -- grid alignment, operating hours, duration,
    overlap -- deliberately do NOT live in this serializer's validate().
    They live in scheduling/services.py instead, because the overlap
    check has to run inside the same locking transaction as the insert
    (see services.create_appointment), which is a concern the view
    orchestrates, not something a serializer's stateless validate()
    method is a good fit for.
    """

    machine_name = serializers.CharField(source="machine.name", read_only=True)
    modality = serializers.CharField(source="machine.modality", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "machine",
            "machine_name",
            "modality",
            "patient_name",
            "start_time",
            "end_time",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
