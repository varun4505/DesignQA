import { useState } from 'react'
import { Sparkles, Loader2, Check } from 'lucide-react'
import axios from 'axios'

const BACKEND_URL = 'http://localhost:5000' // Backend API URL

export default function SmartRename() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [currentName, setCurrentName] = useState<string>('')
  const [nodeId, setNodeId] = useState<string | null>(null)

  const analyzeSelection = () => {
    // Request node data from plugin
    parent.postMessage({ pluginMessage: { type: 'get-node-data' } }, '*')
  }

  // Listen for messages from plugin
  window.addEventListener('message', async (event) => {
    const msg = event.data.pluginMessage

    if (msg?.type === 'node-data') {
      setCurrentName(msg.data.name)
      setNodeId(msg.nodeId)
      await generateSmartName(msg.data)
    } else if (msg?.type === 'smart-rename-data') {
      setCurrentName(msg.data.name)
      setNodeId(msg.nodeId)
      await generateSmartName(msg.data)
    }
  })

  const generateSmartName = async (nodeData: any) => {
    setIsAnalyzing(true)
    setSuggestion(null)

    try {
      // Call backend AI service
      const response = await axios.post(`${BACKEND_URL}/api/smart-rename`, {
        nodeData
      })

      setSuggestion(response.data.suggestion)
    } catch (error) {
      console.error('Failed to generate name:', error)
      
      // Fallback to local logic if backend is unavailable
      const fallbackName = generateFallbackName(nodeData)
      setSuggestion(fallbackName)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateFallbackName = (nodeData: any): string => {
    const { type, children } = nodeData

    // Check for text content
    if (nodeData.characters) {
      const text = nodeData.characters.slice(0, 20)
      return `Text/${text}`
    }

    // Check children for text
    const textChild = children?.find((c: any) => c.characters)
    if (textChild) {
      const text = textChild.characters.slice(0, 20)
      
      // Detect button-like structures
      if (nodeData.hasInteractions || nodeData.hasFill) {
        return `Button/${text}`
      }
      
      return `Label/${text}`
    }

    // Component-based naming
    if (type === 'COMPONENT' || type === 'INSTANCE') {
      return `Component/${type === 'INSTANCE' ? 'Instance' : 'Main'}`
    }

    // Frame with multiple children
    if (type === 'FRAME' && children?.length > 2) {
      return `Container/Group-${children.length}`
    }

    return `${type}/Unnamed`
  }

  const applySuggestion = () => {
    if (!suggestion || !nodeId) return

    parent.postMessage({
      pluginMessage: {
        type: 'apply-fix',
        fix: {
          type: 'rename',
          nodeId,
          newName: suggestion
        }
      }
    }, '*')

    setSuggestion(null)
    setCurrentName('')
    setNodeId(null)
  }

  return (
    <div className="space-y-4">
      <div className="bg-figma-bg-hover rounded-lg p-4">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles size={20} className="text-figma-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium mb-1">AI-Powered Renaming</h3>
            <p className="text-xs text-figma-text-secondary">
              Automatically generate semantic, hierarchical names for your layers based on their content and structure.
            </p>
          </div>
        </div>

        <button
          onClick={analyzeSelection}
          disabled={isAnalyzing}
          className="w-full bg-figma-primary hover:bg-figma-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Analyze Selection
            </>
          )}
        </button>
      </div>

      {/* Suggestion */}
      {(suggestion || isAnalyzing) && (
        <div className="bg-figma-bg-hover rounded-lg p-4 space-y-3">
          <div>
            <label className="text-xs text-figma-text-secondary mb-1 block">Current Name</label>
            <div className="bg-figma-bg rounded px-3 py-2 text-sm font-mono text-figma-text-secondary">
              {currentName || 'Loading...'}
            </div>
          </div>

          <div className="text-center py-2">
            <div className="text-figma-text-secondary">↓</div>
          </div>

          <div>
            <label className="text-xs text-figma-text-secondary mb-1 block">Suggested Name</label>
            {isAnalyzing ? (
              <div className="bg-figma-bg rounded px-3 py-2 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-figma-primary" />
                <span className="text-sm text-figma-text-secondary">Generating...</span>
              </div>
            ) : (
              <div className="bg-figma-bg rounded px-3 py-2 text-sm font-mono text-figma-primary">
                {suggestion}
              </div>
            )}
          </div>

          {suggestion && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setSuggestion(null)
                  setCurrentName('')
                  setNodeId(null)
                }}
                className="flex-1 bg-figma-bg hover:bg-figma-border text-figma-text-secondary hover:text-figma-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Reject
              </button>
              <button
                onClick={applySuggestion}
                className="flex-1 bg-figma-primary hover:bg-figma-primary-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Examples */}
      <div className="bg-figma-bg-hover rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Naming Examples</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-figma-text-secondary font-mono">button-1</span>
            <span className="text-figma-text-secondary">→</span>
            <span className="text-figma-primary font-mono">Button/Primary/SignUp</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-figma-text-secondary font-mono">frame-23</span>
            <span className="text-figma-text-secondary">→</span>
            <span className="text-figma-primary font-mono">Card/Product/Featured</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-figma-text-secondary font-mono">text-42</span>
            <span className="text-figma-text-secondary">→</span>
            <span className="text-figma-primary font-mono">Text/Heading/Welcome</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <h4 className="text-xs font-medium text-blue-400 mb-2">💡 Pro Tips</h4>
        <ul className="text-xs text-figma-text-secondary space-y-1">
          <li>• Select meaningful text layers for better suggestions</li>
          <li>• Works best with interactive elements (buttons, cards)</li>
          <li>• Uses component structure and hierarchy</li>
          <li>• Follows Figma naming best practices</li>
        </ul>
      </div>
    </div>
  )
}
