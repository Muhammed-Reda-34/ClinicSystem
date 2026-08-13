using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClinicSystem.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicalIntakeAppointmentsVisitsPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlternatePhone",
                table: "Patients",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaritalStatus",
                table: "Patients",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Occupation",
                table: "Patients",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScheduledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    AttendanceStatus = table.Column<int>(type: "integer", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Appointments_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DentalServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Category = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    NameAr = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    NameEn = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    CurrentPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PricingNoteAr = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DentalServices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PatientMedicalProfiles",
                columns: table => new
                {
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    HasDrugAllergy = table.Column<bool>(type: "boolean", nullable: false),
                    DrugAllergyDetails = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    HasHypertension = table.Column<bool>(type: "boolean", nullable: false),
                    HasRheumaticFever = table.Column<bool>(type: "boolean", nullable: false),
                    HasBloodDisease = table.Column<bool>(type: "boolean", nullable: false),
                    HasLiverDisease = table.Column<bool>(type: "boolean", nullable: false),
                    HasHepatitis = table.Column<bool>(type: "boolean", nullable: false),
                    HasDiabetes = table.Column<bool>(type: "boolean", nullable: false),
                    HasHeartDisease = table.Column<bool>(type: "boolean", nullable: false),
                    HasKidneyDisease = table.Column<bool>(type: "boolean", nullable: false),
                    HasThyroidDisease = table.Column<bool>(type: "boolean", nullable: false),
                    HasCancer = table.Column<bool>(type: "boolean", nullable: false),
                    OtherConditions = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    HadRecentHospitalization = table.Column<bool>(type: "boolean", nullable: false),
                    RecentHospitalizationReason = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true),
                    MedicalNotes = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: true),
                    PatientSignatureName = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    FormDate = table.Column<DateOnly>(type: "date", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientMedicalProfiles", x => x.PatientId);
                    table.ForeignKey(
                        name: "FK_PatientMedicalProfiles_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    VisitDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClinicalNotes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    DiscountAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ExtraAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ExtraReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    FollowUpAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientVisits_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PatientVisits_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PatientVisits_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DentalServicePriceHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DentalServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    OldPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NewPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DentalServicePriceHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DentalServicePriceHistory_DentalServices_DentalServiceId",
                        column: x => x.DentalServiceId,
                        principalTable: "DentalServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Method = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PaidAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_PatientVisits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "PatientVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VisitTreatmentItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VisitId = table.Column<Guid>(type: "uuid", nullable: false),
                    DentalServiceId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServiceNameArSnapshot = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    ServiceNameEnSnapshot = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    UnitPriceSnapshot = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitTreatmentItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VisitTreatmentItems_DentalServices_DentalServiceId",
                        column: x => x.DentalServiceId,
                        principalTable: "DentalServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VisitTreatmentItems_PatientVisits_VisitId",
                        column: x => x.VisitId,
                        principalTable: "PatientVisits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VisitTreatmentTeeth",
                columns: table => new
                {
                    VisitTreatmentItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToothFdiNumber = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VisitTreatmentTeeth", x => new { x.VisitTreatmentItemId, x.ToothFdiNumber });
                    table.ForeignKey(
                        name: "FK_VisitTreatmentTeeth_VisitTreatmentItems_VisitTreatmentItemId",
                        column: x => x.VisitTreatmentItemId,
                        principalTable: "VisitTreatmentItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_AttendanceStatus",
                table: "Appointments",
                column: "AttendanceStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DoctorId_ScheduledAtUtc",
                table: "Appointments",
                columns: new[] { "DoctorId", "ScheduledAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientId_ScheduledAtUtc",
                table: "Appointments",
                columns: new[] { "PatientId", "ScheduledAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DentalServicePriceHistory_DentalServiceId_ChangedAtUtc",
                table: "DentalServicePriceHistory",
                columns: new[] { "DentalServiceId", "ChangedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_DentalServices_Code",
                table: "DentalServices",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DentalServices_IsActive_Category_NameAr",
                table: "DentalServices",
                columns: new[] { "IsActive", "Category", "NameAr" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_AppointmentId",
                table: "PatientVisits",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_DoctorId_VisitDateUtc",
                table: "PatientVisits",
                columns: new[] { "DoctorId", "VisitDateUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientVisits_PatientId_VisitDateUtc",
                table: "PatientVisits",
                columns: new[] { "PatientId", "VisitDateUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_DoctorId",
                table: "Payments",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_VisitId_PaidAtUtc",
                table: "Payments",
                columns: new[] { "VisitId", "PaidAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_VisitTreatmentItems_DentalServiceId",
                table: "VisitTreatmentItems",
                column: "DentalServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_VisitTreatmentItems_VisitId",
                table: "VisitTreatmentItems",
                column: "VisitId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DentalServicePriceHistory");

            migrationBuilder.DropTable(
                name: "PatientMedicalProfiles");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "VisitTreatmentTeeth");

            migrationBuilder.DropTable(
                name: "VisitTreatmentItems");

            migrationBuilder.DropTable(
                name: "DentalServices");

            migrationBuilder.DropTable(
                name: "PatientVisits");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropColumn(
                name: "AlternatePhone",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "MaritalStatus",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "Occupation",
                table: "Patients");
        }
    }
}
