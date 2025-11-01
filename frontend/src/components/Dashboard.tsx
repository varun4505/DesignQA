import { BarChart3, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { AnalysisResults, AnalysisSummary } from '../App'

interface DashboardProps {
  results: AnalysisResults | null
  summary: AnalysisSummary | null
  isAnalyzing: boolean
}

export default function Dashboard({ results, summary, isAnalyzing }: DashboardProps) {
  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-figma-primary mx-auto mb-4"></div>
          <p className="text-figma-text-secondary">Analyzing your design...</p>
        </div>
      </div>
    )
  }

  if (!results || !summary) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={48} className="mx-auto mb-4 text-figma-text-secondary" />
        <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
        <p className="text-sm text-figma-text-secondary mb-4">
          Select layers and click "Analyze Selection" to start
        </p>
        <div className="bg-figma-bg-hover rounded-lg p-4 text-left max-w-sm mx-auto">
          <h4 className="font-medium mb-2 text-sm">What we check:</h4>
          <ul className="text-xs text-figma-text-secondary space-y-1">
            <li>• Accessibility & contrast ratios (WCAG)</li>
            <li>• Typography consistency & hierarchy</li>
            <li>• Touch target sizes (mobile-friendly)</li>
            <li>• Layout alignment & spacing</li>
            <li>• Component structure & naming</li>
            <li>• Prototype flow integrity</li>
          </ul>
        </div>
      </div>
    )
  }

  const issuesByCategory = [
    {
      name: 'Accessibility',
      count: results.accessibility.length,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    },
    {
      name: 'Structure',
      count: results.structure.length,
      icon: Info,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      name: 'Typography',
      count: results.typography.length,
      icon: Info,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    },
    {
      name: 'Layout',
      count: results.layout.length,
      icon: Info,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    },
    {
      name: 'Components',
      count: results.components.length,
      icon: Info,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
  ]

  if (results.prototypes && results.prototypes.length > 0) {
    issuesByCategory.push({
      name: 'Prototypes',
      count: results.prototypes.length,
      icon: Info,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20'
    })
  }

  const totalAutoFixable = [
    ...results.accessibility,
    ...results.structure,
    ...results.typography,
    ...results.layout,
    ...results.components
  ].filter(issue => issue.autoFixable).length

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-figma-bg-hover rounded-lg p-4">
          <div className="text-2xl font-bold text-figma-primary">{summary.total}</div>
          <div className="text-xs text-figma-text-secondary mt-1">Layers Analyzed</div>
        </div>
        <div className="bg-figma-bg-hover rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{summary.issues}</div>
          <div className="text-xs text-figma-text-secondary mt-1">Issues Found</div>
        </div>
        <div className="bg-figma-bg-hover rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{summary.critical}</div>
          <div className="text-xs text-figma-text-secondary mt-1">Critical Issues</div>
        </div>
      </div>

      {/* Score */}
      <div className="bg-figma-bg-hover rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Design Quality Score</span>
          <span className="text-2xl font-bold text-figma-primary">
            {Math.max(0, Math.round(100 - (summary.issues / summary.total) * 10))}%
          </span>
        </div>
        <div className="w-full bg-figma-bg rounded-full h-2">
          <div
            className="bg-figma-primary h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(0, Math.round(100 - (summary.issues / summary.total) * 10))}%`
            }}
          ></div>
        </div>
      </div>

      {/* Issues by Category */}
      <div>
        <h3 className="text-sm font-medium mb-3">Issues by Category</h3>
        <div className="space-y-2">
          {issuesByCategory.map(category => (
            <div
              key={category.name}
              className="bg-figma-bg-hover rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${category.bgColor}`}>
                  <category.icon size={16} className={category.color} />
                </div>
                <span className="text-sm">{category.name}</span>
              </div>
              <span className={`text-sm font-medium ${category.count > 0 ? category.color : 'text-figma-text-secondary'}`}>
                {category.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Fix Available */}
      {totalAutoFixable > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-1">
                {totalAutoFixable} Auto-Fixable Issues
              </h4>
              <p className="text-xs text-figma-text-secondary">
                Switch to the Issues tab to review and apply automatic fixes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      {summary.critical > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-1">
                Critical Accessibility Issues
              </h4>
              <p className="text-xs text-figma-text-secondary">
                These issues may prevent users from accessing your design. Address them first for WCAG compliance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
