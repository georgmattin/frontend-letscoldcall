"use client"

import { X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export interface ScriptAIModalProps {
  open: boolean
  onClose: () => void
  onGenerate: () => void
  generating: boolean
  error?: string
  productDescription: string
  setProductDescription: (val: string) => void
}

export default function ScriptAIModal({
  open,
  onClose,
  onGenerate,
  generating,
  error,
  productDescription,
  setProductDescription,
}: ScriptAIModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 bg-white rounded-[10px] max-w-2xl w-full max-h-[90vh] overflow-y-auto border-[0.5px] border-[#003333]/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
        <div className="p-[30px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[23.04px] font-semibold text-[#003333]">Generate Script with AI</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[14px] text-[#003333] mb-2">
                Describe your product or service
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-[0.5px] border-[#003333]/10 rounded-[16px] placeholder:text-[#C1C1C1] text-[#003333] focus:outline-none focus:ring-0 focus:border-[#0033331a]"
                disabled={generating}
                placeholder="Be specific about features, benefits, and who your ideal customers are..."
              />
              <p className="text-[12px] text-[#003333] mt-1">
                Be specific about features, benefits, and who your ideal customers are. The more detail you provide, the better the script will be.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t-[0.5px] border-[#003333]/10">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="w-full h-[41px] rounded-[16px] border-[0.5px] border-[#003333]/10 text-[#003333] hover:bg-[#F4F6F6] text-[16px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating || !productDescription.trim()}
              className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors duration-200"
            >
              {generating ? "Generating..." : "Generate Script"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
