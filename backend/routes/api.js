var express = require('express');
var router = express.Router();
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

// Initialize Gemini client
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/**
 * POST /api/smart-rename
 * Generate AI-powered layer name suggestions
 */
router.post('/smart-rename', async (req, res) => {
  try {
    const { nodeData } = req.body;

    if (!nodeData) {
      return res.status(400).json({ error: 'Node data is required' });
    }

    // Generate suggestion using AI
    const suggestion = await generateSmartName(nodeData);

    res.json({
      success: true,
      suggestion: suggestion,
      nodeData: nodeData
    });

  } catch (error) {
    console.error('Smart rename error:', error);
    
    // Fallback to rule-based naming if AI fails
    const fallbackName = generateFallbackName(req.body.nodeData);
    
    res.json({
      success: true,
      suggestion: fallbackName,
      fallback: true
    });
  }
});

/**
 * POST /api/analyze-contrast
 * Analyze color contrast and suggest improvements
 */
router.post('/analyze-contrast', async (req, res) => {
  try {
    const { textColor, bgColor, fontSize } = req.body;

    const suggestions = await suggestContrastFix(textColor, bgColor, fontSize);

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Contrast analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze contrast' });
  }
});

/**
 * POST /api/analyze-design
 * Comprehensive design analysis with AI insights
 */
router.post('/analyze-design', async (req, res) => {
  try {
    const { designData } = req.body;

    const insights = await analyzeDesignWithAI(designData);

    res.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Design analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze design' });
  }
});

/**
 * Generate smart layer name using Groq AI with Gemini fallback
 */
async function generateSmartName(nodeData) {
  const prompt = `You are a Figma design expert. Generate a semantic, hierarchical layer name for this element.

Node Information:
- Type: ${nodeData.type}
- Current Name: ${nodeData.name}
- Dimensions: ${nodeData.width}x${nodeData.height}px
${nodeData.characters ? `- Text Content: "${nodeData.characters}"` : ''}
${nodeData.children?.length > 0 ? `- Children: ${nodeData.children.length} elements` : ''}
${nodeData.hasInteractions ? '- Has interactions/reactions' : ''}
${nodeData.hasFill ? '- Has fill/background' : ''}
${nodeData.hasEffects ? '- Has effects (shadow, blur, etc.)' : ''}

Children details:
${nodeData.children?.slice(0, 3).map(c => `  - ${c.type}${c.characters ? `: "${c.characters}"` : ''}`).join('\n') || 'None'}

Follow Figma naming best practices:
- Use hierarchical naming: Category/Subcategory/Name
- Be semantic and descriptive
- Use PascalCase for each segment
- Common categories: Button, Card, Input, Icon, Text, Container, Header, Footer, Nav, Section
- For buttons with text, use: Button/[Style]/[Action] (e.g., "Button/Primary/SignUp")
- For text, use: Text/[Type]/[Content] (e.g., "Text/Heading/Welcome")
- For containers, use: Container/[Purpose] or Card/[Type]

Respond with ONLY the suggested name, nothing else.`;

  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('Trying Groq API...');
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a Figma design expert that generates semantic layer names. Respond with only the suggested name.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 50
      });

      const suggestion = chatCompletion.choices[0]?.message?.content?.trim();
      
      if (suggestion && suggestion.length > 0 && suggestion.length < 100) {
        console.log('✓ Groq API succeeded');
        return suggestion;
      }
    } catch (error) {
      console.error('Groq API failed:', error.message);
      // Continue to Gemini fallback
    }
  }

  // Try Gemini as fallback
  if (genAI && process.env.GEMINI_API_KEY) {
    try {
      console.log('Trying Gemini API (fallback)...');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const suggestion = response.text().trim();
      
      if (suggestion && suggestion.length > 0 && suggestion.length < 100) {
        console.log('✓ Gemini API succeeded');
        return suggestion;
      }
    } catch (error) {
      console.error('Gemini API failed:', error.message);
      // Continue to rule-based fallback
    }
  }

  // Final fallback: rule-based naming
  console.log('Using rule-based fallback naming');
  return generateFallbackName(nodeData);
}

/**
 * Fallback rule-based naming when AI is unavailable
 */
function generateFallbackName(nodeData) {
  const { type, children, characters, hasInteractions, hasFill } = nodeData;

  // Text content detection
  if (characters) {
    const text = characters.slice(0, 20).trim();
    const words = text.split(' ');
    const label = words.slice(0, 2).join('');
    return `Text/${label}`;
  }

  // Check children for text
  const textChild = children?.find(c => c.characters);
  if (textChild) {
    const text = textChild.characters.slice(0, 20).trim();
    const words = text.split(' ');
    const label = words.slice(0, 2).join('');
    
    // Button detection
    if (hasInteractions || hasFill || type === 'FRAME') {
      return `Button/${label}`;
    }
    
    return `Label/${label}`;
  }

  // Component naming
  if (type === 'COMPONENT') {
    return 'Component/Main';
  }
  
  if (type === 'INSTANCE') {
    return 'Component/Instance';
  }

  // Container naming
  if (type === 'FRAME') {
    if (children && children.length > 5) {
      return `Container/Group${children.length}`;
    }
    if (children && children.length > 0) {
      return `Container/Wrapper`;
    }
    return 'Container/Empty';
  }

  // Icon/Shape naming
  if (type === 'VECTOR' || type === 'BOOLEAN_OPERATION') {
    return 'Icon/Custom';
  }

  if (type === 'RECTANGLE') {
    return hasFill ? 'Shape/Rectangle' : 'Divider/Line';
  }

  if (type === 'ELLIPSE') {
    return 'Shape/Circle';
  }

  // Default
  return `${type}/Unnamed`;
}

/**
 * Suggest contrast improvements using AI
 */
async function suggestContrastFix(textColor, bgColor, fontSize) {
  // Simplified contrast suggestion logic
  // In production, use AI to suggest better color combinations
  
  const suggestions = {
    textColor: textColor,
    bgColor: bgColor,
    alternatives: [
      { textColor: '#000000', bgColor: '#FFFFFF', ratio: 21 },
      { textColor: '#FFFFFF', bgColor: '#000000', ratio: 21 }
    ]
  };

  return suggestions;
}

/**
 * Analyze design comprehensively with AI
 */
async function analyzeDesignWithAI(designData) {
  // This would use AI to provide contextual insights
  // For now, return basic analysis
  
  return {
    insights: [
      'Consider increasing contrast for better readability',
      'Some interactive elements are below minimum touch target size',
      'Typography hierarchy could be more consistent'
    ],
    score: 85,
    recommendations: []
  };
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiProviders: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    },
    groqConfigured: !!process.env.GROQ_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

module.exports = router;
