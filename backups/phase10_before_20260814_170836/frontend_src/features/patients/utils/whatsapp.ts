export function toWhatsAppHref(
  phoneNumber: string,
  message?: string,
) {
  let digits =
    phoneNumber.replace(
      /\D/g,
      "",
    );

  if (
    digits.startsWith("0")
    && digits.length === 11
  ) {
    digits =
      `20${digits.slice(1)}`;
  }

  const base =
    `https://wa.me/${digits}`;

  if (!message?.trim()) {
    return base;
  }

  return `${base}?text=${encodeURIComponent(
    message.trim(),
  )}`;
}
