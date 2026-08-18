using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Common;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.PreliminaryBookings;

public sealed class PreliminaryBookingService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public PreliminaryBookingService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyCollection<PreliminaryBookingDto>> GetAsync(
        DateOnly date,
        CancellationToken cancellationToken)
    {
        return await _db.PreliminaryBookings
            .AsNoTracking()
            .Where(x => x.VisitDate == date || x.VisitDate == null)
            .OrderBy(x => x.VisitDate == null)
            .ThenBy(x => x.VisitTime == null)
            .ThenBy(x => x.VisitTime)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new PreliminaryBookingDto(
                x.Id,
                x.PatientName,
                x.PhoneNumber,
                x.VisitDate,
                x.VisitTime,
                x.AttendanceStatus,
                x.CreatedByUserId,
                x.CreatedAtUtc,
                x.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<PreliminaryBookingWriteResult> CreateAsync(
        CreatePreliminaryBookingCommand command,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var name = command.PatientName?.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            return Failure(
                "PATIENT_NAME_REQUIRED",
                "Patient name is required.");
        }

        if (name.Length > 250)
        {
            return Failure(
                "PATIENT_NAME_TOO_LONG",
                "Patient name is too long.");
        }

        var parsedPhone = PhoneNumberNormalizer.Parse(command.PhoneNumber);

        if (!parsedPhone.IsValid)
        {
            return Failure(
                parsedPhone.ErrorCode ?? "INVALID_PHONE",
                parsedPhone.ErrorMessage ?? "Phone number is invalid.");
        }

        var booking = new PreliminaryBooking
        {
            Id = Guid.NewGuid(),
            PatientName = name,
            PhoneNumber = command.PhoneNumber.Trim(),
            VisitDate = command.VisitDate,
            VisitTime = command.VisitTime,
            AttendanceStatus = AppointmentAttendanceStatus.Scheduled,
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.PreliminaryBookings.Add(booking);

        _audit.Add(
            actorUserId,
            "PreliminaryBookingCreated",
            nameof(PreliminaryBooking),
            booking.Id.ToString(),
            null,
            new
            {
                booking.PatientName,
                booking.PhoneNumber,
                booking.VisitDate,
                booking.VisitTime
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return new PreliminaryBookingWriteResult(
            true,
            null,
            null,
            booking.Id);
    }

    public async Task<PreliminaryBookingWriteResult> SetStatusAsync(
        Guid bookingId,
        AppointmentAttendanceStatus status,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (
            status != AppointmentAttendanceStatus.Attended
            && status != AppointmentAttendanceStatus.NoShow
            && status != AppointmentAttendanceStatus.Excused
        )
        {
            return Failure(
                "INVALID_ATTENDANCE_STATUS",
                "Only attended, no-show or excused are allowed.");
        }

        var booking = await _db.PreliminaryBookings
            .SingleOrDefaultAsync(
                x => x.Id == bookingId,
                cancellationToken);

        if (booking is null)
        {
            return Failure(
                "NOT_FOUND",
                "Preliminary booking was not found.");
        }

        var oldStatus = booking.AttendanceStatus;

        if (oldStatus == status)
        {
            return new PreliminaryBookingWriteResult(
                true,
                null,
                null,
                booking.Id);
        }

        booking.AttendanceStatus = status;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "PreliminaryBookingAttendanceChanged",
            nameof(PreliminaryBooking),
            booking.Id.ToString(),
            new
            {
                AttendanceStatus = oldStatus.ToString()
            },
            new
            {
                AttendanceStatus = status.ToString()
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return new PreliminaryBookingWriteResult(
            true,
            null,
            null,
            booking.Id);
    }

    private static PreliminaryBookingWriteResult Failure(
        string code,
        string message)
    {
        return new PreliminaryBookingWriteResult(
            false,
            code,
            message,
            null);
    }
}
