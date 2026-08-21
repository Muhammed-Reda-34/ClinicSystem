namespace ClinicSystem.Domain.Entities;

public sealed class PatientFormNumberCounter
{
    public int Id { get; set; } = 1;
    public long LiveStartNumber { get; set; }
    public long NextNumber { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid UpdatedByUserId { get; set; }
}
