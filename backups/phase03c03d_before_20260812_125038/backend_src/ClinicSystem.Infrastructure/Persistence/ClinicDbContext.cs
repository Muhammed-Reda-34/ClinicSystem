using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Persistence;

public sealed class ClinicDbContext
    : IdentityDbContext<
        ApplicationUser,
        IdentityRole<Guid>,
        Guid>
{
    public ClinicDbContext(
        DbContextOptions<ClinicDbContext> options)
        : base(options)
    {
    }

    public DbSet<DoctorProfile> Doctors =>
        Set<DoctorProfile>();

    public DbSet<StaffDoctorAssignment>
        StaffDoctorAssignments =>
        Set<StaffDoctorAssignment>();

    public DbSet<RefreshToken> RefreshTokens =>
        Set<RefreshToken>();

    public DbSet<Patient> Patients =>
        Set<Patient>();

    public DbSet<PatientDoctorAssignment>
        PatientDoctorAssignments =>
        Set<PatientDoctorAssignment>();

    public DbSet<AuditLog> AuditLogs =>
        Set<AuditLog>();

    protected override void OnModelCreating(
        ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.HasPostgresExtension(
            "pg_trgm");

        ConfigureUsers(builder);
        ConfigureDoctors(builder);
        ConfigureStaffDoctorAssignments(
            builder);
        ConfigureRefreshTokens(builder);
        ConfigurePatients(builder);
        ConfigurePatientDoctorAssignments(
            builder);
        ConfigureAuditLogs(builder);
        SeedRoles(builder);
    }

    private static void ConfigureUsers(
        ModelBuilder builder)
    {
        builder
            .Entity<ApplicationUser>(
                entity =>
                {
                    entity
                        .Property(
                            x =>
                                x.FullName)
                        .HasMaxLength(200)
                        .IsRequired();

                    entity
                        .Property(
                            x =>
                                x.IsActive)
                        .HasDefaultValue(true);
                });
    }

    private static void ConfigureDoctors(
        ModelBuilder builder)
    {
        builder
            .Entity<DoctorProfile>(
                entity =>
                {
                    entity.ToTable(
                        "Doctors");

                    entity.HasKey(
                        x => x.Id);

                    entity
                        .HasIndex(
                            x =>
                                x.UserId)
                        .IsUnique();

                    entity
                        .Property(
                            x =>
                                x.Specialization)
                        .HasMaxLength(150);

                    entity
                        .HasOne<
                            ApplicationUser>()
                        .WithOne()
                        .HasForeignKey<
                            DoctorProfile>(
                            x =>
                                x.UserId)
                        .OnDelete(
                            DeleteBehavior
                                .Restrict);
                });
    }

    private static void
        ConfigureStaffDoctorAssignments(
            ModelBuilder builder)
    {
        builder
            .Entity<
                StaffDoctorAssignment>(
                entity =>
                {
                    entity.ToTable(
                        "StaffDoctorAssignments");

                    entity.HasKey(
                        x => new
                        {
                            x.StaffUserId,
                            x.DoctorId
                        });

                    entity
                        .HasOne(
                            x =>
                                x.Doctor)
                        .WithMany(
                            x =>
                                x.StaffAssignments)
                        .HasForeignKey(
                            x =>
                                x.DoctorId)
                        .OnDelete(
                            DeleteBehavior
                                .Cascade);

                    entity
                        .HasOne<
                            ApplicationUser>()
                        .WithMany()
                        .HasForeignKey(
                            x =>
                                x.StaffUserId)
                        .OnDelete(
                            DeleteBehavior
                                .Cascade);
                });
    }

    private static void
        ConfigureRefreshTokens(
            ModelBuilder builder)
    {
        builder
            .Entity<RefreshToken>(
                entity =>
                {
                    entity.ToTable(
                        "RefreshTokens");

                    entity.HasKey(
                        x => x.Id);

                    entity
                        .Property(
                            x =>
                                x.TokenHash)
                        .HasMaxLength(64)
                        .IsRequired();

                    entity
                        .HasIndex(
                            x =>
                                x.TokenHash)
                        .IsUnique();

                    entity
                        .HasIndex(
                            x => new
                            {
                                x.UserId,
                                x.ExpiresAtUtc
                            });

                    entity
                        .Property(
                            x =>
                                x.CreatedByIp)
                        .HasMaxLength(100);

                    entity
                        .Property(
                            x =>
                                x.RevokedByIp)
                        .HasMaxLength(100);

                    entity
                        .HasOne(
                            x => x.User)
                        .WithMany()
                        .HasForeignKey(
                            x =>
                                x.UserId)
                        .OnDelete(
                            DeleteBehavior
                                .Cascade);
                });
    }

    private static void ConfigurePatients(
        ModelBuilder builder)
    {
        builder.Entity<Patient>(
            entity =>
            {
                entity.ToTable(
                    "Patients");

                entity.HasKey(
                    x => x.Id);

                entity
                    .Property(
                        x =>
                            x.PatientCode)
                    .HasMaxLength(40)
                    .IsRequired();

                entity
                    .Property(
                        x =>
                            x.FormNumber)
                    .HasMaxLength(80);

                entity
                    .Property(
                        x =>
                            x.FullName)
                    .HasMaxLength(250)
                    .IsRequired();

                entity
                    .Property(
                        x =>
                            x.NormalizedFullName)
                    .HasMaxLength(250)
                    .IsRequired();

                entity
                    .Property(
                        x =>
                            x.PhoneNumber)
                    .HasMaxLength(30)
                    .IsRequired();

                entity
                    .Property(
                        x =>
                            x.NormalizedPhone)
                    .HasMaxLength(30)
                    .IsRequired();

                entity
                    .Property(
                        x =>
                            x.Gender)
                    .HasMaxLength(30);

                entity
                    .Property(
                        x =>
                            x.Address)
                    .HasMaxLength(600);

                entity
                    .Property(
                        x =>
                            x.AdministrativeNotes)
                    .HasMaxLength(2000);

                entity
                    .HasIndex(
                        x =>
                            x.PatientCode)
                    .IsUnique();

                entity
                    .HasIndex(
                        x =>
                            x.FormNumber)
                    .IsUnique();

                entity
                    .HasIndex(
                        x =>
                            x.NormalizedPhone);

                entity
                    .HasIndex(
                        x =>
                            x.NormalizedFullName);

                entity
                    .HasIndex(
                        x => new
                        {
                            x.IsBlacklisted,
                            x.UpdatedAtUtc
                        });

                entity
                    .HasIndex(
                        x =>
                            x.FullName)
                    .HasMethod("gin")
                    .HasOperators(
                        "gin_trgm_ops");
            });
    }

    private static void
        ConfigurePatientDoctorAssignments(
            ModelBuilder builder)
    {
        builder
            .Entity<
                PatientDoctorAssignment>(
                entity =>
                {
                    entity.ToTable(
                        "PatientDoctorAssignments");

                    entity.HasKey(
                        x => new
                        {
                            x.PatientId,
                            x.DoctorId
                        });

                    entity.HasIndex(
                        x =>
                            x.DoctorId);

                    entity
                        .HasOne(
                            x =>
                                x.Patient)
                        .WithMany(
                            x =>
                                x.DoctorAssignments)
                        .HasForeignKey(
                            x =>
                                x.PatientId)
                        .OnDelete(
                            DeleteBehavior
                                .Cascade);

                    entity
                        .HasOne(
                            x =>
                                x.Doctor)
                        .WithMany()
                        .HasForeignKey(
                            x =>
                                x.DoctorId)
                        .OnDelete(
                            DeleteBehavior
                                .Restrict);
                });
    }

    private static void ConfigureAuditLogs(
        ModelBuilder builder)
    {
        builder
            .Entity<AuditLog>(
                entity =>
                {
                    entity.ToTable(
                        "AuditLogs");

                    entity.HasKey(
                        x => x.Id);

                    entity
                        .Property(
                            x =>
                                x.Action)
                        .HasMaxLength(120)
                        .IsRequired();

                    entity
                        .Property(
                            x =>
                                x.EntityType)
                        .HasMaxLength(120)
                        .IsRequired();

                    entity
                        .Property(
                            x =>
                                x.EntityId)
                        .HasMaxLength(120)
                        .IsRequired();

                    entity
                        .Property(
                            x =>
                                x.IpAddress)
                        .HasMaxLength(100);

                    entity
                        .HasIndex(
                            x => new
                            {
                                x.EntityType,
                                x.EntityId,
                                x.CreatedAtUtc
                            });

                    entity
                        .HasIndex(
                            x => new
                            {
                                x.UserId,
                                x.CreatedAtUtc
                            });
                });
    }

    private static void SeedRoles(
        ModelBuilder builder)
    {
        builder
            .Entity<IdentityRole<Guid>>()
            .HasData(
                new IdentityRole<Guid>
                {
                    Id = Guid.Parse(
                        "10000000-0000-0000-0000-000000000001"),
                    Name = "Owner",
                    NormalizedName =
                        "OWNER",
                    ConcurrencyStamp =
                        "10000000-0000-0000-0000-000000000001"
                },
                new IdentityRole<Guid>
                {
                    Id = Guid.Parse(
                        "10000000-0000-0000-0000-000000000002"),
                    Name = "Doctor",
                    NormalizedName =
                        "DOCTOR",
                    ConcurrencyStamp =
                        "10000000-0000-0000-0000-000000000002"
                },
                new IdentityRole<Guid>
                {
                    Id = Guid.Parse(
                        "10000000-0000-0000-0000-000000000003"),
                    Name = "Secretary",
                    NormalizedName =
                        "SECRETARY",
                    ConcurrencyStamp =
                        "10000000-0000-0000-0000-000000000003"
                },
                new IdentityRole<Guid>
                {
                    Id = Guid.Parse(
                        "10000000-0000-0000-0000-000000000004"),
                    Name = "Nurse",
                    NormalizedName =
                        "NURSE",
                    ConcurrencyStamp =
                        "10000000-0000-0000-0000-000000000004"
                });
    }
}
