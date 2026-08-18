using System.Text;

namespace ClinicSystem.Infrastructure.Common;

public sealed record PhoneNumberParseResult(
    bool IsValid,
    string Digits,
    string? E164,
    string? CountryIso2,
    string? ErrorCode,
    string? ErrorMessage
);

public static class PhoneNumberNormalizer
{
    public static PhoneNumberParseResult Parse(
        string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return Invalid(
                "PHONE_REQUIRED",
                "Phone number is required.");
        }

        var raw = value.Trim();
        var digits = ExtractDigits(raw);

        if (digits.Length < 7 || digits.Length > 15)
        {
            return Invalid(
                "INVALID_PHONE_LENGTH",
                "Phone number length is invalid.");
        }

        // Egyptian local mobile:
        // 010 / 011 / 012 / 015 + 8 digits = exactly 11 digits.
        if (digits.StartsWith("01"))
        {
            var validPrefix =
                digits.StartsWith("010")
                || digits.StartsWith("011")
                || digits.StartsWith("012")
                || digits.StartsWith("015");

            if (!validPrefix)
            {
                return Invalid(
                    "INVALID_EGYPTIAN_MOBILE_PREFIX",
                    "Egyptian mobile numbers must start with 010, 011, 012 or 015.");
            }

            if (digits.Length != 11)
            {
                return Invalid(
                    "INVALID_EGYPTIAN_MOBILE_LENGTH",
                    "Egyptian mobile numbers must contain exactly 11 digits.");
            }

            return Valid(
                digits,
                $"+20{digits[1..]}",
                "EG");
        }

        // Egypt international forms: +20 / 0020.
        if (
            raw.StartsWith("+20")
            || digits.StartsWith("0020")
            || (
                digits.StartsWith("20")
                && digits.Length == 12
            )
        )
        {
            var national = digits;

            if (national.StartsWith("0020"))
            {
                national = national[4..];
            }
            else if (national.StartsWith("20"))
            {
                national = national[2..];
            }

            if (
                national.Length != 10
                || !(
                    national.StartsWith("10")
                    || national.StartsWith("11")
                    || national.StartsWith("12")
                    || national.StartsWith("15")
                )
            )
            {
                return Invalid(
                    "INVALID_EGYPTIAN_MOBILE",
                    "Egyptian mobile number is invalid.");
            }

            return Valid(
                digits,
                $"+20{national}",
                "EG");
        }

        // Saudi local mobile: 05xxxxxxxx = exactly 10 digits.
        if (digits.StartsWith("05"))
        {
            if (
                digits.Length != 10
                || digits[2] is < '0' or > '9'
            )
            {
                return Invalid(
                    "INVALID_SAUDI_MOBILE_LENGTH",
                    "Saudi local mobile numbers must contain exactly 10 digits.");
            }

            return Valid(
                digits,
                $"+966{digits[1..]}",
                "SA");
        }

        // Saudi international forms: +966 / 00966.
        if (
            raw.StartsWith("+966")
            || digits.StartsWith("00966")
            || (
                digits.StartsWith("966")
                && digits.Length == 12
            )
        )
        {
            var national = digits;

            if (national.StartsWith("00966"))
            {
                national = national[5..];
            }
            else if (national.StartsWith("966"))
            {
                national = national[3..];
            }

            if (
                national.Length != 9
                || !national.StartsWith("5")
            )
            {
                return Invalid(
                    "INVALID_SAUDI_MOBILE",
                    "Saudi mobile number is invalid.");
            }

            return Valid(
                digits,
                $"+966{national}",
                "SA");
        }

        // Any explicit international number is accepted
        // without forcing the secretary to choose a country code.
        if (
            raw.StartsWith("+")
            || digits.StartsWith("00")
        )
        {
            var international =
                digits.StartsWith("00")
                    ? digits[2..]
                    : digits;

            if (
                international.Length < 8
                || international.Length > 15
            )
            {
                return Invalid(
                    "INVALID_INTERNATIONAL_PHONE",
                    "International phone number is invalid.");
            }

            return Valid(
                digits,
                $"+{international}",
                DetectCountry(international));
        }

        // Unknown local format: accept it, but do not guess a country.
        // This keeps non-Egyptian patients usable without a country picker.
        return Valid(
            digits,
            null,
            null);
    }


    public static IReadOnlyCollection<string> GetCandidates(
        string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        var parsed =
            Parse(value);

        var candidates =
            new HashSet<string>(
                StringComparer.Ordinal);

        var rawDigits =
            ExtractDigits(value);

        if (rawDigits.Length > 0)
        {
            candidates.Add(rawDigits);
        }

        if (parsed.IsValid)
        {
            if (parsed.Digits.Length > 0)
            {
                candidates.Add(
                    parsed.Digits);
            }

            if (
                !string.IsNullOrWhiteSpace(
                    parsed.E164)
            )
            {
                candidates.Add(
                    ExtractDigits(
                        parsed.E164));
            }

            if (
                parsed.CountryIso2 == "EG"
            )
            {
                var e164Digits =
                    !string.IsNullOrWhiteSpace(
                        parsed.E164)
                        ? ExtractDigits(
                            parsed.E164)
                        : string.Empty;

                if (
                    e164Digits.StartsWith("20")
                    && e164Digits.Length == 12
                )
                {
                    candidates.Add(
                        $"0{e164Digits[2..]}");
                }
            }

            if (
                parsed.CountryIso2 == "SA"
            )
            {
                var e164Digits =
                    !string.IsNullOrWhiteSpace(
                        parsed.E164)
                        ? ExtractDigits(
                            parsed.E164)
                        : string.Empty;

                if (
                    e164Digits.StartsWith("966")
                    && e164Digits.Length == 12
                )
                {
                    candidates.Add(
                        $"0{e164Digits[3..]}");
                }
            }
        }

        return candidates
            .Where(
                x =>
                    x.Length >= 3)
            .ToArray();
    }

    public static string ExtractDigits(
        string value)
    {
        var builder =
            new StringBuilder();

        foreach (var ch in value)
        {
            if (ch is >= '0' and <= '9')
            {
                builder.Append(ch);
                continue;
            }

            if (ch is >= '٠' and <= '٩')
            {
                builder.Append(
                    (char)(
                        '0'
                        + (
                            ch - '٠'
                        )
                    )
                );
                continue;
            }

            if (ch is >= '۰' and <= '۹')
            {
                builder.Append(
                    (char)(
                        '0'
                        + (
                            ch - '۰'
                        )
                    )
                );
            }
        }

        return builder.ToString();
    }

    private static string? DetectCountry(
        string internationalDigits)
    {
        if (
            internationalDigits
            .StartsWith("20")
        )
        {
            return "EG";
        }

        if (
            internationalDigits
            .StartsWith("966")
        )
        {
            return "SA";
        }

        return null;
    }

    private static PhoneNumberParseResult Valid(
        string digits,
        string? e164,
        string? countryIso2)
    {
        return new PhoneNumberParseResult(
            true,
            digits,
            e164,
            countryIso2,
            null,
            null);
    }

    private static PhoneNumberParseResult Invalid(
        string code,
        string message)
    {
        return new PhoneNumberParseResult(
            false,
            string.Empty,
            null,
            null,
            code,
            message);
    }
}
