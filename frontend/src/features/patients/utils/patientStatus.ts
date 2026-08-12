import type {
  PatientProfileStatus,
} from "../../../types/patients";
import type {
  TranslationKey,
} from "../../../i18n/translations";

export function statusTranslationKey(
  status: PatientProfileStatus,
): TranslationKey {
  if (
    status === 1
    || status
      === "PreRegistered"
  ) {
    return "preRegistered";
  }

  if (
    status === 2
    || status
      === "BasicCompleted"
  ) {
    return "basicCompleted";
  }

  return "medicalCompleted";
}
