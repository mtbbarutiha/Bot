import {
  PROFILE_AGE_CHIP_VALUES,
  USER_AGE_MAX,
  USER_AGE_MIN,
  formatUserAgeChip,
  parseUserAge,
  toEnglishDigits,
  toPersianDigits,
} from '@petdate/shared';

type AgePickerProps = {
  value: string;
  onChange: (next: string) => void;
  /** When set, chips use these ages (default: profile chips) */
  chips?: readonly number[];
  min?: number;
  max?: number;
  id?: string;
  'aria-label'?: string;
};

/**
 * Reliable age control for mobile + desktop Persian UI.
 * Avoids type=number (broken with Persian digits / iOS).
 * Chips + stepper + free text with digit normalization.
 */
export function AgePicker({
  value,
  onChange,
  chips = PROFILE_AGE_CHIP_VALUES,
  min = USER_AGE_MIN,
  max = USER_AGE_MAX,
  id,
  'aria-label': ariaLabel = 'سن',
}: AgePickerProps) {
  const parsed = parseUserAge(value);
  const display = value
    ? toPersianDigits(toEnglishDigits(value).replace(/[^\d]/g, '') || value)
    : '';

  function setNumeric(n: number) {
    const clamped = Math.min(max, Math.max(min, Math.round(n)));
    onChange(String(clamped));
  }

  function onTextChange(raw: string) {
    const en = toEnglishDigits(raw).replace(/[^\d]/g, '').slice(0, 2);
    onChange(en);
  }

  function bump(delta: number) {
    const base = parsed ?? (delta > 0 ? min : max);
    setNumeric(base + delta);
  }

  return (
    <div className="age-picker" role="group" aria-label={ariaLabel}>
      <div className="age-picker__stepper">
        <button
          type="button"
          className="age-picker__bump"
          onClick={() => bump(-1)}
          aria-label="کاهش سن"
        >
          −
        </button>
        <input
          id={id}
          className="age-picker__input"
          value={display}
          onChange={(e) => onTextChange(e.target.value)}
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder={toPersianDigits(`${min}–${max}`)}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          className="age-picker__bump"
          onClick={() => bump(1)}
          aria-label="افزایش سن"
        >
          +
        </button>
      </div>

      <div className="chip-grid age-picker__chips" role="listbox" aria-label="سن‌های پیشنهادی">
        {chips.map((n) => {
          const on = parsed === n;
          return (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={on}
              className={`chip${on ? ' is-on' : ''}`}
              onClick={() => setNumeric(n)}
            >
              {formatUserAgeChip(n)}
            </button>
          );
        })}
      </div>

      <p className="age-picker__hint">
        از دکمه‌ها انتخاب کن یا با − / + و کیبورد عدد بزن
        {parsed != null ? ` · انتخاب‌شده: ${toPersianDigits(parsed)}` : ''}
      </p>
    </div>
  );
}

type PetAgePickerProps = {
  value: string;
  unit: 'year' | 'month';
  onChangeValue: (next: string) => void;
  onChangeUnit: (unit: 'year' | 'month') => void;
};

const PET_YEAR_CHIPS = [1, 2, 3, 4, 5, 7, 10] as const;
const PET_MONTH_CHIPS = [1, 2, 3, 4, 6, 9] as const;

/** سن پت — بدون type=number؛ واحد سال/ماه + چیپ */
export function PetAgePicker({ value, unit, onChangeValue, onChangeUnit }: PetAgePickerProps) {
  const chips = unit === 'year' ? PET_YEAR_CHIPS : PET_MONTH_CHIPS;
  const max = unit === 'year' ? 25 : 360;
  const min = 1;
  const parsed = (() => {
    const n = Number(toEnglishDigits(value).replace(/[^\d]/g, ''));
    return Number.isFinite(n) && n >= min ? n : null;
  })();
  const display = value
    ? toPersianDigits(toEnglishDigits(value).replace(/[^\d]/g, '') || value)
    : '';

  function setNumeric(n: number) {
    onChangeValue(String(Math.min(max, Math.max(min, Math.round(n)))));
  }

  return (
    <div className="age-picker age-picker--pet" role="group" aria-label="سن پت">
      <div className="pepito-choice-row age-picker__units" role="group" aria-label="واحد سن">
        <button
          type="button"
          className={`pepito-choice pepito-choice--sm${unit === 'year' ? ' is-on' : ''}`}
          onClick={() => onChangeUnit('year')}
        >
          سال
        </button>
        <button
          type="button"
          className={`pepito-choice pepito-choice--sm${unit === 'month' ? ' is-on' : ''}`}
          onClick={() => onChangeUnit('month')}
        >
          ماه
        </button>
      </div>

      <div className="age-picker__stepper">
        <button
          type="button"
          className="age-picker__bump"
          onClick={() => setNumeric((parsed ?? min) - 1)}
          aria-label="کاهش"
        >
          −
        </button>
        <input
          className="age-picker__input"
          value={display}
          onChange={(e) => {
            const en = toEnglishDigits(e.target.value).replace(/[^\d]/g, '').slice(0, 3);
            onChangeValue(en);
          }}
          inputMode="numeric"
          placeholder={toPersianDigits(unit === 'year' ? '۲' : '۶')}
          aria-label="عدد سن پت"
        />
        <button
          type="button"
          className="age-picker__bump"
          onClick={() => setNumeric((parsed ?? 0) + 1)}
          aria-label="افزایش"
        >
          +
        </button>
      </div>

      <div className="chip-grid age-picker__chips">
        {chips.map((n) => (
          <button
            key={`${unit}-${n}`}
            type="button"
            className={`chip${parsed === n ? ' is-on' : ''}`}
            onClick={() => setNumeric(n)}
          >
            {toPersianDigits(n)} {unit === 'year' ? 'ساله' : 'ماهه'}
          </button>
        ))}
      </div>
    </div>
  );
}
