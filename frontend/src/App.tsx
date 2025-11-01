import { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import IssuesList from './components/IssuesList'
import SmartRename from './components/SmartRename'
import ExportReport from './components/ExportReport'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export interface Issue {
  type: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  nodeId: string
  nodeName: string
  message: string
  details: any
  autoFixable: boolean
  fix?: any
}

export interface AnalysisResults {
  accessibility: Issue[]
  structure: Issue[]
  typography: Issue[]
  layout: Issue[]
  components: Issue[]
  prototypes?: Issue[]
}

export interface AnalysisSummary {
  total: number
  issues: number
  critical: number
}

function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'issues' | 'rename' | 'export'>('dashboard')

  useEffect(() => {
    // Listen for messages from plugin code
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage
      
      if (!msg) return

      console.log('Received from plugin:', msg.type)

      switch (msg.type) {
        case 'analysis-start':
          setIsAnalyzing(true)
          setResults(null)
          break

        case 'analysis-complete':
          setIsAnalyzing(false)
          setResults(msg.results)
          setSummary(msg.summary)
          showNotification('success', `Analysis complete! Found ${msg.summary.issues} issues.`)
          break

        case 'error':
          setIsAnalyzing(false)
          showNotification('error', msg.message)
          break

        case 'auto-fix-complete':
          showNotification('success', `✓ Applied ${msg.success} fixes${msg.failed > 0 ? `, ${msg.failed} failed` : ''}`)
          // Re-analyze after fixes
          analyzeSelection()
          break

        case 'fix-applied':
          showNotification('success', msg.message || '✓ Fix applied')
          // Re-analyze after single fix
          analyzeSelection()
          break

        case 'smart-rename-data':
          // Handle smart rename data
          break

        default:
          console.log('Unhandled message type:', msg.type)
      }
    }
  }, [])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const analyzeSelection = () => {
    parent.postMessage({ pluginMessage: { type: 'analyze-selection' } }, '*')
  }

  const analyzePage = () => {
    parent.postMessage({ pluginMessage: { type: 'analyze-page' } }, '*')
  }

  const applyAutoFix = (fixes: any[]) => {
    parent.postMessage({ pluginMessage: { type: 'auto-fix', fixes } }, '*')
  }

  const applySingleFix = (fix: any) => {
    parent.postMessage({ pluginMessage: { type: 'apply-fix', fix } }, '*')
  }

  const selectNode = (nodeId: string) => {
    parent.postMessage({ pluginMessage: { type: 'select-node', nodeId } }, '*')
  }

  const closePlugin = () => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')
  }

  return (
    <div className="min-h-screen bg-figma-bg text-figma-text">
      {/* Notification */}
      {notification && (
        <div className={`mx-4 mt-3 p-3 rounded-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-3 border-b border-figma-border">
        <div className="flex gap-2">
          <button
            onClick={analyzeSelection}
            disabled={isAnalyzing}
            className="flex-1 bg-figma-primary hover:bg-figma-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isAnalyzing && <Loader2 size={16} className="animate-spin" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Selection'}
          </button>
          <button
            onClick={analyzePage}
            disabled={isAnalyzing}
            className="flex-1 bg-figma-bg-hover hover:bg-figma-border disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Analyze Page
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-figma-border">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'issues', label: 'Issues' },
          { id: 'rename', label: 'Smart Rename' },
          { id: 'export', label: 'Export' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-figma-primary border-b-2 border-figma-primary'
                : 'text-figma-text-secondary hover:text-figma-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'dashboard' && (
          <Dashboard 
            results={results} 
            summary={summary} 
            isAnalyzing={isAnalyzing}
          />
        )}
        {activeTab === 'issues' && (
          <IssuesList 
            results={results}
            onApplyFix={applySingleFix}
            onApplyAllFixes={applyAutoFix}
            onSelectNode={selectNode}
          />
        )}
        {activeTab === 'rename' && (
          <SmartRename />
        )}
        {activeTab === 'export' && (
          <ExportReport results={results} summary={summary} />
        )}
      </div>
    </div>
  )
}

export default App
