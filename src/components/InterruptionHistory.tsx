"use client"

import { useState } from "react"
import { Clock, AlertTriangle, MapPin, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"

export const InterruptionHistory = ({ journey }) => {
  const [expandedInterruption, setExpandedInterruption] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const { interruptions } = journey

  console.log("HISTORY", interruptions)
  // Update the isLoading check to properly show interruptions even when they're resolved
  if (isLoading && interruptions.length <= 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    )
  }

  // Remove this condition that was hiding interruptions when they're all resolved
  // if (!interruptions || interruptions.length === 0) {
  //   return (
  //     <div className="bg-white rounded-xl shadow-md p-6">
  //       <div className="flex items-center justify-center py-6">
  //         <div className="text-center">
  //           <AlertTriangle className="w-12 h-12 text-transnet-green mx-auto mb-3" />
  //           <h3 className="text-lg font-medium text-gray-900">No interruptions recorded</h3>
  //           <p className="mt-1 text-sm text-gray-500">
  //             The train journey is proceeding without any recorded interruptions.
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  const toggleInterruption = (id) => {
    if (expandedInterruption === id) {
      setExpandedInterruption(null)
    } else {
      setExpandedInterruption(id)
    }
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "high":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-transnet-red text-white">
            High
          </span>
        )
      case "medium":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white">
            Medium
          </span>
        )
      case "low":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
            Low
          </span>
        )
    }
  }

  const calculateDuration = (interruption) => {
    if (!interruption.end_time) {
      return "Ongoing"
    }

    const seconds = interruption.time_delayed_in_seconds || 0
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <AlertTriangle className="w-5 h-5 text-transnet-red mr-2" />
        Interruption History
      </h2>

      <div className="space-y-4">
        {interruptions.map((interruption) => (
          <div key={interruption.id} className="border rounded-lg overflow-hidden">
            <div
              className={`p-4 cursor-pointer flex justify-between items-center ${
                !interruption.end_time ? "bg-transnet-red/10" : "bg-gray-50"
              }`}
              onClick={() => toggleInterruption(interruption.id)}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">
                    {interruption.interruption_reason?.substring(0, 50)}
                    {interruption.interruption_reason?.length > 50 ? "..." : ""}
                  </h3>
                  {interruption.severity && getSeverityBadge(interruption.severity)}
                  <span>
                    {!interruption.end_time ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-transnet-red text-white">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Resolved
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(new Date(interruption.start_time), "MMM d, HH:mm:ss")}
                  {interruption.end_time && <span className="ml-2">• Duration: {calculateDuration(interruption)}</span>}
                </div>
              </div>
              <div>
                {expandedInterruption === interruption.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>

            {expandedInterruption === interruption.id && (
              <div className="p-4 border-t bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Start Time</h4>
                    <p className="text-sm">{format(new Date(interruption.start_time), "MMM d, yyyy HH:mm:ss")}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">End Time</h4>
                    <p className="text-sm">
                      {interruption.end_time
                        ? format(new Date(interruption.end_time), "MMM d, yyyy HH:mm:ss")
                        : "Ongoing"}
                    </p>
                  </div>

                  {interruption.location_description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
                      <p className="text-sm flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {interruption.location_description}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Delay</h4>
                    <p className="text-sm">
                      {interruption.time_delayed_in_seconds
                        ? `${Math.floor(interruption.time_delayed_in_seconds / 60)} minutes ${
                            interruption.time_delayed_in_seconds % 60
                          } seconds`
                        : "Calculating..."}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Reason</h4>
                  <p className="text-sm whitespace-pre-wrap">{interruption.interruption_reason}</p>
                </div>

                {interruption.resolution_notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Resolution Notes</h4>
                    <p className="text-sm whitespace-pre-wrap">{interruption.resolution_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

