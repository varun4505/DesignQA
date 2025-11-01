// DesignQA - Main Plugin Code
// Runs in Figma's sandbox environment

// Show the plugin UI
figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: "DesignQA - AI Design Auditor"
});

// Store for analysis results
let analysisCache = new Map<string, any>();

// Density analysis function
function analyzeDensity(frame: FrameNode): number[][] {
  // Initialize 10x10 density grid
  const densityMap: number[][] = Array(10).fill(0).map(() => Array(10).fill(0));
  
  if (!('children' in frame)) return densityMap;
  
  // Get frame bounds
  const { width, height } = frame;
  const cellWidth = width / 10;
  const cellHeight = height / 10;
  
  // Analyze each child's contribution to density
  frame.children.forEach(child => {
    if (!('x' in child) || !('y' in child)) return;
    
    // Get child bounds
    const childBounds = {
      left: child.x,
      top: child.y,
      right: child.x + (child.width || 0),
      bottom: child.y + (child.height || 0)
    };
    
    // Calculate which cells this child overlaps
    const startCol = Math.max(0, Math.floor(childBounds.left / cellWidth));
    const endCol = Math.min(9, Math.floor(childBounds.right / cellWidth));
    const startRow = Math.max(0, Math.floor(childBounds.top / cellHeight));
    const endRow = Math.min(9, Math.floor(childBounds.bottom / cellHeight));
    
    // Increment density for overlapped cells
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        densityMap[row][col]++;
      }
    }
  });
  
  return densityMap;
}

async function analyzeDensityCommand() {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1 || !('children' in selection[0])) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Please select exactly one frame to analyze density'
    });
    return;
  }

  const frame = selection[0] as FrameNode;
  const densityMap = analyzeDensity(frame);

  figma.ui.postMessage({
    type: 'density-result',
    data: {
      densityMap,
      frameName: frame.name,
      frameWidth: frame.width,
      frameHeight: frame.height,
      childCount: frame.children.length
    }
  });
}

// Helper functions for new features
function checkHierarchy(node: SceneNode): any[] {
  const issues = [];
  
  // Check for generic names
  if (node.name.match(/^(Frame|Group|Rectangle|Ellipse)\s*\d+$/)) {
    issues.push({
      type: 'hierarchy',
      subType: 'generic-name',
      severity: 'warning',
      message: `Generic name detected: "${node.name}"`,
      nodeId: node.id,
      nodeName: node.name,
      suggestedFix: 'Rename with meaningful description'
    });
  }

  // Check for empty groups
  if ('children' in node && node.children.length === 0) {
    issues.push({
      type: 'hierarchy',
      subType: 'empty-group',
      severity: 'error',
      message: `Empty group detected: "${node.name}"`,
      nodeId: node.id,
      nodeName: node.name,
      suggestedFix: 'Remove empty group or add content'
    });
  }

  // Recursively check children
  if ('children' in node) {
    for (const child of node.children) {
      issues.push(...checkHierarchy(child));
    }
  }
  
  return issues;
}

// Message handler from UI
figma.ui.onmessage = async (msg: any) => {
  console.log('Received message:', msg.type);

  try {
    switch (msg.type) {
      case 'analyze-selection':
        await analyzeSelection();
        break;

      case 'analyze-page':
        await analyzePage();
        break;

      case 'get-node-data':
        await getNodeDataFromSelection();
        break;

      case 'smart-rename':
        await smartRename(msg.nodeId);
        break;

      case 'auto-fix':
        await autoFix(msg.fixes);
        break;

      case 'apply-fix':
        await applySingleFix(msg.fix);
        break;

      case 'export-report':
        await exportReport(msg.format);
        break;

      case 'select-node':
        await selectAndZoomToNode(msg.nodeId);
        break;

      case 'analyze-density':
        await analyzeDensityCommand();
        break;

      case 'cancel':
        figma.closePlugin();
        break;

      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

// ===========================
// CORE ANALYSIS FUNCTIONS
// ===========================

async function analyzeSelection() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Please select at least one layer to analyze'
    });
    return;
  }

  figma.ui.postMessage({ type: 'analysis-start' });

  const results = {
    accessibility: [] as any[],
    structure: [] as any[],
    typography: [] as any[],
    layout: [] as any[],
    components: [] as any[],
    hierarchy: [] as any[]
  };

  for (const node of selection) {
    const nodeResults = await analyzeNode(node);
    
    results.accessibility.push(...nodeResults.accessibility);
    results.structure.push(...nodeResults.structure);
    results.typography.push(...nodeResults.typography);
    results.layout.push(...nodeResults.layout);
    results.components.push(...nodeResults.components);
    
    // Add results from new checks
    results.hierarchy.push(...checkHierarchy(node));
  }

  figma.ui.postMessage({
    type: 'analysis-complete',
    results: results,
    summary: {
      total: selection.length,
      issues: results.accessibility.length + results.structure.length + 
              results.typography.length + results.layout.length +
              results.hierarchy.length,
      critical: results.accessibility.filter((i: any) => i.severity === 'critical').length +
                results.hierarchy.filter((i: any) => i.severity === 'critical').length
    }
  });
}

