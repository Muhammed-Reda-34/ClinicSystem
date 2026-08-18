import {
  useState,
} from "react";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import styles from "./DentalChart.module.css";

const upper = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
];

const lower = [
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

function ToothGlyph({
  selected,
}: {
  selected: boolean;
}) {
  return (
    <svg
      viewBox="0 0 36 46"
      aria-hidden="true"
    >
      <path
        className={
          selected
            ? styles.glyphSelected
            : styles.glyph
        }
        d="M18 3C12 0 5 3 4 10c-1 6 3 11 5 16 2 4 2 17 6 17 3 0 2-10 4-10s1 10 4 10c4 0 4-13 6-17 2-5 6-10 5-16C33 3 25 0 18 3Z"
      />
    </svg>
  );
}

function ToothButton({
  number,
  selected,
  onToggle,
}: {
  number: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        styles.toothButton,
        selected
          ? styles.toothSelected
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onToggle}
      aria-pressed={selected}
      title={`FDI ${number}`}
    >
      <span>{number}</span>
      <ToothGlyph
        selected={selected}
      />
    </button>
  );
}

function ArchTooth({
  number,
  x,
  y,
  rotation,
  selected,
  onToggle,
}: {
  number: number;
  x: number;
  y: number;
  rotation: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <g
      className={styles.archTooth}
      transform={`translate(${x} ${y}) rotate(${rotation})`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-label={`Tooth ${number}`}
      aria-pressed={selected}
      onKeyDown={event => {
        if (
          event.key === "Enter"
          || event.key === " "
        ) {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <path
        className={
          selected
            ? styles.archSelected
            : styles.archShape
        }
        d="M0-17C-9-20-15-13-13-5c1 6 5 9 6 15 1 5 2 11 5 11 2 0 2-7 4-7s2 7 4 7c3 0 4-6 5-11 1-6 5-9 6-15 2-8-4-15-13-12Z"
      />
      <text
        x="2"
        y="31"
        textAnchor="middle"
        className={styles.archLabel}
      >
        {number}
      </text>
    </g>
  );
}

export function DentalChart({
  selectedTeeth,
  onChange,
}: {
  selectedTeeth: number[];
  onChange: (
    teeth: number[],
  ) => void;
}) {
  const {
    t,
    language,
  } =
    useLanguage();

  const [mode, setMode] =
    useState<
      "rows"
      | "arches"
    >("rows");

  const selected =
    new Set(selectedTeeth);

  function toggle(
    number: number,
  ) {
    const next =
      new Set(selected);

    if (next.has(number)) {
      next.delete(number);
    } else {
      next.add(number);
    }

    onChange(
      [...next].sort(
        (a, b) => a - b,
      ),
    );
  }

  const archUpper =
    upper.map(
      (number, index) => {
        const x =
          55
          + index
            * (410 / 15);
        const normalized =
          (x - 260) / 205;
        const y =
          108
          + 72
            * normalized
            * normalized;
        const rotation =
          normalized * 32;

        return {
          number,
          x,
          y,
          rotation,
        };
      },
    );

  const archLower =
    lower.map(
      (number, index) => {
        const x =
          55
          + index
            * (410 / 15);
        const normalized =
          (x - 260) / 205;
        const y =
          300
          - 72
            * normalized
            * normalized;
        const rotation =
          -normalized * 32;

        return {
          number,
          x,
          y,
          rotation,
        };
      },
    );

  return (
    <section className={styles.chart}>
      <div className={styles.header}>
        <div>
          <h3>
            {t(
              "dentalChart",
            )}
          </h3>

          <p>
            {language === "ar"
              ? "اختر الشكل الأسهل للمستخدم؛ الاختيار في الشكلين يحفظ نفس أرقام الأسنان FDI."
              : "Use either visual layout. Both store the same FDI tooth numbers."}
          </p>
        </div>

        <div className={styles.modeSwitch}>
          <button
            type="button"
            className={
              mode === "rows"
                ? styles.modeActive
                : ""
            }
            onClick={() =>
              setMode("rows")
            }
          >
            {t("chartRows")}
          </button>

          <button
            type="button"
            className={
              mode === "arches"
                ? styles.modeActive
                : ""
            }
            onClick={() =>
              setMode("arches")
            }
          >
            {t(
              "chartArches",
            )}
          </button>
        </div>
      </div>

      {mode === "rows" ? (
        <div className={styles.rows}>
          <div className={styles.rowLabel}>
            {language === "ar"
              ? "الفك العلوي"
              : "Upper"}
          </div>

          <div className={styles.toothRow}>
            {upper.map(
              number => (
                <ToothButton
                  key={number}
                  number={number}
                  selected={
                    selected.has(
                      number,
                    )
                  }
                  onToggle={() =>
                    toggle(number)
                  }
                />
              ),
            )}
          </div>

          <div className={styles.midline} />

          <div className={styles.toothRow}>
            {lower.map(
              number => (
                <ToothButton
                  key={number}
                  number={number}
                  selected={
                    selected.has(
                      number,
                    )
                  }
                  onToggle={() =>
                    toggle(number)
                  }
                />
              ),
            )}
          </div>

          <div className={styles.rowLabel}>
            {language === "ar"
              ? "الفك السفلي"
              : "Lower"}
          </div>
        </div>
      ) : (
        <div className={styles.archWrap}>
          <svg
            className={styles.archSvg}
            viewBox="0 0 520 390"
            role="img"
            aria-label="Dental arch chart"
          >
            <path
              className={styles.archGuide}
              d="M40 188 Q260 20 480 188"
            />
            <path
              className={styles.archGuide}
              d="M40 210 Q260 380 480 210"
            />

            {archUpper.map(
              tooth => (
                <ArchTooth
                  key={
                    tooth.number
                  }
                  {...tooth}
                  selected={
                    selected.has(
                      tooth.number,
                    )
                  }
                  onToggle={() =>
                    toggle(
                      tooth.number,
                    )
                  }
                />
              ),
            )}

            {archLower.map(
              tooth => (
                <ArchTooth
                  key={
                    tooth.number
                  }
                  {...tooth}
                  selected={
                    selected.has(
                      tooth.number,
                    )
                  }
                  onToggle={() =>
                    toggle(
                      tooth.number,
                    )
                  }
                />
              ),
            )}

            <text
              x="260"
              y="194"
              textAnchor="middle"
              className={styles.archCenterText}
            >
              UPPER
            </text>

            <text
              x="260"
              y="226"
              textAnchor="middle"
              className={styles.archCenterText}
            >
              LOWER
            </text>
          </svg>
        </div>
      )}

      <div className={styles.selectedList}>
        <strong>
          {t(
            "selectedTeeth",
          )}:
        </strong>

        {selectedTeeth.length
          > 0
          ? selectedTeeth.join(
              " • ",
            )
          : "—"}
      </div>
    </section>
  );
}
