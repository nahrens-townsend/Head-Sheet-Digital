import { useState, useEffect, useRef, useCallback } from 'react';
import { PALETTE } from '../../canvas/utils/canvasUtils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const COLS = 8

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])

  // Focus swatch when navigating via keyboard
  useEffect(() => {
    if (open) {
      swatchRefs.current[focusIndex]?.focus()
    }
  }, [open, focusIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return
    const total = PALETTE.length
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'ArrowRight':
        e.preventDefault()
        setFocusIndex(i => (i + 1) % total)
        break
      case 'ArrowLeft':
        e.preventDefault()
        setFocusIndex(i => (i - 1 + total) % total)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusIndex(i => (i + COLS) % total)
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIndex(i => (i - COLS + total) % total)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onChange(PALETTE[focusIndex] as string)
        setOpen(false)
        break
    }
  }, [open, focusIndex, onChange])

  return (
    <div
      ref={containerRef}
      className="color-picker"
      style={{ position: 'relative', display: 'inline-block' }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger */}
      <button
        type="button"
        className="color-picker__trigger"
        aria-label={`Color picker, currently ${value}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (!open) {
            // Reset keyboard focus to the currently active color on open
            setFocusIndex(Math.max(0, PALETTE.indexOf(value as string)))
          }
          setOpen(o => !o)
        }}
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '2px solid rgba(0,0,0,0.15)',
          backgroundColor: value,
          cursor: 'pointer',
          padding: 0,
          position: 'relative',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            fontSize: 8,
            lineHeight: 1,
            background: 'var(--bg)',
            borderRadius: '50%',
            width: 10,
            height: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Color palette"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            zIndex: 50,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow)',
            padding: 8,
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 22px)`,
            gap: 4,
          }}
        >
          {PALETTE.map((color, i) => {
            const isActive = value === color
            return (
              <button
                key={color}
                ref={el => { swatchRefs.current[i] = el }}
                type="button"
                role="option"
                aria-selected={isActive}
                aria-label={color}
                tabIndex={i === focusIndex ? 0 : -1}
                onClick={() => {
                  onChange(color)
                  setFocusIndex(i)
                  setOpen(false)
                }}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: (!isActive && i !== focusIndex) ? '1.5px solid rgba(0,0,0,0.25)' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: isActive
                    ? '0 0 0 2px var(--bg), 0 0 0 4px #aa3bff'
                    : i === focusIndex
                    ? '0 0 0 2px var(--bg), 0 0 0 4px rgba(170,59,255,0.5)'
                    : 'none',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