async function analyzePage() {
  figma.ui.postMessage({ type: 'analysis-start' });

  const page = figma.currentPage;
  const allNodes = page.children;

  const results = {
    accessibility: [] as any[],
    structure: [] as any[],
    typography: [] as any[],
    layout: [] as any[],
    components: [] as any[],
    prototypes: [] as any[]
  };

  for (const node of allNodes) {
    const nodeResults = await analyzeNodeRecursive(node);
    
    results.accessibility.push(...nodeResults.accessibility);
    results.structure.push(...nodeResults.structure);
    results.typography.push(...nodeResults.typography);
    results.layout.push(...nodeResults.layout);
    results.components.push(...nodeResults.components);
  }

  // Analyze prototypes
  const prototypeIssues = await analyzePrototypes(allNodes);
  results.prototypes.push(...prototypeIssues);

  figma.ui.postMessage({
    type: 'analysis-complete',
    results: results,
    summary: {
      total: allNodes.length,
      issues: results.accessibility.length + results.structure.length + 
              results.typography.length + results.layout.length + results.prototypes.length,
      critical: results.accessibility.filter((i: any) => i.severity === 'critical').length
    }
  });
}

async function analyzeNode(node: SceneNode): Promise<any> {
  const results = {
    accessibility: [] as any[],
    structure: [] as any[],
    typography: [] as any[],
    layout: [] as any[],
    components: [] as any[]
  };

  // Accessibility checks
  if ('fills' in node && 'characters' in node) {
    const contrastIssues = await checkContrast(node as TextNode);
    results.accessibility.push(...contrastIssues);
  }

  // Touch target validation
  if (isInteractive(node)) {
    const touchTargetIssue = checkTouchTarget(node);
    if (touchTargetIssue) {
      results.accessibility.push(touchTargetIssue);
    }
  }

  // Typography checks
  if (node.type === 'TEXT') {
    const typoIssues = checkTypography(node as TextNode);
    results.typography.push(...typoIssues);
  }

  // Structure checks
  const structureIssues = checkStructure(node);
  results.structure.push(...structureIssues);

  // Layout checks
  if ('layoutMode' in node) {
    const layoutIssues = checkLayout(node as FrameNode);
    results.layout.push(...layoutIssues);
  }

  // Component checks
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
    const componentIssues = await checkComponent(node);
    results.components.push(...componentIssues);
  }

  return results;
}

async function analyzeNodeRecursive(node: SceneNode): Promise<any> {
  const results = await analyzeNode(node);

  if ('children' in node) {
    for (const child of node.children) {
      const childResults = await analyzeNodeRecursive(child);
      
      results.accessibility.push(...childResults.accessibility);
      results.structure.push(...childResults.structure);
      results.typography.push(...childResults.typography);
      results.layout.push(...childResults.layout);
      results.components.push(...childResults.components);
    }
  }

  return results;
}

// ===========================
// ACCESSIBILITY CHECKERS
// ===========================

