using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
namespace ClinicSystem.Infrastructure.Persistence;
public sealed class ClinicDbContext:IdentityDbContext<ApplicationUser,IdentityRole<Guid>,Guid>
{
    public ClinicDbContext(DbContextOptions<ClinicDbContext> options):base(options){}
    public DbSet<DoctorProfile> Doctors=>Set<DoctorProfile>();
    public DbSet<StaffDoctorAssignment> StaffDoctorAssignments=>Set<StaffDoctorAssignment>();
    public DbSet<RefreshToken> RefreshTokens=>Set<RefreshToken>();
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<ApplicationUser>(e=>{e.Property(x=>x.FullName).HasMaxLength(200).IsRequired();e.Property(x=>x.IsActive).HasDefaultValue(true);});
        builder.Entity<DoctorProfile>(e=>{e.ToTable("Doctors");e.HasKey(x=>x.Id);e.HasIndex(x=>x.UserId).IsUnique();e.Property(x=>x.Specialization).HasMaxLength(150);e.HasOne<ApplicationUser>().WithOne().HasForeignKey<DoctorProfile>(x=>x.UserId).OnDelete(DeleteBehavior.Restrict);});
        builder.Entity<StaffDoctorAssignment>(e=>{e.ToTable("StaffDoctorAssignments");e.HasKey(x=>new{x.StaffUserId,x.DoctorId});e.HasOne(x=>x.Doctor).WithMany(x=>x.StaffAssignments).HasForeignKey(x=>x.DoctorId).OnDelete(DeleteBehavior.Cascade);e.HasOne<ApplicationUser>().WithMany().HasForeignKey(x=>x.StaffUserId).OnDelete(DeleteBehavior.Cascade);});
        builder.Entity<RefreshToken>(e=>{e.ToTable("RefreshTokens");e.HasKey(x=>x.Id);e.Property(x=>x.TokenHash).HasMaxLength(64).IsRequired();e.HasIndex(x=>x.TokenHash).IsUnique();e.HasIndex(x=>new{x.UserId,x.ExpiresAtUtc});e.HasOne(x=>x.User).WithMany().HasForeignKey(x=>x.UserId).OnDelete(DeleteBehavior.Cascade);});
        builder.Entity<IdentityRole<Guid>>().HasData(
            new IdentityRole<Guid>{Id=Guid.Parse("10000000-0000-0000-0000-000000000001"),Name="Owner",NormalizedName="OWNER",ConcurrencyStamp="10000000-0000-0000-0000-000000000001"},
            new IdentityRole<Guid>{Id=Guid.Parse("10000000-0000-0000-0000-000000000002"),Name="Doctor",NormalizedName="DOCTOR",ConcurrencyStamp="10000000-0000-0000-0000-000000000002"},
            new IdentityRole<Guid>{Id=Guid.Parse("10000000-0000-0000-0000-000000000003"),Name="Secretary",NormalizedName="SECRETARY",ConcurrencyStamp="10000000-0000-0000-0000-000000000003"},
            new IdentityRole<Guid>{Id=Guid.Parse("10000000-0000-0000-0000-000000000004"),Name="Nurse",NormalizedName="NURSE",ConcurrencyStamp="10000000-0000-0000-0000-000000000004"});
    }
}
