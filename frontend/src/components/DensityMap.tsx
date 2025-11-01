import { useEffect, useRef } from 'react'

interface DensityMapProps {
  densityMap: number[][]
  frameName: string
  frameWidth: number
  frameHeight: number
  childCount: number
}

const DensityMap = ({ densityMap, frameName, frameWidth, frameHeight, childCount }: DensityMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
        ctx.fillStyle = `rgba(255, 71, 133, ${Math.min(0.9, intensity)})`
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize)
        
        // Draw cell borders
        ctx.strokeStyle = '#2c2c2c'
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
  }, [densityMap])

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
        className="border border-figma-border rounded"
      />
      
      <div className="mt-4 text-sm text-figma-text-secondary">
        <p>Density map shows number of overlapping elements in each cell.</p>
        <p>Darker colors indicate higher density.</p>
      </div>
    </div>
  )
}

export default DensityMap
