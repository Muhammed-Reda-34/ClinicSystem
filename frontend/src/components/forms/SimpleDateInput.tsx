import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./SimpleDateInput.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
};

function parts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function daysInMonth(year: number, month: number) {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function clampDate(value: string, min?: string, max?: string) {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

export function SimpleDateInput({
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  allowClear = true,
  className,
}: Props) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const initial = parts(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  useEffect(() => {
    const next = parts(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const currentYear = new Date().getFullYear();
  const minYear = min ? Number(min.slice(0, 4)) : 1900;
  const maxYear = max ? Number(max.slice(0, 4)) : currentYear + 10;

  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) result.push(y);
    return result;
  }, [minYear, maxYear]);

  const maxDay = daysInMonth(Number(year), Number(month));
  const days = Array.from({ length: maxDay }, (_, index) => index + 1);

  const months = ar
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function emit(nextYear: string, nextMonth: string, nextDay: string) {
    if (!nextYear || !nextMonth || !nextDay) {
      if (!required) onChange("");
      return;
    }

    const normalizedDay = String(
      Math.min(Number(nextDay), daysInMonth(Number(nextYear), Number(nextMonth))),
    ).padStart(2, "0");
    const next = `${nextYear}-${nextMonth.padStart(2, "0")}-${normalizedDay}`;
    const clamped = clampDate(next, min, max);
    const synced = parts(clamped);
    setYear(synced.year);
    setMonth(synced.month);
    setDay(synced.day);
    onChange(clamped);
  }

  function chooseYear(next: string) {
    setYear(next);
    emit(next, month, day);
  }

  function chooseMonth(next: string) {
    setMonth(next);
    const safeDay = day && Number(day) > daysInMonth(Number(year), Number(next))
      ? String(daysInMonth(Number(year), Number(next))).padStart(2, "0")
      : day;
    setDay(safeDay);
    emit(year, next, safeDay);
  }

  function chooseDay(next: string) {
    setDay(next);
    emit(year, month, next);
  }

  function setToday() {
    const today = new Date();
    const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const next = clampDate(local, min, max);
    const synced = parts(next);
    setYear(synced.year);
    setMonth(synced.month);
    setDay(synced.day);
    onChange(next);
  }

  function clear() {
    setYear("");
    setMonth("");
    setDay("");
    onChange("");
  }

  return (
    <div className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")}>
      <div className={styles.selects}>
        <select value={day} onChange={event => chooseDay(event.target.value)} disabled={disabled} required={required} aria-label={ar ? "اليوم" : "Day"}>
          <option value="">{ar ? "اليوم" : "Day"}</option>
          {days.map(item => <option key={item} value={String(item).padStart(2, "0")}>{item}</option>)}
        </select>
        <select value={month} onChange={event => chooseMonth(event.target.value)} disabled={disabled} required={required} aria-label={ar ? "الشهر" : "Month"}>
          <option value="">{ar ? "الشهر" : "Month"}</option>
          {months.map((name, index) => (
            <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
        <select value={year} onChange={event => chooseYear(event.target.value)} disabled={disabled} required={required} aria-label={ar ? "السنة" : "Year"}>
          <option value="">{ar ? "السنة" : "Year"}</option>
          {years.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={setToday} disabled={disabled}>
          {ar ? "اليوم" : "Today"}
        </button>
        {allowClear && !required && value && (
          <button type="button" className={styles.clear} onClick={clear} disabled={disabled}>
            {ar ? "مسح" : "Clear"}
          </button>
        )}
      </div>
    </div>
  );
}
