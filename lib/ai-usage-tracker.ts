import { createClient } from '@/utils/supabase/server';

export interface AIUsageData {
  userId: string;
  actionType: 'script_generation' | 'objection_generation' | 'call_summary_generation' | 'ai_suggestions_generation' | 'transcription_processing' | 'transcription_access';
  relatedRecordId?: string;
  relatedRecordType?: 'call_history' | 'ai_generated_scripts' | 'recordings' | 'scripts';
  processingDurationSeconds?: number;
  inputTokens?: number;
  outputTokens?: number;
  aiModelUsed?: string;
  costEstimate?: number;
  status?: 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export async function trackAIUsage(data: AIUsageData): Promise<void> {
  try {
    console.log('📊 Tracking AI usage:', data.actionType);
    
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('user_ai_usage_tracking')
      .insert({
        user_id: data.userId,
        action_type: data.actionType,
        related_record_id: data.relatedRecordId,
        related_record_type: data.relatedRecordType,
        processing_duration_seconds: data.processingDurationSeconds,
        input_tokens: data.inputTokens,
        output_tokens: data.outputTokens,
        ai_model_used: data.aiModelUsed,
        cost_estimate: data.costEstimate,
        status: data.status || 'completed',
        completed_at: new Date().toISOString(),
        metadata: data.metadata || {}
      });

    if (error) {
      console.error('❌ Failed to track AI usage:', error);
    } else {
      console.log('✅ AI usage tracked successfully');
    }
  } catch (error) {
    console.error('❌ Error tracking AI usage:', error);
  }
}

export function estimateTokens(text: string): { input: number; output: number } {
  // Simple token estimation: roughly 4 characters per token for Estonian/English
  const inputTokens = Math.ceil(text.length / 4);
  
  // For responses, estimate based on typical response lengths
  let outputTokens = 0;
  if (text.length < 500) {
    outputTokens = 150; // Short responses
  } else if (text.length < 2000) {
    outputTokens = 500; // Medium responses  
  } else {
    outputTokens = 1000; // Long responses
  }
  
  return { input: inputTokens, output: outputTokens };
}

export function estimateCost(inputTokens: number, outputTokens: number, model: string = 'gpt-4.1'): number {
  // Azure OpenAI GPT-4.1 pricing (in USD)
  const inputCostPer1kTokens = 0.01;  // $0.01 per 1K tokens for input
  const outputCostPer1kTokens = 0.03;  // $0.03 per 1K tokens for output
  
  const inputCost = (inputTokens / 1000) * inputCostPer1kTokens;
  const outputCost = (outputTokens / 1000) * outputCostPer1kTokens;
  
  return inputCost + outputCost;
} 