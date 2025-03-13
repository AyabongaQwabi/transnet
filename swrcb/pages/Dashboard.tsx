"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { Timeline } from "../components/Timeline"
import { InterruptionHistory } from "../components/InterruptionHistory"
import { InterruptionSummary } from "../components/InterruptionSummary"
import { JourneyStats } from "../components/JourneyStats"
import { CrewInfo } from "../components/CrewInfo"
import { DashboardHeader } from "../components/DashboardHeader"
import { DelayTimer } from "../components/DelayTimer"
import { trainData } from "../data"
import { Train, AlertTriangle, LayoutDashboard, Map, CheckCircle } from "lucide-react"
import { useJourney } from "../hooks/useJourney"

// Sample data for multiple trains
const multiTrainData = {
  "8903": trainData, // Original train data
  "7201": {
    trainCode: "7201",
    crew: [
      { id: "1", name: "Emily Johnson", role: "Driver", shift: "Day" },
      { id: "2", name: "David Williams", role: "Conductor", shift: "Day" },
      { id: "3", name: "Michael Davis", role: "Assistant", shift: "Day" },
    ],
    stations: trainData.stations.map((station) => ({
      ...station,
      // Adjust times for this train (2 hours later)
      arrivalTime: adjustTime(station.arrivalTime, 2),
      departureTime: adjustTime(station.departureTime, 2),
    })),
  },
}

// Helper function to adjust time by hours
function adjustTime(timeStr, hoursToAdd) {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const newHours = (hours + hoursToAdd) % 24
  return `${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

// Calculate distance between stations (mock function)
function calculateDistance(stations) {
  // In a real app, this would use actual coordinates
  // For now, we'll use a simple formula based on time differences
  let totalDistance = 0
  for (let i = 1; i < stations.length; i++) {
    const prevTime = getTimeInMinutes(stations[i - 1].departureTime)
    const currTime = getTimeInMinutes(stations[i].arrivalTime)
    // Assume 1 minute = 1 km for simplicity
    const distance = ((currTime - prevTime + 1440) % 1440) * 0.8
    totalDistance += distance
  }
  return totalDistance
}

function getTimeInMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number)
  return hours * 60 + minutes
}

export default function Dashboard() {
  const { signOut } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedTrain, setSelectedTrain] = useState("8903") // Default to the original train
  const [isLoading, setIsLoading] = useState(true)

  // Get the current train data based on selection
  const currentTrainData = multiTrainData[selectedTrain] || trainData

  const journey = useJourney({
    trainCode: currentTrainData.trainCode,
    stations: currentTrainData.stations,
  })

  const { interruptions, totalDelay, currentStation } = journey
  const activeInterruption = interruptions.find((i) => !i.end_time)

  useEffect(() => {
    // Simulate loading data
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [selectedTrain])

  // Calculate journey statistics
  const totalDistance = calculateDistance(currentTrainData.stations)
  const completedDistance = currentStation
    ? calculateDistance(
        currentTrainData.stations.slice(
          0,
          currentTrainData.stations.findIndex((s) => s.code === currentStation.code) + 1,
        ),
      )
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader selectedTrain={selectedTrain} onSelectTrain={setSelectedTrain} />

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "border-transnet-red text-transnet-red"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("timeline")}
              className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "timeline"
                  ? "border-transnet-red text-transnet-red"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Train className="w-5 h-5" />
                <span>Journey Timeline</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("interruptions")}
              className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "interruptions"
                  ? "border-transnet-red text-transnet-red"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Interruptions</span>
                {interruptions.length > 0 && (
                  <span className="bg-transnet-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {interruptions.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab("map")}
              className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "map"
                  ? "border-transnet-red text-transnet-red"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Map className="w-5 h-5" />
                <span>Route Map</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-transnet-red mb-4"></div>
            <p className="text-gray-600">Loading train data...</p>
          </div>
        </div>
      ) : (
        /* Main Content */
        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Delay Timer - Always visible at the top of any tab */}
          <DelayTimer
            totalDelay={totalDelay}
            activeInterruption={activeInterruption}
            className="mb-6"
            interruptions={interruptions}
          />

          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <JourneyStats
                currentStation={currentStation}
                totalDelay={totalDelay}
                interruptions={interruptions}
                startTime={currentTrainData.stations[0].departureTime}
                estimatedEndTime={currentTrainData.stations[currentTrainData.stations.length - 1].arrivalTime}
                totalDistance={totalDistance}
                completedDistance={completedDistance}
              />
              <CrewInfo crew={currentTrainData.crew} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InterruptionSummary interruptions={interruptions} totalDelay={totalDelay} />
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold mb-4">Next Stations</h2>
                  <div className="space-y-3">
                    {currentStation &&
                      currentTrainData.stations
                        .slice(
                          currentTrainData.stations.findIndex((s) => s.code === currentStation.code) + 1,
                          currentTrainData.stations.findIndex((s) => s.code === currentStation.code) + 5,
                        )
                        .map((station) => (
                          <div
                            key={station.code}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="bg-transnet-green/10 p-2 rounded-full">
                                <Train className="w-4 h-4 text-transnet-green" />
                              </div>
                              <div>
                                <p className="font-medium">{station.name}</p>
                                <p className="text-xs text-gray-500">
                                  Arrival: {station.arrivalTime} | Code: {station.code}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">{station.runTime} min</div>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <Timeline stations={currentTrainData.stations} journey={journey} crew={currentTrainData.crew} />
          )}

          {activeTab === "interruptions" && (
            <div className="space-y-6">
              <InterruptionSummary interruptions={interruptions} totalDelay={totalDelay} />
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-transnet-red mr-2" />
                  All Interruptions
                </h2>

                {interruptions.length === 0 ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-transnet-green mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900">No interruptions recorded</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        The train journey is proceeding without any recorded interruptions.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                            Reason
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Start Time
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            End Time
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Duration
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {interruptions.map((interruption) => {
                          const startTime = new Date(interruption.start_time)
                          const endTime = interruption.end_time ? new Date(interruption.end_time) : null
                          const duration = interruption.time_delayed_in_seconds || 0
                          const minutes = Math.floor(duration / 60)
                          const seconds = duration % 60

                          return (
                            <tr key={interruption.id}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                <div className="font-medium text-gray-900">
                                  {interruption.interruption_reason.substring(0, 50)}
                                </div>
                                <div className="text-gray-500">{interruption.location_description}</div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {startTime.toLocaleString()}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {endTime ? endTime.toLocaleString() : "Ongoing"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {minutes}m {seconds}s
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm">
                                {!interruption.end_time ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-transnet-red text-white">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-transnet-green text-white">
                                    Resolved
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <InterruptionHistory journey={journey} isLoading={false} />
            </div>
          )}

          {activeTab === "map" && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Route Map</h2>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center p-8">
                  <Map className="w-16 h-16 text-transnet-gray mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700">Route Map Coming Soon</h3>
                  <p className="text-gray-500 mt-2">
                    We're working on an interactive map to visualize the train's route and real-time location.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  )
}

