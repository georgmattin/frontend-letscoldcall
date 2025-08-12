import { NextRequest, NextResponse } from 'next/server'

// Configuration via environment variables (no secrets in code)
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_CHAT_ENDPOINT
const AZURE_API_KEY = process.env.AZURE_AI_SERVICES_KEY

export async function POST(request: NextRequest) {
  try {
    // Validate config
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_API_KEY) {
      return NextResponse.json(
        { error: 'Server is not configured for Azure OpenAI. Missing AZURE_OPENAI_CHAT_ENDPOINT or AZURE_AI_SERVICES_KEY.' },
        { status: 500 }
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

Return the response as a JSON object with:
{
  "name": "Generated script name (max 60 chars)",
  "description": "Brief description of the script (max 150 chars)", 
  "content": "Full script content with placeholders and formatting",
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
        max_completion_tokens: 3000,
        temperature: 0.8,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        model: 'gpt-4.1'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Azure OpenAI API error:', response.status, errorData)
      
      // Return fallback script on API error
      const fallbackScript = {
        name: "Generated Cold Outreach Script",
        description: "AI-generated script for cold outreach",
        content: `Hi [name], this is [my_name] from [my_company_name].

I hope I'm not catching you at a bad time. We specialize in helping companies like [company] ${productDescription.slice(0, 100)}...

I noticed that many businesses in your industry struggle with [specific challenge], and I believe we might be able to help you [specific benefit].

Do you have 30 seconds for me to explain why I'm calling?

[Wait for response]

Perfect! We've recently helped [similar company] achieve [specific result]. For example:
- [Specific metric/improvement]
- [Another concrete benefit] 
- [Third tangible outcome]

Based on what I know about [company], I think we could help you with [specific challenge].

Would you be interested in scheduling a brief 15-minute conversation this week to explore if this could work for your team?

[Wait for response]

Great! Let me check my calendar. How does [date/time] work for you?`,
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
        error: 'API request failed, using fallback script'
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
        content: `Hi [name], this is [my_name] from [my_company_name].

I hope I'm not catching you at a bad time. We specialize in helping companies like [company] with ${productDescription.slice(0, 100)}...

I noticed that many businesses in your industry face [specific challenge], and I believe we might be able to help you [specific benefit].

Do you have 30 seconds for me to explain why I'm calling?

[Wait for response]

Perfect! We've recently helped [similar company] achieve [specific result]. 

Based on what I know about [company], I think we could help you improve [relevant area].

Would you be interested in scheduling a brief conversation this week to explore if this could work for your team?`,
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
          content: aiContent.length > 100 ? aiContent : `Hi [name], this is [my_name] from [my_company_name].

We help companies like [company] with ${productDescription}.

${aiContent}

Would you be interested in learning more about how we could help [company]?`,
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
        content: `Hi [name], this is [my_name] from [my_company_name].

We specialize in helping companies like [company] with ${productDescription}.

I believe we might be able to help you achieve [specific goal].

Do you have a few minutes to discuss how we could potentially help [company]?

[Wait for response]

Based on what I know about your industry, I think we could provide significant value.

Would you be open to a brief conversation this week to explore the possibilities?`,
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
      content: `Hi [name], this is [my_name] from [my_company_name].

I hope I'm not catching you at a bad time.

We help companies like [company] improve their [relevant area].

Do you have 30 seconds for me to explain why I'm calling?

[Wait for response]

We've helped other companies in your industry achieve [specific results].

Would you be interested in a brief conversation to see if we could help [company] as well?`,
      category: "cold_outreach",
      objections: [],
      success: true,
      source: 'error_fallback',
      error: `Script generation failed: ${errorMessage}`
    })
  }
} 