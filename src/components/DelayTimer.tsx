"use client"

import { useState, useEffect } from "react"
import { Clock, AlertTriangle } from "lucide-react"

interface DelayTimerProps {
  totalDelay: number
  activeInterruption: any | null
  className?: string
  interruptions: any[] // Added interruptions prop
}

export const DelayTimer = ({ totalDelay, activeInterruption, className = "", interruptions }: DelayTimerProps) => {
  const [currentDelay, setCurrentDelay] = useState(totalDelay)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)
  const [liveDelay, setLiveDelay] = useState(0)

  useEffect(() => {
    setCurrentDelay(totalDelay)
  }, [totalDelay])

  useEffect(() => {
    if (activeInterruption) {
      // Start a timer to update the live delay
      const startTime = new Date(activeInterruption.start_time).getTime()
      const initialDelay = Math.floor((Date.now() - startTime) / 1000 / 60)
      setLiveDelay(initialDelay)

      const intervalId = setInterval(() => {
        const elapsedMinutes = Math.floor((Date.now() - startTime) / 1000 / 60)
        setLiveDelay(elapsedMinutes)
      }, 10000) // Update every 10 seconds

      setTimer(intervalId)
      return () => {
        if (intervalId) clearInterval(intervalId)
      }
    } else {
      // Clear the timer if there's no active interruption
      if (timer) {
        clearInterval(timer)
        setTimer(null)
      }
      setLiveDelay(0)
    }
  }, [activeInterruption])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const totalDisplayDelay = currentDelay + (activeInterruption ? liveDelay : 0)

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Clock className="w-5 h-5 text-transnet-red mr-2" />
        Total Delay Time
      </h2>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`text-4xl font-bold ${totalDisplayDelay > 0 ? "text-transnet-red" : "text-transnet-green"}`}>
            {totalDisplayDelay > 0 ? formatTime(totalDisplayDelay) : "On Time"}
          </div>

          {activeInterruption && (
            <div className="animate-pulse flex items-center space-x-2 bg-transnet-red/10 px-3 py-1 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-transnet-red" />
              <span className="text-sm text-transnet-red font-medium">Delay increasing</span>
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">Accumulated from</div>
          <div className="text-lg font-medium">
            {interruptions.length} interruption{interruptions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {totalDisplayDelay > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                totalDisplayDelay > 60 ? "bg-transnet-red" : totalDisplayDelay > 30 ? "bg-orange-500" : "bg-yellow-500"
              }`}
              style={{ width: `${Math.min(100, (totalDisplayDelay / 120) * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0m</span>
            <span>30m</span>
            <span>60m</span>
            <span>90m</span>
            <span>120m+</span>
          </div>
        </div>
      )}
    </div>
  )
}

