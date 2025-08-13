import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { trackAIUsage, estimateTokens, estimateCost } from '@/lib/ai-usage-tracker'

// Azure OpenAI configuration from environment variables
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
    // Require server secret header in addition to user auth
    const requiredSecret = process.env.API_SECRET
    const providedSecret = request.headers.get('x-api-secret') || ''
    if (requiredSecret && providedSecret !== requiredSecret) {
      return NextResponse.json(
        { error: 'Forbidden: invalid API secret' },
        { status: 403 }
      )
    }

    // Validate required configuration
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_API_KEY) {
      console.error('Azure OpenAI environment variables are missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env.local')
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Azure OpenAI env variables' },
        { status: 500 }
      )
    }

    // Get user for tracking
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { scriptContent, scriptCategory } = await request.json()

    if (!scriptContent) {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      )
    }

    console.log('🤖 Generating objections with AI...')
    const startTime = Date.now()

    const prompt = `Based on the following ${scriptCategory || 'cold calling'} script, generate exactly 5 common objections that prospects might raise and provide effective responses to each objection.

Script:
"${scriptContent}"

Please analyze this script and generate exactly 5 realistic objections that prospects would likely raise, along with professional, persuasive responses. Consider the context, industry, and tone of the script.

IMPORTANT: You must generate exactly 5 objections, no more, no less.

Return the response as a JSON array with objects containing:
- objection: The prospect's likely objection (string)
- response: A professional response to handle the objection (string)  
- category: Category of objection like "price", "timing", "need", "authority", "trust", "competitor" (string)
- priority: Priority level "high", "medium", or "low" based on how common this objection would be (string)

Focus on objections that are:
1. Realistic and commonly encountered
2. Relevant to the script content and approach
3. Varied in type (price, timing, need, decision-making authority, etc.)

Example format:
[
  {
    "objection": "We're not interested in any sales calls right now",
    "response": "I completely understand, and I appreciate your honesty. This isn't a traditional sales call - I'm actually reaching out because I noticed [specific observation about their company] and thought you might be interested in hearing how we helped [similar company] achieve [specific result]. Would you be open to a brief 2-minute overview?",
    "category": "timing",
    "priority": "high"
  }
]

Respond ONLY with valid JSON array, no additional text.`

    const response = await fetch(AZURE_OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales trainer and objection handling specialist. You understand prospect psychology and can predict common objections and provide effective responses. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 2000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        model: 'gpt-4.1'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Azure OpenAI API error:', response.status, errorData)
      
      // Return fallback objections on API error
      const fallbackObjections = [
        {
          id: `fallback_${Date.now()}_1`,
          objection: "We're not interested in any sales calls right now",
          response: "I completely understand, and I appreciate your honesty. This isn't a traditional sales call - I'm reaching out because I noticed something specific about your business that I thought might be relevant. Would you be open to a brief 2-minute overview?",
          category: "timing",
          priority: "high"
        },
        {
          id: `fallback_${Date.now()}_2`,
          objection: "We're already working with someone else",
          response: "That's great to hear you're being proactive about this area. I'm not calling to replace what you have, but rather to share a different approach that's been working well for companies in your industry. Many of our best clients were initially working with competitors. Would you be interested in a brief comparison?",
          category: "competitor",
          priority: "high"
        },
        {
          id: `fallback_${Date.now()}_3`,
          objection: "We don't have budget for this right now",
          response: "I understand budget considerations are important. That's exactly why I wanted to reach out - we've helped companies in similar situations actually reduce their costs while improving results. Would it be worth a brief conversation to see if there might be a way to make this budget-neutral or even cost-positive for you?",
          category: "price",
          priority: "high"
        },
        {
          id: `fallback_${Date.now()}_4`,
          objection: "I'm too busy to talk right now",
          response: "I completely understand - everyone's time is valuable. That's actually why I'm calling. The solution I'm sharing typically saves our clients 2-3 hours per week. Would it make sense to invest 5 minutes now to potentially save hours later?",
          category: "timing",
          priority: "medium"
        },
        {
          id: `fallback_${Date.now()}_5`,
          objection: "I need to think about it",
          response: "Absolutely, that's a smart approach. What I've found helpful is to understand what specific aspects you'd like to consider. Is it the implementation timeline, the investment, or how it would fit with your current setup? That way I can provide you with the most relevant information.",
          category: "need",
          priority: "medium"
        }
      ]
      
      return NextResponse.json({
        objections: fallbackObjections,
        success: true,
        source: 'error_fallback',
        error: 'API request failed'
      })
    }

    const data = await response.json()
    console.log('🤖 Azure OpenAI response received')

    if (!data.choices || data.choices.length === 0) {
      console.error('❌ No choices in AI response:', data)
      
      // Return fallback objections
      const fallbackObjections = [
        {
          id: `fallback_${Date.now()}_1`,
          objection: "We're not interested in any sales calls right now",
          response: "I completely understand, and I appreciate your honesty. This isn't a traditional sales call - I'm reaching out because I noticed something specific about your business that I thought might be relevant. Would you be open to a brief 2-minute overview?",
          category: "timing",
          priority: "high"
        },
        {
          id: `fallback_${Date.now()}_2`,
          objection: "We're already working with someone else",
          response: "That's great to hear you're being proactive about this area. I'm not calling to replace what you have, but rather to share a different approach that's been working well for companies in your industry. Many of our best clients were initially working with competitors. Would you be interested in a brief comparison?",
          category: "competitor",
          priority: "high"
        },
        {
          id: `fallback_${Date.now()}_3`,
          objection: "We don't have budget for this right now",
          response: "I understand budget considerations are important. That's exactly why I wanted to reach out - we've helped companies in similar situations actually reduce their costs while improving results. Would it be worth a brief conversation to see if there might be a way to make this budget-neutral or even cost-positive for you?",
          category: "price",
          priority: "high"
        }
      ]
      
      return NextResponse.json({
        objections: fallbackObjections,
        success: true,
        source: 'fallback'
      })
    }

    const aiContent = data.choices[0].message.content

    try {
      // Try to parse the JSON response
      let objections
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/)
        const jsonString = jsonMatch ? jsonMatch[0] : aiContent
        objections = JSON.parse(jsonString)
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError)
        console.error('❌ Raw AI response:', aiContent)
        
        // Fallback: return a default set of objections
        objections = [
          {
            objection: "We're not interested in any sales calls right now",
            response: "I completely understand. This isn't a traditional sales call - I'm reaching out because I noticed something specific about your business that I thought might be relevant. Would you be open to a brief 2-minute overview?",
            category: "timing",
            priority: "high"
          },
          {
            objection: "We're already working with someone else",
            response: "That's great to hear you're being proactive about this area. I'm not calling to replace what you have, but rather to share a different approach that's been working well for companies in your industry. Many of our best clients were initially working with competitors. Would you be interested in a brief comparison?",
            category: "competitor",
            priority: "high"
          },
          {
            objection: "We don't have budget for this right now",
            response: "I understand budget considerations are important. That's exactly why I wanted to reach out - we've helped companies in similar situations actually reduce their costs while improving results. Would it be worth a brief conversation to see if there might be a way to make this budget-neutral or even cost-positive for you?",
            category: "price",
            priority: "high"
          }
        ]
      }

      // Add unique IDs to each objection
      const objectionsWithIds = objections.map((obj: any, index: number) => ({
        id: `obj_${Date.now()}_${index}`,
        ...obj
      }))

      console.log('✅ Objections generated successfully')
      console.log('📊 Generated objections count:', objectionsWithIds.length)

      // Track AI usage
      const endTime = Date.now()
      const processingDuration = (endTime - startTime) / 1000
      const tokenEstimate = estimateTokens(prompt + aiContent)
      const costEstimate = estimateCost(tokenEstimate.input, tokenEstimate.output, 'gpt-4.1')

      // Track the AI usage (fire and forget)
      trackAIUsage({
        userId: user.id,
        actionType: 'objection_generation',
        processingDurationSeconds: processingDuration,
        inputTokens: tokenEstimate.input,
        outputTokens: tokenEstimate.output,
        aiModelUsed: 'gpt-4.1',
        costEstimate: costEstimate,
        status: 'completed',
        metadata: {
          scriptContent: scriptContent.slice(0, 100),
          scriptCategory: scriptCategory,
          objectionsCount: objectionsWithIds.length
        }
      }).catch(error => console.error('Failed to track AI usage:', error))

      return NextResponse.json({
        objections: objectionsWithIds,
        success: true,
        source: 'ai'
      })

    } catch (parseError) {
      console.error('❌ Error parsing AI response JSON:', parseError)
      console.error('❌ Raw AI response:', aiContent)
      
      // Fallback response if JSON parsing fails
      const fallbackObjections = [
        {
          id: `parse_fallback_${Date.now()}_1`,
          objection: "We're not interested in any sales calls right now",
          response: "I completely understand, and I appreciate your honesty. This isn't a traditional sales call - I'm reaching out because I noticed something specific about your business that I thought might be relevant. Would you be open to a brief 2-minute overview?",
          category: "timing",
          priority: "high"
        },
        {
          id: `parse_fallback_${Date.now()}_2`,
          objection: "We're already working with someone else",
          response: "That's great to hear you're being proactive about this area. I'm not calling to replace what you have, but rather to share a different approach that's been working well for companies in your industry. Many of our best clients were initially working with competitors. Would you be interested in a brief comparison?",
          category: "competitor",
          priority: "high"
        },
        {
          id: `parse_fallback_${Date.now()}_3`,
          objection: "We don't have budget for this right now",
          response: "I understand budget considerations are important. That's exactly why I wanted to reach out - we've helped companies in similar situations actually reduce their costs while improving results. Would it be worth a brief conversation to see if there might be a way to make this budget-neutral or even cost-positive for you?",
          category: "price",
          priority: "high"
        },
        {
          id: `parse_fallback_${Date.now()}_4`,
          objection: "I'm too busy to talk right now",
          response: "I completely understand - everyone's time is valuable. That's actually why I'm calling. The solution I'm sharing typically saves our clients 2-3 hours per week. Would it make sense to invest 5 minutes now to potentially save hours later?",
          category: "timing",
          priority: "medium"
        },
        {
          id: `parse_fallback_${Date.now()}_5`,
          objection: "I need to think about it",
          response: "Absolutely, that's a smart approach. What I've found helpful is to understand what specific aspects you'd like to consider. Is it the implementation timeline, the investment, or how it would fit with your current setup? That way I can provide you with the most relevant information.",
          category: "need",
          priority: "medium"
        }
      ]
      
      return NextResponse.json({
        objections: fallbackObjections,
        success: true,
        source: 'parse_fallback'
      })
    }

  } catch (error) {
    console.error('❌ Error in objections generation:', error)
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('❌ Error details:', errorMessage)
    
    // Return fallback objections even on error
    const fallbackObjections = [
      {
        id: `error_fallback_${Date.now()}_1`,
        objection: "We're not interested in any sales calls right now",
        response: "I completely understand, and I appreciate your honesty. This isn't a traditional sales call - I'm reaching out because I noticed something specific about your business that I thought might be relevant. Would you be open to a brief 2-minute overview?",
        category: "timing",
        priority: "high"
      },
      {
        id: `error_fallback_${Date.now()}_2`,
        objection: "We're already working with someone else",
        response: "That's great to hear you're being proactive about this area. I'm not calling to replace what you have, but rather to share a different approach that's been working well for companies in your industry. Many of our best clients were initially working with competitors. Would you be interested in a brief comparison?",
        category: "competitor",
        priority: "high"
      },
      {
        id: `error_fallback_${Date.now()}_3`,
        objection: "We don't have budget for this right now",
        response: "I understand budget considerations are important. That's exactly why I wanted to reach out - we've helped companies in similar situations actually reduce their costs while improving results. Would it be worth a brief conversation to see if there might be a way to make this budget-neutral or even cost-positive for you?",
        category: "price",
        priority: "high"
      },
      {
        id: `error_fallback_${Date.now()}_4`,
        objection: "I'm too busy to talk right now",
        response: "I completely understand - everyone's time is valuable. That's actually why I'm calling. The solution I'm sharing typically saves our clients 2-3 hours per week. Would it make sense to invest 5 minutes now to potentially save hours later?",
        category: "timing",
        priority: "medium"
      },
      {
        id: `error_fallback_${Date.now()}_5`,
        objection: "I need to think about it",
        response: "Absolutely, that's a smart approach. What I've found helpful is to understand what specific aspects you'd like to consider. Is it the implementation timeline, the investment, or how it would fit with your current setup? That way I can provide you with the most relevant information.",
        category: "need",
        priority: "medium"
      }
    ]
    
    return NextResponse.json({
      objections: fallbackObjections,
      success: true,
      source: 'error_fallback',
      error: `AI generation failed: ${errorMessage}`
    })
  }
} 