async function checkContrast(node: TextNode): Promise<any[]> {
  const issues: any[] = [];

  try {
    // Get text color
    const fills = node.fills as Paint[];
    if (!Array.isArray(fills) || fills.length === 0) return issues;

    const textFill = fills.find(f => f.type === 'SOLID') as SolidPaint | undefined;
    if (!textFill) return issues;

    // Get background color (check parent)
    let parent = node.parent;
    let bgColor = null;

    while (parent && !bgColor) {
      if ('fills' in parent) {
        const parentFills = parent.fills as Paint[];
        if (Array.isArray(parentFills)) {
          const solidFill = parentFills.find(f => f.type === 'SOLID') as SolidPaint | undefined;
          if (solidFill) {
            bgColor = solidFill.color;
            break;
          }
        }
      }
      parent = parent.parent;
    }

    if (!bgColor) {
      bgColor = { r: 1, g: 1, b: 1 }; // Default to white
    }

    // Calculate contrast ratio
    const contrast = calculateContrastRatio(textFill.color, bgColor);
    const fontSize = node.fontSize as number;
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && node.fontWeight as number >= 700);

    const requiredContrast = isLargeText ? 3.0 : 4.5;

    if (contrast < requiredContrast) {
      issues.push({
        type: 'contrast',
        severity: 'critical',
        nodeId: node.id,
        nodeName: node.name,
        message: `Low contrast ratio: ${contrast.toFixed(2)}:1 (required: ${requiredContrast}:1)`,
        details: {
          contrast: contrast.toFixed(2),
          required: requiredContrast,
          textColor: rgbToHex(textFill.color),
          bgColor: rgbToHex(bgColor),
          wcagLevel: contrast >= 4.5 ? 'AA' : 'Fail'
        },
        autoFixable: true,
        fix: {
          type: 'adjust-contrast',
          nodeId: node.id,
          suggestedTextColor: null // Will be calculated by backend
        }
      });
    }
  } catch (error) {
    console.error('Error checking contrast:', error);
  }

  return issues;
}

function checkTouchTarget(node: SceneNode): any | null {
  const MIN_TOUCH_TARGET = 48;

  if (node.width < MIN_TOUCH_TARGET || node.height < MIN_TOUCH_TARGET) {
    return {
      type: 'touch-target',
      severity: 'warning',
      nodeId: node.id,
      nodeName: node.name,
      message: `Touch target too small: ${Math.round(node.width)}x${Math.round(node.height)}px (minimum: 48x48px)`,
      details: {
        width: Math.round(node.width),
        height: Math.round(node.height),
        required: MIN_TOUCH_TARGET
      },
      autoFixable: true,
      fix: {
        type: 'resize-touch-target',
        nodeId: node.id,
        targetWidth: MIN_TOUCH_TARGET,
        targetHeight: MIN_TOUCH_TARGET
      }
    };
  }

  return null;
}

function checkTypography(node: TextNode): any[] {
  const issues = [];

  // Check for inconsistent line height
  if (typeof node.lineHeight === 'object' && node.lineHeight.unit === 'PIXELS') {
    const lineHeight = node.lineHeight.value;
    const fontSize = node.fontSize as number;
    const ratio = lineHeight / fontSize;

    if (ratio < 1.2 || ratio > 2) {
      issues.push({
        type: 'typography',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `Unusual line height ratio: ${ratio.toFixed(2)} (recommended: 1.4-1.6)`,
        details: {
          lineHeight,
          fontSize,
          ratio: ratio.toFixed(2)
        },
        autoFixable: true
      });
    }
  }

  // Check for very long text lines
  const textLength = node.characters.length;
  const lineWidth = node.width;

  if (textLength > 100 && lineWidth > 600) {
    issues.push({
      type: 'readability',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: 'Text line might be too long for comfortable reading',
      details: {
        width: Math.round(lineWidth),
        recommended: '50-75 characters per line'
      },
      autoFixable: false
    });
  }

  return issues;
}

// ===========================
// STRUCTURE CHECKERS
// ===========================

function checkStructure(node: SceneNode): any[] {
  const issues = [];

  // Check for generic naming
  const genericNames = ['frame', 'rectangle', 'group', 'component', 'instance', 'text'];
  const nodeName = node.name.toLowerCase();

  if (genericNames.some(name => nodeName.startsWith(name)) && /\d+$/.test(nodeName)) {
    issues.push({
      type: 'naming',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: 'Generic layer name detected. Consider using semantic naming.',
      details: {
        currentName: node.name,
        suggestion: 'Use Smart Rename for AI-powered suggestions'
      },
      autoFixable: true,
      fix: {
        type: 'smart-rename',
        nodeId: node.id
      }
    });
  }

  // Check for hidden layers
  if (!node.visible) {
    issues.push({
      type: 'structure',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: 'Hidden layer detected',
      details: {
        reason: 'Hidden layers can clutter the design and may be orphaned'
      },
      autoFixable: false
    });
  }

  // Check for locked layers
  if (node.locked) {
    issues.push({
      type: 'structure',
      severity: 'info',
      nodeId: node.id,
      nodeName: node.name,
      message: 'Locked layer detected',
      details: {
        reason: 'Verify if this layer needs to remain locked'
      },
      autoFixable: false
    });
  }

  return issues;
}

