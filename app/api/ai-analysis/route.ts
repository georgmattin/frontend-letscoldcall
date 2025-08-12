import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { trackAIUsage, estimateTokens, estimateCost } from '@/lib/ai-usage-tracker'

// Read Azure config from environment variables
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
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

    const { transcription, contactName, contactCompany, contactPosition, requestType } = await request.json()

    if (!transcription || transcription.trim() === '') {
      return NextResponse.json(
        { error: 'No transcription provided' },
        { status: 400 }
      )
    }

    console.log(`🤖 Analyzing call transcription with AI... (type: ${requestType || 'analysis'})`)
    const startTime = Date.now()

    let prompt = ''

    if (requestType === 'call_summary') {
      // Generate call summary based on transcription
      prompt = `You are an expert sales assistant analyzing a cold call transcription. Please create a professional call summary based on the actual conversation.

CALL TRANSCRIPTION:
"${transcription}"

CONTACT INFO:
- Name: ${contactName || 'Unknown'}
- Company: ${contactCompany || 'Unknown'}
- Position: ${contactPosition || 'Unknown'}

Please analyze the actual conversation and provide a FACTUAL summary in the following JSON format:

{
  "summary": "Brief factual summary of what was actually discussed in the call",
  "pain_points": ["Specific challenges or concerns mentioned by the contact"],
  "solutions": ["Any solutions or services that were actually presented or discussed"],
  "next_steps": ["Specific follow-up actions mentioned or agreed upon"],
  "sentiment": "Contact's attitude and engagement level based on their responses",
  "outcome": "Actual outcome of the call based on the conversation",
  "follow_up_actions": ["Specific actions the caller should take based on the conversation"],
  "timeline": "Any timeline or urgency mentioned during the call"
}

IMPORTANT GUIDELINES:
- Base the summary ONLY on what was actually said in the transcription
- Do not invent or assume information that wasn't discussed
- If certain elements (like pain points, solutions) weren't discussed, return empty arrays
- Be factual and specific to this conversation
- Focus on what the contact actually said and how they responded
- Include direct quotes or key phrases when relevant

Respond ONLY with valid JSON, no additional text.`
    } else {
      // Original analysis prompt
      prompt = `You are an expert sales coach analyzing a cold call transcription. Please analyze this call and provide specific, actionable feedback.

CALL TRANSCRIPTION:
"${transcription}"

CONTACT INFO:
- Name: ${contactName || 'Unknown'}
- Company: ${contactCompany || 'Unknown'}

Please provide your analysis in the following JSON format:

{
  "suggestions": [
    {
      "id": 1,
      "category": "Opening",
      "title": "Improve your opening approach",
      "description": "Specific suggestion about what to improve in the opening",
      "whatToSay": "Example of better phrasing or approach",
      "priority": "high"
    },
    {
      "id": 2,
      "category": "Objection Handling",
      "title": "Better response to specific objection",
      "description": "How to handle the objection that came up",
      "whatToSay": "Example of better objection response",
      "priority": "high"
    }
  ],
  "objection_suggestions": [
    {
      "id": 1,
      "objection": "Actual objection from the call",
      "response": "Improved way to handle this specific objection",
      "reason": "Why this approach would be more effective"
    }
  ],
  "strengths": [
    "What went well in this call"
  ],
  "overall_score": 7.5,
  "summary": "Brief overall assessment of the call performance"
}

ANALYSIS GUIDELINES:
- Focus on actionable improvements
- Provide specific examples of what to say
- Categories can be: Opening, Questioning, Handling Objections, Closing, Rapport Building, Value Proposition
- Priority levels: high, medium, low
- Score from 1-10
- Be constructive and specific
- Limit to 3-5 most important suggestions
- IMPORTANT: Analyze any objections that were raised during the call
- For objection_suggestions, identify specific objections from the transcript and provide better responses
- If no objections were raised, you can include common objections for this type of call
- Focus especially on objection handling since this is critical for cold calling success

Respond ONLY with valid JSON, no additional text.`
    }

    const response = await fetch(AZURE_OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 1500,
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
      return NextResponse.json(
        { error: 'Failed to analyze call with AI' },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('🤖 Azure OpenAI response received')

    if (!data.choices || data.choices.length === 0) {
      console.error('❌ No choices in AI response:', data)
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      )
    }

    const aiContent = data.choices[0].message.content

    try {
      // Parse the JSON response from AI
      const analysisResult = JSON.parse(aiContent)
      
      console.log(`✅ AI ${requestType || 'analysis'} completed successfully`)
      if (requestType === 'call_summary') {
        console.log('📊 Call summary generated')
      } else {
        console.log('📊 Analysis summary:', {
          suggestionsCount: analysisResult.suggestions?.length || 0,
          score: analysisResult.overall_score,
          strengthsCount: analysisResult.strengths?.length || 0
        })
      }

      // Track AI usage
      const endTime = Date.now()
      const processingDuration = (endTime - startTime) / 1000
      const tokenEstimate = estimateTokens(prompt + aiContent)
      const costEstimate = estimateCost(tokenEstimate.input, tokenEstimate.output, 'gpt-4.1')

      // Track the AI usage (fire and forget)
      const actionType = requestType === 'call_summary' ? 'call_summary_generation' : 'ai_suggestions_generation'
      trackAIUsage({
        userId: user.id,
        actionType: actionType,
        processingDurationSeconds: processingDuration,
        inputTokens: tokenEstimate.input,
        outputTokens: tokenEstimate.output,
        aiModelUsed: 'gpt-4.1',
        costEstimate: costEstimate,
        status: 'completed',
        metadata: {
          transcription: transcription.slice(0, 100),
          contactName: contactName,
          contactCompany: contactCompany,
          requestType: requestType || 'analysis',
          suggestionsCount: analysisResult.suggestions?.length || 0,
          score: analysisResult.overall_score || null
        }
      }).catch(error => console.error('Failed to track AI usage:', error))

      return NextResponse.json(analysisResult)
    } catch (parseError) {
      console.error('❌ Error parsing AI response JSON:', parseError)
      console.error('❌ Raw AI response:', aiContent)
      
      // Fallback response if JSON parsing fails
      if (requestType === 'call_summary') {
        return NextResponse.json({
          summary: "AI analysis failed - manual review recommended",
          pain_points: [],
          solutions: [],
          next_steps: [],
          sentiment: "Unable to analyze",
          outcome: "Call completed",
          follow_up_actions: [],
          timeline: "Not specified"
        })
      } else {
        return NextResponse.json({
          suggestions: [
            {
              id: 1,
              category: "General",
              title: "AI Analysis Error",
              description: "There was an error processing the AI analysis. Please try again.",
              whatToSay: "Please review the transcription manually for now.",
              priority: "low"
            }
          ],
          strengths: ["Call was completed successfully"],
          overall_score: 5.0,
          summary: "Analysis could not be completed due to technical error."
        })
      }
    }

  } catch (error) {
    console.error('❌ Error in AI analysis:', error)
    return NextResponse.json(
      { error: 'Internal server error during AI analysis' },
      { status: 500 }
    )
  }
} 