import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { trackAIUsage, estimateTokens, estimateCost } from '@/lib/ai-usage-tracker'

// Azure OpenAI configuration from environment variables
// Prefer server-side env vars; optionally fall back to NEXT_PUBLIC_ variant for local testing
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

    // Validate endpoint shape for Azure Chat Completions
    if (!AZURE_OPENAI_ENDPOINT.includes('/chat/completions')) {
      console.error('Invalid AZURE_OPENAI_ENDPOINT for Chat Completions:', AZURE_OPENAI_ENDPOINT)
      return NextResponse.json(
        { 
          error: 'Invalid Azure endpoint configured. Expected a Chat Completions endpoint with a deployment, e.g.: https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2025-01-01-preview' 
        },
        { status: 500 }
      )
    }

    // Validate Azure endpoint host (accept both Azure OpenAI and Cognitive Services unified endpoints)
    try {
      const u = new URL(AZURE_OPENAI_ENDPOINT)
      const host = u.hostname
      const isOpenAIHost = host.endsWith('.openai.azure.com')
      const isCognitiveHost = host.endsWith('.cognitiveservices.azure.com')
      if (!isOpenAIHost && !isCognitiveHost) {
        console.error('Invalid Azure host. Expected *.openai.azure.com or *.cognitiveservices.azure.com, got:', host)
        return NextResponse.json(
          { 
            error: 'Invalid Azure host. Use either your Azure OpenAI resource endpoint (e.g., https://<resource>.openai.azure.com/...) or the Azure Cognitive Services unified endpoint (e.g., https://<resource>.cognitiveservices.azure.com/...) with the /openai/deployments/.../chat/completions path.' 
          },
          { status: 500 }
        )
      }
    } catch (e) {
      console.error('Failed to parse AZURE_OPENAI_ENDPOINT URL:', AZURE_OPENAI_ENDPOINT, e)
      return NextResponse.json(
        { error: 'AZURE_OPENAI_ENDPOINT is not a valid URL' },
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

    const { productDescription, category = 'cold_outreach', companyName = 'Your Company', regenerate = false } = await request.json()

    if (!productDescription || !productDescription.trim()) {
      return NextResponse.json(
        { error: 'Product description is required' },
        { status: 400 }
      )
    }

    console.log('🤖 Generating script with AI...')
    const startTime = Date.now()

    const prompt = `You are an expert sales script writer. Create a professional, effective cold calling script based on the following product/service description.

PRODUCT/SERVICE DESCRIPTION:
"${productDescription}"

COMPANY NAME: ${companyName}
SCRIPT CATEGORY: ${category}

Please create a comprehensive cold calling script that includes:

1. Strong opening that grabs attention
2. Value proposition presentation
3. Discovery questions to engage prospect
4. Benefit statements with examples
5. Objection handling responses
6. Clear call-to-action/next steps
7. Professional closing

The script should:
- Use dynamic placeholders like [name], [company], [my_name], [my_company_name] for personalization
- Be conversational and natural sounding
- Include specific pauses and response handlers
- Be approximately 2-3 minutes when read at normal pace
- Focus on benefits, not just features
- Include social proof or credibility elements

IMPORTANT FORMATTING:
- Format the content as HTML for rich text display
- Use <strong>YOU:</strong> for your speaking parts in bold
- Use <em>PROSPECT:</em> for expected prospect responses in italics
- Use <p> tags for paragraphs - NO BLANK LINES between <p> tags
- Each paragraph should be on a new line without extra spacing
- Include proper HTML formatting for readability

Return the response as a JSON object with:
{
  "name": "Generated script name (max 60 chars)",
  "description": "Brief description of the script (max 150 chars)", 
  "content": "Full script content with HTML formatting, placeholders and proper structure",
  "category": "script category",
  "objections": [
    {
      "objection": "Common objection text",
      "response": "Professional response to handle objection",
      "category": "price|timing|need|authority|trust|competitor",
      "priority": "high|medium|low"
    }
  ]
}

Focus on creating a script that sounds natural, builds rapport, and drives toward a specific outcome. Include realistic objections that prospects might raise for this type of product/service.

Respond ONLY with valid JSON, no additional text.`

    console.log('Calling Azure Chat Completions at:', AZURE_OPENAI_ENDPOINT)
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
            content: 'You are an expert sales script writer and cold calling specialist. You create effective, professional scripts that convert prospects into customers. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.8,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Azure OpenAI API error:', response.status, errorData)
      
      // Return fallback script on API error
      const fallbackScript = {
        name: "Generated Cold Outreach Script",
        description: "AI-generated script for cold outreach",
        content: `<p><strong>YOU:</strong> Hi [name], this is [my_name] from [my_company_name].</p>
<p><strong>YOU:</strong> I hope I'm not catching you at a bad time. We specialize in helping companies like [company] ${productDescription.slice(0, 100)}...</p>
<p><strong>YOU:</strong> I noticed that many businesses in your industry struggle with [specific challenge], and I believe we might be able to help you [specific benefit].</p>
<p><strong>YOU:</strong> Do you have 30 seconds for me to explain why I'm calling?</p>
<p><em>PROSPECT:</em> [Wait for response]</p>
<p><strong>YOU:</strong> Perfect! We've recently helped [similar company] achieve [specific result]. For example:</p>
<ul>
<li>[Specific metric/improvement]</li>
<li>[Another concrete benefit]</li>
<li>[Third tangible outcome]</li>
</ul>
<p><strong>YOU:</strong> Based on what I know about [company], I think we could help you with [specific challenge].</p>
<p><strong>YOU:</strong> Would you be interested in scheduling a brief 15-minute conversation this week to explore if this could work for your team?</p>
<p><em>PROSPECT:</em> [Wait for response]</p>
<p><strong>YOU:</strong> Great! Let me check my calendar. How does [date/time] work for you?</p>`,
        category: category,
        objections: [
          {
            objection: "We're not interested in any sales calls right now",
            response: "I completely understand, and I appreciate your honesty. This isn't a traditional sales call - I'm reaching out because I noticed something specific about your business that I thought might be relevant. Would you be open to a brief 2-minute overview?",
            category: "timing",
            priority: "high"
          },
          {
            objection: "We're already working with someone else",
            response: "That's great to hear you're being proactive about this area. I'm not calling to replace what you have, but rather to share a different approach that's been working well for companies in your industry. Many of our best clients were initially working with competitors. Would you be interested in a brief comparison?",
            category: "competitor", 
            priority: "high"
          }
        ]
      }
      
      return NextResponse.json({
        ...fallbackScript,
        success: true,
        source: 'error_fallback',
        error: `Azure API error ${response.status}: ${String(errorData).slice(0, 300)}`
      })
    }

    const data = await response.json()
    console.log('🤖 Azure OpenAI response received')

    if (!data.choices || data.choices.length === 0) {
      console.error('❌ No choices in AI response:', data)
      
      // Return fallback script
      const fallbackScript = {
        name: "Generated Cold Outreach Script",
        description: "AI-generated script for cold outreach",
        content: `<p><strong>YOU:</strong> Hi [name], this is [my_name] from [my_company_name].</p>
<p><strong>YOU:</strong> I hope I'm not catching you at a bad time. We specialize in helping companies like [company] with ${productDescription.slice(0, 100)}...</p>
<p><strong>YOU:</strong> I noticed that many businesses in your industry face [specific challenge], and I believe we might be able to help you [specific benefit].</p>
<p><strong>YOU:</strong> Do you have 30 seconds for me to explain why I'm calling?</p>
<p><em>PROSPECT:</em> [Wait for response]</p>
<p><strong>YOU:</strong> Perfect! We've recently helped [similar company] achieve [specific result].</p>
<p><strong>YOU:</strong> Based on what I know about [company], I think we could help you improve [relevant area].</p>
<p><strong>YOU:</strong> Would you be interested in scheduling a brief conversation this week to explore if this could work for your team?</p>`,
        category: category,
        objections: []
      }
      
      return NextResponse.json({
        ...fallbackScript,
        success: true,
        source: 'fallback'
      })
    }

    const aiContent = data.choices[0].message.content

    try {
      // Try to parse the JSON response
      let scriptData
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
        const jsonString = jsonMatch ? jsonMatch[0] : aiContent
        scriptData = JSON.parse(jsonString)
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError)
        console.error('❌ Raw AI response:', aiContent)
        
        // Create fallback script from the AI response text
        const fallbackScript = {
          name: "AI Generated Script",
          description: "Script generated by AI based on your product description",
          content: aiContent.length > 100 ? aiContent : `<p><strong>YOU:</strong> Hi [name], this is [my_name] from [my_company_name].</p>
<p><strong>YOU:</strong> We help companies like [company] with ${productDescription}.</p>
<p><strong>YOU:</strong> ${aiContent}</p>
<p><strong>YOU:</strong> Would you be interested in learning more about how we could help [company]?</p>`,
          category: category,
          objections: []
        }
        
        return NextResponse.json({
          ...fallbackScript,
          success: true,
          source: 'parse_fallback'
        })
      }

      // Add unique IDs to objections if they exist
      if (scriptData.objections && Array.isArray(scriptData.objections)) {
        scriptData.objections = scriptData.objections.map((obj: any, index: number) => ({
          id: `generated_obj_${Date.now()}_${index}`,
          ...obj
        }))
      }

      console.log('✅ Script generated successfully')
      console.log('📊 Generated script name:', scriptData.name)

      // Track AI usage
      const endTime = Date.now()
      const processingDuration = (endTime - startTime) / 1000
      const tokenEstimate = estimateTokens(prompt + aiContent)
      const costEstimate = estimateCost(tokenEstimate.input, tokenEstimate.output, 'gpt-4.1')

      // Track the AI usage (fire and forget)
      trackAIUsage({
        userId: user.id,
        actionType: 'script_generation',
        processingDurationSeconds: processingDuration,
        inputTokens: tokenEstimate.input,
        outputTokens: tokenEstimate.output,
        aiModelUsed: 'gpt-4.1',
        costEstimate: costEstimate,
        status: 'completed',
        metadata: {
          productDescription: productDescription.slice(0, 100),
          category: category,
          companyName: companyName,
          regenerate: regenerate
        }
      }).catch(error => console.error('Failed to track AI usage:', error))

      return NextResponse.json({
        ...scriptData,
        success: true,
        source: 'ai'
      })

    } catch (parseError) {
      console.error('❌ Error processing AI response:', parseError)
      
      // Final fallback
      const fallbackScript = {
        name: "Generated Script",
        description: "AI-generated script based on your description",
        content: `<p><strong>YOU:</strong> Hi [name], this is [my_name] from [my_company_name].</p>
<p><strong>YOU:</strong> We specialize in helping companies like [company] with ${productDescription}.</p>
<p><strong>YOU:</strong> I believe we might be able to help you achieve [specific goal].</p>
<p><strong>YOU:</strong> Do you have a few minutes to discuss how we could potentially help [company]?</p>
<p><em>PROSPECT:</em> [Wait for response]</p>
<p><strong>YOU:</strong> Based on what I know about your industry, I think we could provide significant value.</p>
<p><strong>YOU:</strong> Would you be open to a brief conversation this week to explore the possibilities?</p>`,
        category: category,
        objections: []
      }
      
      return NextResponse.json({
        ...fallbackScript,
        success: true,
        source: 'final_fallback'
      })
    }

  } catch (error) {
    console.error('❌ Error in script generation:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('❌ Error details:', errorMessage)
    
    // Return basic fallback script even on error
    return NextResponse.json({
      name: "Basic Cold Outreach Script",
      description: "Simple cold calling script template",
      content: `<p><strong>YOU:</strong> Hi [name], this is [my_name] from [my_company_name].</p>
<p><strong>YOU:</strong> I hope I'm not catching you at a bad time.</p>
<p><strong>YOU:</strong> We help companies like [company] improve their [relevant area].</p>
<p><strong>YOU:</strong> Do you have 30 seconds for me to explain why I'm calling?</p>
<p><em>PROSPECT:</em> [Wait for response]</p>
<p><strong>YOU:</strong> We've helped other companies in your industry achieve [specific results].</p>
<p><strong>YOU:</strong> Would you be interested in a brief conversation to see if we could help [company] as well?</p>`,
      category: "cold_outreach",
      objections: [],
      success: true,
      source: 'error_fallback',
      error: `Script generation failed: ${errorMessage}`
    })
  }
} 