function checkLayout(node: FrameNode): any[] {
  const issues: any[] = [];

  // Check for manual positioning in auto-layout
  if (node.layoutMode !== 'NONE') {
    if ('children' in node) {
      node.children.forEach(child => {
        if ('constraints' in child && child.constraints) {
          // Check if manually positioned
          if (child.x % 1 !== 0 || child.y % 1 !== 0) {
            issues.push({
              type: 'layout',
              severity: 'warning',
              nodeId: child.id,
              nodeName: child.name,
              message: 'Element has fractional positioning',
              details: {
                x: child.x,
                y: child.y,
                suggestion: 'Align to pixel grid for crisp rendering'
              },
              autoFixable: true,
              fix: {
                type: 'round-position',
                nodeId: child.id
              }
            });
          }
        }
      });
    }
  }

  return issues;
}

async function checkComponent(node: ComponentNode | InstanceNode): Promise<any[]> {
  const issues = [];

  // Check for detached instances
  if (node.type === 'INSTANCE') {
    try {
      const mainComponent = await node.getMainComponentAsync();
      if (!mainComponent) {
        issues.push({
          type: 'component',
          severity: 'warning',
          nodeId: node.id,
          nodeName: node.name,
          message: 'Detached component instance',
          details: {
            reason: 'This instance is no longer connected to its main component'
          },
          autoFixable: false
        });
      }
    } catch (error) {
      // If getMainComponentAsync fails, it's likely detached
      issues.push({
        type: 'component',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Detached component instance',
        details: {
          reason: 'This instance is no longer connected to its main component'
        },
        autoFixable: false
      });
    }
  }

  return issues;
}

// ===========================
// PROTOTYPE ANALYSIS
// ===========================

async function analyzePrototypes(nodes: readonly SceneNode[]): Promise<any[]> {
  const issues: any[] = [];
  const flowMap = new Map();

  for (const node of nodes) {
    if ('reactions' in node && node.reactions && node.reactions.length > 0) {
      node.reactions.forEach(reaction => {
        if (reaction.action && reaction.action.type === 'NODE') {
          const targetId = (reaction.action as any).destinationId;
          
          if (!targetId) {
            issues.push({
              type: 'prototype',
              severity: 'error',
              nodeId: node.id,
              nodeName: node.name,
              message: 'Broken prototype link detected',
              details: {
                reason: 'Interaction points to a deleted or invalid node'
              },
              autoFixable: false
            });
          } else {
            // Track for duplicate flows
            const key = `${node.id}-${targetId}`;
            flowMap.set(key, (flowMap.get(key) || 0) + 1);
          }
        }
      });
    }
  }

  // Check for duplicate flows
  for (const [key, count] of flowMap.entries()) {
    if (count > 1) {
      const [sourceId] = key.split('-');
      const sourceNode = await figma.getNodeByIdAsync(sourceId);
      
      if (sourceNode) {
        issues.push({
          type: 'prototype',
          severity: 'info',
          nodeId: sourceId,
          nodeName: sourceNode.name,
          message: `Duplicate prototype connections detected (${count} identical flows)`,
          details: {
            count
          },
          autoFixable: false
        });
      }
    }
  }

  return issues;
}

// ===========================
// SMART RENAME FUNCTIONALITY
// ===========================

async function smartRename(nodeId: string) {
  const node = await figma.getNodeByIdAsync(nodeId);
  
  if (!node) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Node not found'
    });
    return;
  }

  // Gather context about the node
  const nodeData = extractNodeData(node as SceneNode);

  // Send to UI which will call backend AI
  figma.ui.postMessage({
    type: 'smart-rename-data',
    nodeId: nodeId,
    data: nodeData
  });
}

function extractNodeData(node: SceneNode): any {
  const data: any = {
    type: node.type,
    name: node.name,
    width: Math.round(node.width),
    height: Math.round(node.height),
    children: []
  };

  // Extract text content
  if (node.type === 'TEXT') {
    data.characters = (node as TextNode).characters;
    data.fontSize = (node as TextNode).fontSize;
  }

  // Extract children info
  if ('children' in node) {
    data.children = node.children.slice(0, 5).map(child => ({
      type: child.type,
      name: child.name,
      characters: child.type === 'TEXT' ? (child as TextNode).characters : undefined
    }));
  }

  // Check if it has interactions
  if ('reactions' in node && node.reactions && node.reactions.length > 0) {
    data.hasInteractions = true;
  }

  // Check visual properties
  if ('fills' in node) {
    data.hasFill = true;
  }

  if ('effects' in node && node.effects && node.effects.length > 0) {
    data.hasEffects = true;
  }

  return data;
}

