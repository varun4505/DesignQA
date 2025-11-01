import { useState } from 'react'
import { AlertCircle, AlertTriangle, Info, CheckCircle, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import { AnalysisResults, Issue } from '../App'

interface IssuesListProps {
  results: AnalysisResults | null
  onApplyFix: (fix: any) => void
  onApplyAllFixes: (fixes: any[]) => void
  onSelectNode: (nodeId: string) => void
}

export default function IssuesList({ results, onApplyFix, onApplyAllFixes, onSelectNode }: IssuesListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['accessibility']))
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set())

  if (!results) {
    return (
      <div className="text-center py-12">
        <Info size={48} className="mx-auto mb-4 text-figma-text-secondary" />
        <h3 className="text-lg font-medium mb-2">No Issues to Display</h3>
        <p className="text-sm text-figma-text-secondary">
          Run an analysis first to see issues
        </p>
      </div>
    )
  }

  const categories = [
    { key: 'accessibility', label: 'Accessibility', issues: results.accessibility, color: 'red' },
    { key: 'structure', label: 'Structure', issues: results.structure, color: 'blue' },
    { key: 'typography', label: 'Typography', issues: results.typography, color: 'yellow' },
    { key: 'layout', label: 'Layout', issues: results.layout, color: 'purple' },
    { key: 'components', label: 'Components', issues: results.components, color: 'green' },
  ]

  if (results.prototypes && results.prototypes.length > 0) {
    categories.push({ key: 'prototypes', label: 'Prototypes', issues: results.prototypes, color: 'pink' })
  }

  const toggleCategory = (key: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleIssue = (issueId: string) => {
    const newSelected = new Set(selectedIssues)
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId)
    } else {
      newSelected.add(issueId)
    }
    setSelectedIssues(newSelected)
  }

  const selectAllFixable = () => {
    const allFixable = categories
      .flatMap(cat => cat.issues)
      .filter(issue => issue.autoFixable)
      .map(issue => issue.nodeId)
    setSelectedIssues(new Set(allFixable))
  }

  const applySelectedFixes = () => {
    const fixes = categories
      .flatMap(cat => cat.issues)
      .filter(issue => selectedIssues.has(issue.nodeId) && issue.fix)
      .map(issue => issue.fix)
    
    if (fixes.length > 0) {
      onApplyAllFixes(fixes)
      setSelectedIssues(new Set())
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-400" />
      default:
        return <Info size={16} className="text-blue-400" />
    }
  }

  const totalIssues = categories.reduce((sum, cat) => sum + cat.issues.length, 0)
  const totalFixable = categories.reduce((sum, cat) => sum + cat.issues.filter(i => i.autoFixable).length, 0)

  if (totalIssues === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
        <h3 className="text-lg font-medium mb-2">No Issues Found!</h3>
        <p className="text-sm text-figma-text-secondary">
          Your design looks great! 🎉
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      {totalFixable > 0 && (
        <div className="bg-figma-bg-hover rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-figma-primary" />
            <span className="text-sm">
              {selectedIssues.size > 0 ? `${selectedIssues.size} selected` : `${totalFixable} auto-fixable`}
            </span>
          </div>
          <div className="flex gap-2">
            {selectedIssues.size === 0 && (
              <button
                onClick={selectAllFixable}
                className="text-xs px-3 py-1 bg-figma-bg hover:bg-figma-border rounded text-figma-text-secondary hover:text-figma-text transition-colors"
              >
                Select All
              </button>
            )}
            {selectedIssues.size > 0 && (
              <>
                <button
                  onClick={() => setSelectedIssues(new Set())}
                  className="text-xs px-3 py-1 bg-figma-bg hover:bg-figma-border rounded text-figma-text-secondary hover:text-figma-text transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={applySelectedFixes}
                  className="text-xs px-3 py-1 bg-figma-primary hover:bg-figma-primary-hover rounded text-white transition-colors"
                >
                  Apply Fixes
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Issues by Category */}
      <div className="space-y-2">
        {categories.map(category => (
          category.issues.length > 0 && (
            <div key={category.key} className="bg-figma-bg-hover rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-figma-border transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedCategories.has(category.key) ? (
                    <ChevronDown size={16} className="text-figma-text-secondary" />
                  ) : (
                    <ChevronRight size={16} className="text-figma-text-secondary" />
                  )}
                  <span className="text-sm font-medium">{category.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-${category.color}-500/20 text-${category.color}-400`}>
                    {category.issues.length}
                  </span>
                </div>
              </button>

              {/* Category Issues */}
              {expandedCategories.has(category.key) && (
                <div className="px-4 pb-3 space-y-2">
                  {category.issues.map((issue, index) => (
                    <div
                      key={`${issue.nodeId}-${index}`}
                      className="bg-figma-bg rounded p-3 space-y-2 hover:bg-figma-bg-hover transition-colors cursor-pointer border border-transparent hover:border-figma-primary/50"
                      onClick={() => onSelectNode(issue.nodeId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <div className="mt-0.5">
                            {getSeverityIcon(issue.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-figma-text break-words">
                              {issue.message}
                            </p>
                            <p className="text-xs text-figma-text-secondary mt-1">
                              Layer: <span className="font-mono">{issue.nodeName}</span>
                            </p>
                          </div>
                        </div>
                        {issue.autoFixable && (
                          <label 
                            className="flex items-center cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIssues.has(issue.nodeId)}
                              onChange={() => toggleIssue(issue.nodeId)}
                              className="w-4 h-4 rounded border-figma-border bg-figma-bg checked:bg-figma-primary"
                            />
                          </label>
                        )}
                      </div>

                      {/* Details */}
                      {issue.details && Object.keys(issue.details).length > 0 && (
                        <div className="bg-figma-bg-hover rounded p-2 text-xs text-figma-text-secondary">
                          {Object.entries(issue.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="font-mono">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Fix Button */}
                      {issue.autoFixable && issue.fix && !selectedIssues.has(issue.nodeId) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onApplyFix(issue.fix)
                          }}
                          className="text-xs px-3 py-1.5 bg-figma-primary hover:bg-figma-primary-hover rounded text-white transition-colors w-full flex items-center justify-center gap-1"
                        >
                          <Wrench size={12} />
                          Quick Fix
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  )
}
