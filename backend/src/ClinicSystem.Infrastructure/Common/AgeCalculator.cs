namespace ClinicSystem.Infrastructure.Common;

public static class AgeCalculator
{
    public static int? Calculate(DateOnly? dateOfBirth, DateOnly? onDate = null)
    {
        if (dateOfBirth is null)
        {
            return null;
        }

        var today = onDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        if (dateOfBirth.Value > today)
        {
            return null;
        }

        var age = today.Year - dateOfBirth.Value.Year;

        if (dateOfBirth.Value.AddYears(age) > today)
        {
            age--;
        }

        return age;
    }
}
