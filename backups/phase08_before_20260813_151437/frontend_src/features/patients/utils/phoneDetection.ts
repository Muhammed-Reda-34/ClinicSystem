export type PhoneDetection = {
  valid: boolean;
  country:
    | "EG"
    | "SA"
    | "INTERNATIONAL"
    | "UNKNOWN";
  labelAr: string;
  labelEn: string;
  errorAr?: string;
  errorEn?: string;
};

function digitsOnly(
  value: string,
) {
  return value.replace(
    /[^\d٠-٩۰-۹]/g,
    "",
  )
  .replace(
    /[٠-٩]/g,
    char =>
      String(
        "٠١٢٣٤٥٦٧٨٩"
          .indexOf(char),
      ),
  )
  .replace(
    /[۰-۹]/g,
    char =>
      String(
        "۰۱۲۳۴۵۶۷۸۹"
          .indexOf(char),
      ),
  );
}

export function detectPhone(
  value: string,
): PhoneDetection {
  const raw =
    value.trim();

  const digits =
    digitsOnly(raw);

  if (!digits) {
    return {
      valid: false,
      country: "UNKNOWN",
      labelAr: "",
      labelEn: "",
    };
  }

  if (digits.startsWith("01")) {
    const validPrefix =
      ["010", "011", "012", "015"]
      .some(
        prefix =>
          digits.startsWith(
            prefix,
          ),
      );

    if (!validPrefix) {
      return {
        valid: false,
        country: "EG",
        labelAr: "تم التعرف: مصر",
        labelEn: "Detected: Egypt",
        errorAr:
          "رقم الموبايل المصري لازم يبدأ بـ 010 أو 011 أو 012 أو 015.",
        errorEn:
          "Egyptian mobile numbers must start with 010, 011, 012 or 015.",
      };
    }

    if (digits.length !== 11) {
      return {
        valid: false,
        country: "EG",
        labelAr: "تم التعرف: مصر",
        labelEn: "Detected: Egypt",
        errorAr:
          "رقم الموبايل المصري لازم يكون 11 رقم بالضبط.",
        errorEn:
          "Egyptian mobile numbers must be exactly 11 digits.",
      };
    }

    return {
      valid: true,
      country: "EG",
      labelAr: "تم التعرف تلقائيًا: مصر",
      labelEn: "Auto-detected: Egypt",
    };
  }

  if (
    raw.startsWith("+20")
    || digits.startsWith("0020")
    || (
      digits.startsWith("20")
      && digits.length === 12
    )
  ) {
    return {
      valid:
        digits.length >= 12,
      country: "EG",
      labelAr:
        "تم التعرف تلقائيًا: مصر - رقم دولي",
      labelEn:
        "Auto-detected: Egypt - international",
      errorAr:
        digits.length >= 12
          ? undefined
          : "راجع رقم الهاتف المصري.",
      errorEn:
        digits.length >= 12
          ? undefined
          : "Check the Egyptian phone number.",
    };
  }

  if (digits.startsWith("05")) {
    if (digits.length !== 10) {
      return {
        valid: false,
        country: "SA",
        labelAr:
          "تم التعرف: السعودية",
        labelEn:
          "Detected: Saudi Arabia",
        errorAr:
          "رقم الموبايل السعودي المحلي لازم يكون 10 أرقام.",
        errorEn:
          "Saudi local mobile numbers must be exactly 10 digits.",
      };
    }

    return {
      valid: true,
      country: "SA",
      labelAr:
        "تم التعرف تلقائيًا: السعودية",
      labelEn:
        "Auto-detected: Saudi Arabia",
    };
  }

  if (
    raw.startsWith("+966")
    || digits.startsWith("00966")
  ) {
    return {
      valid:
        digits.length >= 12,
      country: "SA",
      labelAr:
        "تم التعرف تلقائيًا: السعودية - رقم دولي",
      labelEn:
        "Auto-detected: Saudi Arabia - international",
    };
  }

  if (
    raw.startsWith("+")
    || digits.startsWith("00")
  ) {
    return {
      valid:
        digits.length >= 8
        && digits.length <= 15,
      country:
        "INTERNATIONAL",
      labelAr:
        "تم التعرف: رقم دولي",
      labelEn:
        "Detected: international number",
      errorAr:
        digits.length >= 8
        && digits.length <= 15
          ? undefined
          : "راجع طول الرقم الدولي.",
      errorEn:
        digits.length >= 8
        && digits.length <= 15
          ? undefined
          : "Check the international number length.",
    };
  }

  return {
    valid:
      digits.length >= 7
      && digits.length <= 15,
    country:
      "UNKNOWN",
    labelAr:
      "رقم غير مصري - سيتم قبوله بدون اختيار كود دولة.",
    labelEn:
      "Non-Egyptian local number - accepted without a country selector.",
    errorAr:
      digits.length >= 7
      && digits.length <= 15
        ? undefined
        : "رقم الهاتف غير صالح.",
    errorEn:
      digits.length >= 7
      && digits.length <= 15
        ? undefined
        : "Phone number is invalid.",
  };
}
