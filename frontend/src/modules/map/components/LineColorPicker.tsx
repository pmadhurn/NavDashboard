import React, { useState, useRef, useEffect, useCallback } from 'react'

interface LineColorPickerProps {
  currentColor: string
  pairName: string
  onColorChange: (color: string) => void
  onClose: () => void
}

const PRESET_COLORS = [
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C',
  '#3498DB', '#9B59B6', '#E91E63', '#FF6B6B', '#FFA07A',
  '#98D8C8', '#87CEEB', '#DDA0DD', '#F0E68C', '#A8C4B0',
  '#6B7B8D', '#B8860B', '#CD5C5C', '#4682B4', '#708090',
]

/**
 * A color wheel/picker popup for selecting connection line colors.
 * Shows a ring of preset colors + a custom color input.
 */
export default function LineColorPicker({
  currentColor,
  pairName,
  onColorChange,
  onClose,
}: LineColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Draw the color wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 140
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 4

    canvas.width = size
    canvas.height = size

    // Draw color wheel using HSL
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180
      const endAngle = ((angle + 1) * Math.PI) / 180

      // Create gradient from white (center) to full saturation (edge)
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      )
      gradient.addColorStop(0, `hsl(${angle}, 10%, 100%)`)
      gradient.addColorStop(0.5, `hsl(${angle}, 70%, 60%)`)
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`)

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // Draw inner circle overlay for current selection
    ctx.beginPath()
    ctx.arc(centerX, centerY, 18, 0, Math.PI * 2)
    ctx.fillStyle = selectedColor
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [selectedColor])

  const getColorFromCanvas = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const rect = canvas.getBoundingClientRect()
    const cx = x - rect.left
    const cy = y - rect.top

    // Check if click is within the wheel (not in center preview circle)
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const dist = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2)

    if (dist < 20 || dist > canvas.width / 2 - 2) return null

    const pixel = ctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
  }, [])

  const handleCanvasInteraction = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.stopPropagation()
      e.preventDefault()

      let clientX: number, clientY: number
      if ('touches' in e) {
        const touch = e.touches[0]
        if (!touch) return
        clientX = touch.clientX
        clientY = touch.clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const color = getColorFromCanvas(clientX, clientY)
      if (color) {
        setSelectedColor(color)
      }
    },
    [getColorFromCanvas]
  )

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true)
      handleCanvasInteraction(e)
    },
    [handleCanvasInteraction]
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        handleCanvasInteraction(e)
      }
    },
    [isDragging, handleCanvasInteraction]
  )

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Stop Leaflet map events from propagating
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const stop = (e: Event) => {
      e.stopPropagation()
    }
    el.addEventListener('mousedown', stop)
    el.addEventListener('dblclick', stop)
    el.addEventListener('wheel', stop)
    el.addEventListener('touchstart', stop)

    return () => {
      el.removeEventListener('mousedown', stop)
      el.removeEventListener('dblclick', stop)
      el.removeEventListener('wheel', stop)
      el.removeEventListener('touchstart', stop)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        background: 'rgba(18, 18, 22, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 14,
        padding: 16,
        minWidth: 180,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <div>
          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}>
            Line Color
          </div>
          <div style={{
            fontSize: 12,
            color: '#D0D0D0',
            fontWeight: 500,
            marginTop: 2,
          }}>
            {pairName}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            color: '#999',
            cursor: 'pointer',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Color Wheel Canvas */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 12,
      }}>
        <canvas
          ref={canvasRef}
          style={{
            borderRadius: '50%',
            cursor: 'crosshair',
            border: '2px solid rgba(255,255,255,0.08)',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onTouchStart={(e) => handleCanvasInteraction(e)}
          onTouchMove={(e) => handleCanvasInteraction(e)}
        />
      </div>

      {/* Preset swatches */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 3,
        marginBottom: 12,
      }}>
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedColor(color)
            }}
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: color,
              border: selectedColor === color
                ? '2px solid #fff'
                : '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.15s ease',
              transform: selectedColor === color ? 'scale(1.25)' : 'scale(1)',
            }}
            title={color}
          />
        ))}
      </div>

      {/* Custom color + Apply */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          position: 'relative',
          width: 28,
          height: 28,
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}>
          <input
            type="color"
            value={selectedColor.startsWith('#') ? selectedColor : rgbToHex(selectedColor)}
            onChange={(e) => {
              e.stopPropagation()
              setSelectedColor(e.target.value)
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: -4,
              left: -4,
              width: 36,
              height: 36,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        </div>
        <div style={{
          flex: 1,
          fontSize: 11,
          color: '#888',
          fontFamily: 'monospace',
        }}>
          {selectedColor.startsWith('#') ? selectedColor : rgbToHex(selectedColor)}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onColorChange(selectedColor.startsWith('#') ? selectedColor : rgbToHex(selectedColor))
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(168,196,176,0.3), rgba(168,196,176,0.15))',
            border: '1px solid rgba(168,196,176,0.3)',
            borderRadius: 6,
            color: '#A8C4B0',
            cursor: 'pointer',
            padding: '5px 14px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
            transition: 'all 0.15s ease',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  )
}

/** Convert rgb(...) string to hex */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g)
  const [rs, gs, bs] = match ?? []
  if (rs === undefined || gs === undefined || bs === undefined) return '#6B7B8D'
  const r = parseInt(rs)
  const g = parseInt(gs)
  const b = parseInt(bs)
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
