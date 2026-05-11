import { PALETTE } from '../../canvas/utils/canvasUtils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div
      className="color-picker"
      role="radiogroup"
      aria-label="Brush color"
      style={{ display: 'flex', gap: '10px' }}
    >
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          className={`color-picker__swatch ${value === color ? 'color-picker__swatch--active' : ''}`}
          style={{
            backgroundColor: color,
            borderRadius: '100%',
            height: '30px',
            width: '30px',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
