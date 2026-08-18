using System.Text;

namespace ClinicSystem.Infrastructure.Common;

public static class TextNormalizer
{
    public static string NormalizeName(string value)
    {
        var parts = value
            .Trim()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return string.Join(' ', parts).ToUpperInvariant();
    }

    public static string NormalizePhone(string value)
    {
        var builder = new StringBuilder();

        foreach (var ch in value)
        {
            if (ch is >= '0' and <= '9')
            {
                builder.Append(ch);
                continue;
            }

            if (ch is >= '٠' and <= '٩')
            {
                builder.Append((char)('0' + (ch - '٠')));
                continue;
            }

            if (ch is >= '۰' and <= '۹')
            {
                builder.Append((char)('0' + (ch - '۰')));
            }
        }

        return builder.ToString();
    }
}
