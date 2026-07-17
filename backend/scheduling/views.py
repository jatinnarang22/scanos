from datetime import datetime

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Appointment, Machine
from .serializers import AppointmentSerializer, MachineSerializer
from .services import BookingError, create_appointment, update_appointment


def error_response(code: str, message: str, http_status=status.HTTP_400_BAD_REQUEST):
    """Every rejection from this API -- validation failure, overlap,
    not-found -- takes this one shape. The frontend only ever has to
    check response.data.error.code, never guess at a field-error format
    versus a generic-detail format.
    """
    return Response({"error": {"code": code, "message": message}}, status=http_status)


class MachineListView(APIView):
    """GET /api/machines/ -- the fleet is seeded and static, so this is
    a plain read with no filtering needed."""

    def get(self, request):
        machines = Machine.objects.all()
        return Response(MachineSerializer(machines, many=True).data)


class AppointmentListCreateView(APIView):
    """GET  /api/appointments/?date=YYYY-MM-DD&machine=<id>
    POST /api/appointments/
    """

    def get(self, request):
        date_param = request.query_params.get("date")
        if not date_param:
            return error_response(
                "MISSING_DATE", "A 'date' query parameter (YYYY-MM-DD) is required."
            )
        try:
            date = datetime.strptime(date_param, "%Y-%m-%d").date()
        except ValueError:
            return error_response(
                "INVALID_DATE", "The 'date' query parameter must be in YYYY-MM-DD format."
            )

        appointments = Appointment.objects.filter(start_time__date=date).select_related(
            "machine"
        )

        machine_param = request.query_params.get("machine")
        if machine_param:
            appointments = appointments.filter(machine_id=machine_param)

        return Response(AppointmentSerializer(appointments, many=True).data)

    def post(self, request):
        machine_id = request.data.get("machine")
        patient_name = request.data.get("patient_name", "")
        start_time_raw = request.data.get("start_time")
        end_time_raw = request.data.get("end_time")

        if not machine_id:
            return error_response("MISSING_MACHINE", "A machine is required.")
        machine = Machine.objects.filter(id=machine_id).first()
        if machine is None:
            return error_response("MACHINE_NOT_FOUND", "That machine does not exist.", status.HTTP_404_NOT_FOUND)

        try:
            start_time = datetime.fromisoformat(start_time_raw)
            end_time = datetime.fromisoformat(end_time_raw)
        except (TypeError, ValueError):
            return error_response(
                "INVALID_TIME_FORMAT",
                "start_time and end_time must be ISO-8601 datetimes, e.g. 2026-07-16T09:00:00.",
            )

        try:
            appointment = create_appointment(
                machine=machine,
                patient_name=patient_name,
                start_time=start_time,
                end_time=end_time,
            )
        except BookingError as exc:
            return error_response(exc.code, exc.message)

        return Response(
            AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED
        )


class AppointmentDetailView(APIView):
    """PATCH  /api/appointments/<id>/ -- edit an existing booking.
    DELETE /api/appointments/<id>/ -- cancellation is a hard delete.
    There's no cancellation history/audit trail requirement in the brief,
    and adding a soft-delete status field would be scope beyond what's
    asked for; noted as a call we made deliberately in the README.
    """

    def patch(self, request, pk):
        appointment = Appointment.objects.filter(pk=pk).select_related("machine").first()
        if appointment is None:
            return error_response(
                "APPOINTMENT_NOT_FOUND", "That appointment does not exist.", status.HTTP_404_NOT_FOUND
            )

        machine_id = request.data.get("machine", appointment.machine_id)
        machine = Machine.objects.filter(id=machine_id).first()
        if machine is None:
            return error_response("MACHINE_NOT_FOUND", "That machine does not exist.", status.HTTP_404_NOT_FOUND)

        patient_name = request.data.get("patient_name", appointment.patient_name)
        notes = request.data.get("notes", appointment.notes)

        start_time_raw = request.data.get("start_time")
        end_time_raw = request.data.get("end_time")
        try:
            start_time = (
                datetime.fromisoformat(start_time_raw)
                if start_time_raw is not None
                else appointment.start_time
            )
            end_time = (
                datetime.fromisoformat(end_time_raw)
                if end_time_raw is not None
                else appointment.end_time
            )
        except (TypeError, ValueError):
            return error_response(
                "INVALID_TIME_FORMAT",
                "start_time and end_time must be ISO-8601 datetimes, e.g. 2026-07-16T09:00:00.",
            )

        try:
            appointment = update_appointment(
                appointment,
                machine=machine,
                patient_name=patient_name,
                start_time=start_time,
                end_time=end_time,
                notes=notes,
            )
        except BookingError as exc:
            return error_response(exc.code, exc.message)

        return Response(AppointmentSerializer(appointment).data)

    def delete(self, request, pk):
        appointment = Appointment.objects.filter(pk=pk).first()
        if appointment is None:
            return error_response(
                "APPOINTMENT_NOT_FOUND", "That appointment does not exist.", status.HTTP_404_NOT_FOUND
            )
        appointment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
