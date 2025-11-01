import { useEffect, useRef, useState } from 'react'

interface DensityMapProps {
  densityMap: number[][]
  frameName: string
  frameWidth: number
  frameHeight: number
  childCount: number
}

interface SelectedCell {
  row: number
  col: number
}

const DensityMap = ({ densityMap, frameName, frameWidth, frameHeight, childCount }: DensityMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, 200, 200)

    // Find max density for color scaling
    const maxDensity = Math.max(...densityMap.flat())

    // Draw density cells
    const cellSize = 20 // 200px / 10 cells
    densityMap.forEach((row, i) => {
      row.forEach((density, j) => {
        const intensity = density / maxDensity
        const isSelected = selectedCell?.row === i && selectedCell?.col === j
        
        // Use green for selected cell, pink for others
        ctx.fillStyle = isSelected
          ? `rgba(71, 255, 133, ${Math.min(0.9, intensity)})`
          : `rgba(255, 71, 133, ${Math.min(0.9, intensity)})`
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize)
        
        // Draw cell borders
        ctx.strokeStyle = isSelected ? '#47ff85' : '#2c2c2c'
        ctx.strokeRect(j * cellSize, i * cellSize, cellSize, cellSize)

        // Draw density number
        if (density > 0) {
          ctx.fillStyle = intensity > 0.5 ? '#ffffff' : '#000000'
          ctx.font = '10px Inter'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            density.toString(),
            j * cellSize + cellSize / 2,
            i * cellSize + cellSize / 2
          )
        }
      })
    })
  }, [densityMap, selectedCell])

  return (
    <div className="p-4 bg-figma-bg-secondary rounded-lg">
      <div className="mb-4">
        <h3 className="text-lg font-medium">{frameName}</h3>
        <p className="text-sm text-figma-text-secondary">
          {frameWidth} × {frameHeight}px • {childCount} elements
        </p>
      </div>
      
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="border border-figma-border rounded cursor-pointer"
        onClick={(e) => {
          const canvas = canvasRef.current
          if (!canvas) return

          const rect = canvas.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          
          const cellSize = 20
          const col = Math.floor(x / cellSize)
          const row = Math.floor(y / cellSize)
          
          if (row >= 0 && row < 10 && col >= 0 && col < 10) {
            // If clicking the same cell, deselect it
            if (selectedCell?.row === row && selectedCell?.col === col) {
              setSelectedCell(null)
              // Send message to remove highlight
              parent.postMessage({ 
                pluginMessage: { 
                  type: 'remove-highlight'
                }
              }, '*')
            } else {
              // Select new cell
              setSelectedCell({ row, col })
              // Send message to highlight this section
              parent.postMessage({ 
                pluginMessage: { 
                  type: 'highlight-section',
                  row,
                  col,
                  frameWidth,
                  frameHeight
                }
              }, '*')
            }
          }
        }}
      />
      
      <div className="mt-4 text-sm text-figma-text-secondary">
        <p>Density map shows number of overlapping elements in each cell.</p>
        <p>Higher numbers indicate higher density.</p>
      </div>
    </div>
  )
}

export default DensityMap
