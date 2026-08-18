using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Visits;

public sealed class AddPaymentRequest
{
    [Range(0.01, 100000000)]
    public decimal Amount { get; set; }

    [MaxLength(100)]
    public string? Method { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}
