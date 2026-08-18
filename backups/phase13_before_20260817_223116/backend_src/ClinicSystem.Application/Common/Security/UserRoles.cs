namespace ClinicSystem.Application.Common.Security;
public static class UserRoles
{
    public const string Owner = "Owner";
    public const string Doctor = "Doctor";
    public const string Secretary = "Secretary";
    public const string Nurse = "Nurse";
    public static readonly string[] StaffRoles = [Secretary, Nurse];
}
