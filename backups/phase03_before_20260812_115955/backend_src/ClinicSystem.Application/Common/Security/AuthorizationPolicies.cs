namespace ClinicSystem.Application.Common.Security;
public static class AuthorizationPolicies
{
    public const string OwnerOnly = "OwnerOnly";
    public const string DoctorAccess = "DoctorAccess";
    public const string StaffAccess = "StaffAccess";
}
