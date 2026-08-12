using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Persistence;

public sealed class ClinicDbContext
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public ClinicDbContext(DbContextOptions<ClinicDbContext> options)
        : base(options)
    {
    }

    public DbSet<DoctorProfile> Doctors => Set<DoctorProfile>();
    public DbSet<StaffDoctorAssignment> StaffDoctorAssignments =>
        Set<StaffDoctorAssignment>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<PatientDoctorAssignment> PatientDoctorAssignments =>
        Set<PatientDoctorAssignment>();
    public DbSet<PatientMedicalProfile> PatientMedicalProfiles =>
        Set<PatientMedicalProfile>();

    public DbSet<Appointment> Appointments => Set<Appointment>();

    public DbSet<DentalService> DentalServices => Set<DentalService>();
    public DbSet<DentalServicePriceHistory> DentalServicePriceHistory =>
        Set<DentalServicePriceHistory>();

    public DbSet<PatientVisit> PatientVisits => Set<PatientVisit>();
    public DbSet<VisitTreatmentItem> VisitTreatmentItems =>
        Set<VisitTreatmentItem>();
    public DbSet<VisitTreatmentTooth> VisitTreatmentTeeth =>
        Set<VisitTreatmentTooth>();
    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.HasPostgresExtension("pg_trgm");

        ConfigureUsers(builder);
        ConfigureDoctors(builder);
        ConfigureStaffDoctorAssignments(builder);
        ConfigureRefreshTokens(builder);

        ConfigurePatients(builder);
        ConfigurePatientDoctorAssignments(builder);
        ConfigurePatientMedicalProfiles(builder);

        ConfigureAppointments(builder);

        ConfigureDentalServices(builder);
        ConfigureDentalServicePriceHistory(builder);

        ConfigurePatientVisits(builder);
        ConfigureVisitTreatmentItems(builder);
        ConfigureVisitTreatmentTeeth(builder);
        ConfigurePayments(builder);

        ConfigureAuditLogs(builder);
        SeedRoles(builder);
    }

    private static void ConfigureUsers(ModelBuilder builder)
    {
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(x => x.FullName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true);
        });
    }

    private static void ConfigureDoctors(ModelBuilder builder)
    {
        builder.Entity<DoctorProfile>(entity =>
        {
            entity.ToTable("Doctors");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.UserId).IsUnique();

            entity.Property(x => x.Specialization)
                .HasMaxLength(150);

            entity.HasOne<ApplicationUser>()
                .WithOne()
                .HasForeignKey<DoctorProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureStaffDoctorAssignments(ModelBuilder builder)
    {
        builder.Entity<StaffDoctorAssignment>(entity =>
        {
            entity.ToTable("StaffDoctorAssignments");

            entity.HasKey(x => new
            {
                x.StaffUserId,
                x.DoctorId
            });

            entity.HasOne(x => x.Doctor)
                .WithMany(x => x.StaffAssignments)
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(x => x.StaffUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureRefreshTokens(ModelBuilder builder)
    {
        builder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.TokenHash)
                .HasMaxLength(64)
                .IsRequired();

            entity.HasIndex(x => x.TokenHash)
                .IsUnique();

            entity.HasIndex(x => new
            {
                x.UserId,
                x.ExpiresAtUtc
            });

            entity.Property(x => x.CreatedByIp)
                .HasMaxLength(100);

            entity.Property(x => x.RevokedByIp)
                .HasMaxLength(100);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePatients(ModelBuilder builder)
    {
        builder.Entity<Patient>(entity =>
        {
            entity.ToTable("Patients");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.PatientCode)
                .HasMaxLength(40)
                .IsRequired();

            entity.Property(x => x.FormNumber)
                .HasMaxLength(80);

            entity.Property(x => x.FullName)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(x => x.NormalizedFullName)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(x => x.PhoneNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.NormalizedPhone)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.AlternatePhone)
                .HasMaxLength(30);

            entity.Property(x => x.Gender)
                .HasMaxLength(30);

            entity.Property(x => x.MaritalStatus)
                .HasMaxLength(80);

            entity.Property(x => x.Occupation)
                .HasMaxLength(150);

            entity.Property(x => x.Address)
                .HasMaxLength(600);

            entity.Property(x => x.AdministrativeNotes)
                .HasMaxLength(2000);

            entity.HasIndex(x => x.PatientCode)
                .IsUnique();

            entity.HasIndex(x => x.FormNumber)
                .IsUnique();

            entity.HasIndex(x => x.NormalizedPhone);

            entity.HasIndex(x => x.NormalizedFullName);

            entity.HasIndex(x => new
            {
                x.IsBlacklisted,
                x.UpdatedAtUtc
            });

            entity.HasIndex(x => x.FullName)
                .HasMethod("gin")
                .HasOperators("gin_trgm_ops");
        });
    }

    private static void ConfigurePatientDoctorAssignments(ModelBuilder builder)
    {
        builder.Entity<PatientDoctorAssignment>(entity =>
        {
            entity.ToTable("PatientDoctorAssignments");

            entity.HasKey(x => new
            {
                x.PatientId,
                x.DoctorId
            });

            entity.HasIndex(x => x.DoctorId);

            entity.HasOne(x => x.Patient)
                .WithMany(x => x.DoctorAssignments)
                .HasForeignKey(x => x.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Doctor)
                .WithMany()
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigurePatientMedicalProfiles(ModelBuilder builder)
    {
        builder.Entity<PatientMedicalProfile>(entity =>
        {
            entity.ToTable("PatientMedicalProfiles");

            entity.HasKey(x => x.PatientId);

            entity.Property(x => x.DrugAllergyDetails)
                .HasMaxLength(1000);

            entity.Property(x => x.OtherConditions)
                .HasMaxLength(1500);

            entity.Property(x => x.RecentHospitalizationReason)
                .HasMaxLength(1500);

            entity.Property(x => x.MedicalNotes)
                .HasMaxLength(3000);

            entity.Property(x => x.PatientSignatureName)
                .HasMaxLength(250);

            entity.HasOne(x => x.Patient)
                .WithOne(x => x.MedicalProfile)
                .HasForeignKey<PatientMedicalProfile>(x => x.PatientId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureAppointments(ModelBuilder builder)
    {
        builder.Entity<Appointment>(entity =>
        {
            entity.ToTable("Appointments");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Reason)
                .HasMaxLength(500);

            entity.Property(x => x.Notes)
                .HasMaxLength(1500);

            entity.HasIndex(x => new
            {
                x.DoctorId,
                x.ScheduledAtUtc
            });

            entity.HasIndex(x => new
            {
                x.PatientId,
                x.ScheduledAtUtc
            });

            entity.HasIndex(x => x.AttendanceStatus);

            entity.HasOne(x => x.Patient)
                .WithMany(x => x.Appointments)
                .HasForeignKey(x => x.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Doctor)
                .WithMany()
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureDentalServices(ModelBuilder builder)
    {
        builder.Entity<DentalService>(entity =>
        {
            entity.ToTable("DentalServices");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Code)
                .HasMaxLength(40)
                .IsRequired();

            entity.Property(x => x.Category)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(x => x.NameAr)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(x => x.NameEn)
                .HasMaxLength(250);

            entity.Property(x => x.CurrentPrice)
                .HasPrecision(18, 2);

            entity.Property(x => x.PricingNoteAr)
                .HasMaxLength(500);

            entity.HasIndex(x => x.Code)
                .IsUnique();

            entity.HasIndex(x => new
            {
                x.IsActive,
                x.Category,
                x.NameAr
            });
        });
    }

    private static void ConfigureDentalServicePriceHistory(ModelBuilder builder)
    {
        builder.Entity<DentalServicePriceHistory>(entity =>
        {
            entity.ToTable("DentalServicePriceHistory");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.OldPrice)
                .HasPrecision(18, 2);

            entity.Property(x => x.NewPrice)
                .HasPrecision(18, 2);

            entity.HasIndex(x => new
            {
                x.DentalServiceId,
                x.ChangedAtUtc
            });

            entity.HasOne(x => x.DentalService)
                .WithMany(x => x.PriceHistory)
                .HasForeignKey(x => x.DentalServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePatientVisits(ModelBuilder builder)
    {
        builder.Entity<PatientVisit>(entity =>
        {
            entity.ToTable("PatientVisits");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.ClinicalNotes)
                .HasMaxLength(4000);

            entity.Property(x => x.DiscountAmount)
                .HasPrecision(18, 2);

            entity.Property(x => x.ExtraAmount)
                .HasPrecision(18, 2);

            entity.Property(x => x.ExtraReason)
                .HasMaxLength(1000);

            entity.HasIndex(x => new
            {
                x.PatientId,
                x.VisitDateUtc
            });

            entity.HasIndex(x => new
            {
                x.DoctorId,
                x.VisitDateUtc
            });

            entity.HasOne(x => x.Patient)
                .WithMany(x => x.Visits)
                .HasForeignKey(x => x.PatientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Doctor)
                .WithMany()
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Appointment)
                .WithMany()
                .HasForeignKey(x => x.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureVisitTreatmentItems(ModelBuilder builder)
    {
        builder.Entity<VisitTreatmentItem>(entity =>
        {
            entity.ToTable("VisitTreatmentItems");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.ServiceNameArSnapshot)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(x => x.ServiceNameEnSnapshot)
                .HasMaxLength(250);

            entity.Property(x => x.UnitPriceSnapshot)
                .HasPrecision(18, 2);

            entity.Property(x => x.Notes)
                .HasMaxLength(1500);

            entity.HasOne(x => x.Visit)
                .WithMany(x => x.TreatmentItems)
                .HasForeignKey(x => x.VisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.DentalService)
                .WithMany()
                .HasForeignKey(x => x.DentalServiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureVisitTreatmentTeeth(ModelBuilder builder)
    {
        builder.Entity<VisitTreatmentTooth>(entity =>
        {
            entity.ToTable("VisitTreatmentTeeth");

            entity.HasKey(x => new
            {
                x.VisitTreatmentItemId,
                x.ToothFdiNumber
            });

            entity.HasOne(x => x.VisitTreatmentItem)
                .WithMany(x => x.Teeth)
                .HasForeignKey(x => x.VisitTreatmentItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigurePayments(ModelBuilder builder)
    {
        builder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payments");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Amount)
                .HasPrecision(18, 2);

            entity.Property(x => x.Method)
                .HasMaxLength(100);

            entity.Property(x => x.Notes)
                .HasMaxLength(1000);

            entity.HasIndex(x => new
            {
                x.VisitId,
                x.PaidAtUtc
            });

            entity.HasOne(x => x.Visit)
                .WithMany(x => x.Payments)
                .HasForeignKey(x => x.VisitId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Doctor)
                .WithMany()
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureAuditLogs(ModelBuilder builder)
    {
        builder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Action)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(x => x.EntityType)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(x => x.EntityId)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(x => x.IpAddress)
                .HasMaxLength(100);

            entity.HasIndex(x => new
            {
                x.EntityType,
                x.EntityId,
                x.CreatedAtUtc
            });

            entity.HasIndex(x => new
            {
                x.UserId,
                x.CreatedAtUtc
            });
        });
    }

    private static void SeedRoles(ModelBuilder builder)
    {
        builder.Entity<IdentityRole<Guid>>().HasData(
            new IdentityRole<Guid>
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000001"),
                Name = "Owner",
                NormalizedName = "OWNER",
                ConcurrencyStamp = "10000000-0000-0000-0000-000000000001"
            },
            new IdentityRole<Guid>
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000002"),
                Name = "Doctor",
                NormalizedName = "DOCTOR",
                ConcurrencyStamp = "10000000-0000-0000-0000-000000000002"
            },
            new IdentityRole<Guid>
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000003"),
                Name = "Secretary",
                NormalizedName = "SECRETARY",
                ConcurrencyStamp = "10000000-0000-0000-0000-000000000003"
            },
            new IdentityRole<Guid>
            {
                Id = Guid.Parse("10000000-0000-0000-0000-000000000004"),
                Name = "Nurse",
                NormalizedName = "NURSE",
                ConcurrencyStamp = "10000000-0000-0000-0000-000000000004"
            });
    }
}
