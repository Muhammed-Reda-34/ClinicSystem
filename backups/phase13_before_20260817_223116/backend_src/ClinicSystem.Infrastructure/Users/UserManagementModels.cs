namespace ClinicSystem.Infrastructure.Users;
public sealed record DoctorListItem(Guid DoctorId, Guid UserId, string FullName, string Specialization, bool IsOwner, bool IsActive);
public sealed record StaffDoctorItem(Guid DoctorId, string FullName);
public sealed record StaffListItem(Guid UserId, string FullName, string Role, bool IsActive, IReadOnlyCollection<StaffDoctorItem> Doctors);
public sealed record CreateDoctorCommand(string FullName, string Email, string Password, string? Specialization);
public sealed record CreateStaffCommand(string FullName, string Email, string Password, string Role, IReadOnlyCollection<Guid> DoctorIds);
