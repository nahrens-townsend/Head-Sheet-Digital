import type { StrokeSize } from '../../canvas/utils/canvasUtils'

const DOT_SIZES: Record<StrokeSize, number> = { sm: 4, md: 7, lg: 11, xl: 15 }
const SIZE_LABELS: Record<StrokeSize, string> = { sm: 'Small', md: 'Medium', lg: 'Large', xl: 'Extra large' }

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
          aria-label={SIZE_LABELS[size]}
          className={`stroke-size-picker__btn ${value === size ? 'stroke-size-picker__btn--active' : ''}`}
          onClick={() => onChange(size)}
        >
          <span
            style={{
              display: 'block',
              width: DOT_SIZES[size],
              height: DOT_SIZES[size],
              borderRadius: '50%',
              background: 'currentColor',
            }}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  )
}
