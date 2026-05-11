import type { StrokeSize } from '../../canvas/utils/canvasUtils'

const STROKE_SIZE_LABELS: Record<StrokeSize, string> = {
  sm: 'S',
  md: 'M',
  lg: 'L',
  xl: 'XL',
}

const SIZES: StrokeSize[] = ['sm', 'md', 'lg', 'xl']

interface StrokeSizePickerProps {
  value: StrokeSize
  onChange: (size: StrokeSize) => void
}

export function StrokeSizePicker({ value, onChange }: StrokeSizePickerProps) {
  return (
    <div className="stroke-size-picker" role="radiogroup" aria-label="Brush size">
      {SIZES.map((size) => (
        <button
          key={size}
          type="button"
          role="radio"
          aria-checked={value === size}
          aria-label={`Size ${STROKE_SIZE_LABELS[size]}`}
          className={`stroke-size-picker__btn ${value === size ? 'stroke-size-picker__btn--active' : ''}`}
          onClick={() => onChange(size)}
        >
          {STROKE_SIZE_LABELS[size]}
        </button>
      ))}
    </div>
  )
}
