export function toWhatsAppHref(
  phoneNumber: string,
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

  return `https://wa.me/${digits}`;
}
