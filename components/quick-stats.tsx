import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function QuickStats() {
  return (
    <Card className="bg-white shadow-none border-none">
      <CardContent className="p-3 space-y-3">
        {/* Call Minutes */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Kõneminutid</span>
            <span className="font-medium">245/300</span>
          </div>
          <Progress value={82} className="h-1.5" />
        </div>

        {/* Today's Calls */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Tänased kõned</span>
            <span className="font-medium">8/15</span>
          </div>
          <Progress value={53} className="h-1.5" />
        </div>

        {/* Success Rate */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">7 päeva edukus</span>
            <span className="font-medium text-emerald-600">64%</span>
          </div>
        </div>

        {/* AI Credits */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">AI krediidid</span>
            <span className="font-medium">850</span>
          </div>
          <Progress value={85} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  )
} 