async function getNodeDataFromSelection() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Please select a layer first'
    });
    return;
  }

  const node = selection[0];
  const data = extractNodeData(node as SceneNode);
  
  figma.ui.postMessage({
    type: 'node-data',
    nodeId: node.id,
    data: data
  });
}

async function getNodeData(nodeId: string) {
  const node = await figma.getNodeByIdAsync(nodeId);
  
  if (!node) {
    figma.ui.postMessage({
      type: 'error',
      message: 'Node not found'
    });
    return;
  }

  const data = extractNodeData(node as SceneNode);
  
  figma.ui.postMessage({
    type: 'node-data',
    nodeId: nodeId,
    data: data
  });
}

// ===========================
// AUTO-FIX FUNCTIONALITY
// ===========================

async function autoFix(fixes: any[]) {
  let successCount = 0;
  let failCount = 0;

  for (const fix of fixes) {
    try {
      await applySingleFix(fix);
      successCount++;
    } catch (error) {
      console.error('Failed to apply fix:', error);
      failCount++;
    }
  }

  figma.ui.postMessage({
    type: 'auto-fix-complete',
    success: successCount,
    failed: failCount
  });

  figma.notify(`✓ Applied ${successCount} fixes${failCount > 0 ? `, ${failCount} failed` : ''}`);
}

async function applySingleFix(fix: any) {
  const node = await figma.getNodeByIdAsync(fix.nodeId);
  
  if (!node) {
    throw new Error('Node not found');
  }

  let message = '✓ Fix applied';

  switch (fix.type) {
    case 'adjust-contrast':
      await fixContrast(node as TextNode, fix);
      message = '✓ Contrast adjusted';
      break;

    case 'resize-touch-target':
      fixTouchTarget(node as SceneNode, fix);
      message = '✓ Touch target resized';
      break;

    case 'round-position':
      fixPosition(node as SceneNode);
      message = '✓ Position aligned to pixel grid';
      break;

    case 'smart-rename':
      // This will be handled by AI
      await smartRename(fix.nodeId);
      message = '✓ Smart rename applied';
      break;

    case 'rename':
      if ('name' in node) {
        node.name = fix.newName;
        message = `✓ Renamed to: ${fix.newName}`;
      }
      break;

    default:
      console.warn('Unknown fix type:', fix.type);
  }

  // Notify UI that fix was applied
  figma.ui.postMessage({
    type: 'fix-applied',
    message: message
  });
}

async function fixContrast(node: TextNode, fix: any) {
  if (fix.suggestedTextColor) {
    const color = hexToRgb(fix.suggestedTextColor);
    if (color) {
      node.fills = [{ type: 'SOLID', color }];
    }
  }
}

function fixTouchTarget(node: SceneNode, fix: any) {
  if ('resize' in node && typeof node.resize === 'function') {
    node.resize(fix.targetWidth, fix.targetHeight);
  }
}

function fixPosition(node: SceneNode) {
  node.x = Math.round(node.x);
  node.y = Math.round(node.y);
}

// ===========================
// EXPORT FUNCTIONALITY
// ===========================

async function exportReport(format: string) {
  // Collect all current analysis data
  const reportData = {
    projectName: figma.root.name,
    pageName: figma.currentPage.name,
    timestamp: new Date().toISOString(),
    format: format
  };

  figma.ui.postMessage({
    type: 'export-report-data',
    data: reportData
  });
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

async function selectAndZoomToNode(nodeId: string) {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    
    if (!node) {
      figma.notify('⚠ Node not found');
      return;
    }

    // Select the node
    figma.currentPage.selection = [node as SceneNode];
    
    // Zoom to the node
    figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    
    figma.notify(`✓ Selected: ${node.name}`);
  } catch (error) {
    figma.notify('✗ Could not select node');
    console.error('Error selecting node:', error);
  }
}

function isInteractive(node: SceneNode): boolean {
  if ('reactions' in node && node.reactions && node.reactions.length > 0) {
    return true;
  }

  // Check name for button indicators
  const name = node.name.toLowerCase();
  return name.includes('button') || name.includes('btn') || name.includes('link');
}

function calculateContrastRatio(color1: RGB, color2: RGB): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: RGB): number {
  const rsRGB = color.r;
  const gsRGB = color.g;
  const bsRGB = color.b;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbToHex(color: RGB): string {
  const toHex = (val: number) => {
    const hex = Math.round(val * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  if (!result) return null;
  
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}

console.log('DesignQA plugin loaded');
