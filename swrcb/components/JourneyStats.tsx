"use client"

import { Clock, MapPin, AlertTriangle, CheckCircle, Calendar } from "lucide-react"

interface JourneyStatsProps {
  currentStation: any
  totalDelay: number
  interruptions: any[]
  startTime: string
  estimatedEndTime: string
  totalDistance: number
  completedDistance: number
}

export const JourneyStats = ({
  currentStation,
  totalDelay,
  interruptions,
  startTime,
  estimatedEndTime,
  totalDistance,
  completedDistance,
}: JourneyStatsProps) => {
  const activeInterruption = interruptions.find((i) => !i.end_time)
  const completionPercentage = Math.round((completedDistance / totalDistance) * 100)

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-bold mb-4">Journey Statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 flex items-start space-x-3">
          <div className="bg-transnet-green/10 p-2 rounded-md mt-1">
            <MapPin className="w-5 h-5 text-transnet-green" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Location</p>
            <p className="font-medium">{currentStation ? currentStation.name : "Not started"}</p>
            {currentStation && <p className="text-xs text-gray-500">Station Code: {currentStation.code}</p>}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 flex items-start space-x-3">
          <div className="bg-transnet-red/10 p-2 rounded-md mt-1">
            <Clock className="w-5 h-5 text-transnet-red" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Journey Time</p>
            <p className="font-medium">
              {startTime} - {estimatedEndTime}
            </p>
            <p className="text-xs text-gray-500">
              {totalDelay > 0 ? `Delayed by ${totalDelay} minutes` : "On schedule"}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 flex items-start space-x-3">
          <div className="bg-transnet-gray/10 p-2 rounded-md mt-1">
            <Calendar className="w-5 h-5 text-transnet-gray" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Journey Progress</p>
            <div className="flex items-center space-x-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-transnet-green h-2.5 rounded-full"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{completionPercentage}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {completedDistance.toFixed(0)} of {totalDistance.toFixed(0)} km completed
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 flex items-start space-x-3">
          <div className={`${activeInterruption ? "bg-transnet-red/10" : "bg-transnet-green/10"} p-2 rounded-md mt-1`}>
            {activeInterruption ? (
              <AlertTriangle className="w-5 h-5 text-transnet-red" />
            ) : (
              <CheckCircle className="w-5 h-5 text-transnet-green" />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">
              {activeInterruption ? (
                <span className="text-transnet-red">Interrupted</span>
              ) : (
                <span className="text-transnet-green">In Progress</span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {interruptions.length} interruption{interruptions.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

