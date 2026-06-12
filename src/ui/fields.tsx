// Thành phần input tái sử dụng. Quy ước: store giữ SI, field hiển thị theo đơn vị kỹ thuật.

interface NumberFieldProps {
  label: string;
  /** Giá trị hiển thị (đã đổi đơn vị) */
  value: number;
  /** Trả về giá trị hiển thị mới; cha tự đổi về SI */
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  /** Số chữ số thập phân hiển thị */
  decimals?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  decimals,
}: NumberFieldProps) {
  const display = decimals != null ? Number(value.toFixed(decimals)) : value;
  return (
    <label className="block">
      <span className="field-label">
        {label}
        {unit ? <span className="text-white/35"> ({unit})</span> : null}
      </span>
      <input
        type="number"
        className="field-input"
        value={Number.isFinite(display) ? display : 0}
        step={step}
        min={min}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
