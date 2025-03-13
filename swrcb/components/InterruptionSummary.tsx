import { AlertTriangle, Clock, CheckCircle } from "lucide-react"

export const InterruptionSummary = ({ interruptions, totalDelay }) => {
  if (!interruptions || interruptions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-8 h-8 text-transnet-green" />
          <div>
            <h2 className="text-lg font-bold">No Interruptions</h2>
            <p className="text-sm text-gray-600">The journey is proceeding as scheduled</p>
          </div>
        </div>
      </div>
    )
  }

  const activeInterruption = interruptions.find((i) => !i.end_time)
  const totalInterruptions = interruptions.length
  const resolvedInterruptions = interruptions.filter((i) => i.end_time).length

  // Calculate average resolution time for resolved interruptions
  const avgResolutionTime =
    interruptions
      .filter((i) => i.end_time && i.time_delayed_in_seconds)
      .reduce((acc, curr) => acc + curr.time_delayed_in_seconds, 0) / (resolvedInterruptions || 1)

  const avgMinutes = Math.floor(avgResolutionTime / 60)
  const avgSeconds = Math.floor(avgResolutionTime % 60)

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <AlertTriangle className="w-5 h-5 text-transnet-red mr-2" />
        Interruption Summary
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-transnet-red">{totalInterruptions}</div>
          <div className="text-sm text-gray-600">Total Interruptions</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-transnet-green">{resolvedInterruptions}</div>
          <div className="text-sm text-gray-600">Resolved</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-transnet-gray">{totalDelay}</div>
          <div className="text-sm text-gray-600">Total Delay (minutes)</div>
        </div>
      </div>

      {resolvedInterruptions > 0 && (
        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-transnet-gray" />
            <div>
              <div className="text-sm text-gray-600">Average Resolution Time</div>
              <div className="font-medium">
                {avgMinutes}m {avgSeconds}s
              </div>
            </div>
          </div>
        </div>
      )}

      {activeInterruption && (
        <div className="mt-4 bg-transnet-red/10 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-transnet-red" />
            <div>
              <div className="text-sm font-medium text-transnet-red">Active Interruption</div>
              <div className="text-sm">{activeInterruption.interruption_reason}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

