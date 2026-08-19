const imagingMarkerPattern = /\[\[IMAGING_REF:(.*?)\]\]/s;

export type ParsedVisitClinicalNote = {
  doctorNote: string;
  imagingReference: string;
};

export function parseVisitClinicalNote(
  raw: string | null | undefined,
): ParsedVisitClinicalNote {
  const source = (raw ?? "").trim();
  if (!source) {
    return {
      doctorNote: "",
      imagingReference: "",
    };
  }

  const match = source.match(imagingMarkerPattern);
  const imagingReference = match?.[1]?.trim() ?? "";
  const doctorNote = source
    .replace(imagingMarkerPattern, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");

  return {
    doctorNote,
    imagingReference,
  };
}

export function composeVisitClinicalNote(
  doctorNote: string,
  imagingReference: string,
): string | null {
  const parts: string[] = [];
  const imaging = imagingReference.trim();
  const note = doctorNote.trim();

  if (imaging) {
    parts.push(`[[IMAGING_REF:${imaging}]]`);
  }

  if (note) {
    parts.push(note);
  }

  const value = parts.join("\n\n").trim();
  return value || null;
}
