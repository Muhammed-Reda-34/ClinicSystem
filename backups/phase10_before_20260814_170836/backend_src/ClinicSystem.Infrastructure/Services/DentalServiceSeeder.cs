using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicSystem.Infrastructure.Services;

public static class DentalServiceSeeder
{
    public static async Task SeedReferenceDentalServicesAsync(
        this IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();

        var db = scope.ServiceProvider
            .GetRequiredService<ClinicDbContext>();

        if (await db.DentalServices.AnyAsync())
        {
            return;
        }

        var ownerUserId = await (
            from doctor in db.Doctors
            where doctor.IsOwner
            select doctor.UserId)
            .FirstOrDefaultAsync();

        if (ownerUserId == Guid.Empty)
        {
            return;
        }

        var now = DateTime.UtcNow;

        var rows = new[]
        {
            S("كشف", "Consultation", "كشف وتشخيص", 150m, null),
            S("أشعة", "X-ray", "كشف وتشخيص", 100m, null),

            S("خلع سنة دائمة عادي", "Simple permanent tooth extraction", "خلع وجراحة", 500m, null),
            S("خلع سنة لبنية عادي", "Simple primary tooth extraction", "خلع وجراحة", 400m, null),
            S("خلع ضرس عادي جراحياً أو جذور", "Surgical extraction / roots", "خلع وجراحة", 700m, null),
            S("خلع ضرس عقل عادي", "Simple wisdom tooth extraction", "خلع وجراحة", 800m, null),
            S("خلع ضرس عقل مدفون (جراحي)", "Impacted wisdom tooth surgery", "خلع وجراحة", 1500m, "سعر إرشادي وقد يختلف حسب الحالة"),

            S("حشو بلاتين / أملجم", "Amalgam filling", "حشو", 500m, null),
            S("حشو عادي (كمبوزيت)", "Composite filling", "حشو", 700m, "يبدأ من"),
            S("حشو تجميلي أمامي", "Anterior cosmetic filling", "حشو", 800m, "يبدأ من"),
            S("إعادة حشو عادي", "Filling replacement", "حشو", 800m, null),
            S("حشو عادي أطفال", "Pediatric filling", "حشو", 500m, null),
            S("حشو SDF (بديل للعصب)", "SDF", "حشو", 600m, null),
            S("حشو عصب لسنة لبنية", "Primary tooth pulpotomy/root treatment", "علاج عصب", 900m, null),
            S("حشو عصب بالتقفيل والأشعة", "Root canal with obturation and X-ray", "علاج عصب", 2000m, null),
            S("إعادة حشو عصب أمامي", "Anterior root canal retreatment", "علاج عصب", 2500m, null),

            S("طربوش بورسلين كوري", "Korean porcelain crown", "تركيبات ثابتة", 1600m, null),
            S("طربوش بورسلين ألماني", "German porcelain crown", "تركيبات ثابتة", 1900m, null),
            S("طربوش زيركونيا أمريكي / تركي", "US/Turkish zirconia crown", "تركيبات ثابتة", 2500m, null),
            S("طربوش زيركونيا ألماني", "German zirconia crown", "تركيبات ثابتة", 2700m, null),
            S("طربوش إيماكس", "E-max crown", "تركيبات ثابتة", 3700m, null),
            S("عدسة فينير", "Veneer", "تركيبات ثابتة", 3800m, null),
            S("طربوش معدني للأطفال", "Pediatric metal crown", "تركيبات ثابتة", 500m, null),

            S("تنظيف جير + تلميع", "Scaling and polishing", "تنظيف ولثة", 500m, null),
            S("تنظيف جير + تلميع للتقويم", "Orthodontic scaling and polishing", "تنظيف ولثة", 600m, null),
            S("جلسة فلورايد", "Fluoride session", "وقاية وأطفال", 350m, null),
            S("واقي ليلي للفك", "Night guard", "وقاية وأجهزة", 1200m, null),
            S("هوليوود سمايل متحرك Snap-on", "Snap-on Hollywood smile", "أجهزة وتركيبات", 6000m, null),
            S("تبييض أسنان بالليزر", "Laser whitening", "تجميل", 2800m, null),
            S("تنظيف جرح ملوث", "Infected wound cleaning", "جراحة", 200m, null),
            S("استئصال كيس", "Cyst removal", "جراحة", 1500m, "يبدأ من"),
            S("لجام الشفايف", "Labial frenectomy", "جراحة", 3000m, null),
            S("لزق طربوش", "Crown recementation", "تركيبات", 200m, null),
            S("شق لثة أطفال", "Pediatric gingival incision", "لثة وأطفال", 400m, null),
            S("قص جزء من لثة كبار", "Adult gingivectomy", "لثة", 350m, null),
            S("جراحة إطالة السنة بإزالة لثة", "Crown lengthening", "لثة", 500m, null),

            S("كسر براكت", "Broken bracket", "تقويم", 250m, null),
            S("المثبت للفك + البوكس", "Retainer with box", "تقويم", 2000m, null),
            S("الشمع", "Orthodontic wax", "تقويم", 100m, null),
            S("القمع + الفرشة", "Orthodontic kit", "تقويم", 150m, null),
            S("إزالة تقويم", "Braces removal", "تقويم", 1000m, null)
        };

        var index = 1;

        foreach (var row in rows)
        {
            db.DentalServices.Add(
                new DentalService
                {
                    Id = Guid.NewGuid(),
                    Code = $"REF-{index:000}",
                    Category = row.Category,
                    NameAr = row.NameAr,
                    NameEn = row.NameEn,
                    CurrentPrice = row.Price,
                    PricingNoteAr = row.Note,
                    IsActive = true,
                    CreatedByUserId = ownerUserId,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                });

            index++;
        }

        await db.SaveChangesAsync();
    }

    private static SeedRow S(
        string nameAr,
        string nameEn,
        string category,
        decimal price,
        string? note)
        => new(
            nameAr,
            nameEn,
            category,
            price,
            note);

    private sealed record SeedRow(
        string NameAr,
        string NameEn,
        string Category,
        decimal Price,
        string? Note);
}
