"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Search, TrainIcon } from "lucide-react"

interface Train {
  id: string
  train_code: string
  name: string
  route: string
  status: string
}

interface TrainSelectorProps {
  selectedTrain: string
  onSelectTrain: (trainCode: string) => void
}

export const TrainSelector = ({ selectedTrain, onSelectTrain }: TrainSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [trains, setTrains] = useState<Train[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Sample train data - in a real app, this would come from the database
  const sampleTrains = [
    { id: "1", train_code: "8903", name: "Johannesburg - Durban Express", route: "JHB → DBN", status: "In Progress" },
    { id: "2", train_code: "7201", name: "Cape Town - Johannesburg", route: "CPT → JHB", status: "Scheduled" },
    { id: "3", train_code: "6104", name: "Pretoria - Polokwane", route: "PTA → PLK", status: "Delayed" },
    { id: "4", train_code: "5302", name: "East London - Bloemfontein", route: "ELS → BFN", status: "In Progress" },
    { id: "5", train_code: "4701", name: "Kimberley - Port Elizabeth", route: "KIM → PLZ", status: "Scheduled" },
  ]

  useEffect(() => {
    // In a real app, fetch trains from Supabase
    // For now, we'll use the sample data
    setTrains(sampleTrains)
    setIsLoading(false)
  }, [])

  const filteredTrains = trains.filter(
    (train) =>
      train.train_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      train.route.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedTrainData = trains.find((train) => train.train_code === selectedTrain)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "in progress":
        return "bg-transnet-green text-white"
      case "delayed":
        return "bg-transnet-red text-white"
      case "scheduled":
        return "bg-transnet-gray text-white"
      default:
        return "bg-gray-200 text-gray-800"
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="bg-transnet-red/10 p-2 rounded-md">
            <TrainIcon className="w-5 h-5 text-transnet-red" />
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">{selectedTrainData?.train_code || "Select Train"}</p>
            <p className="text-sm text-gray-500">{selectedTrainData?.name || "No train selected"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {selectedTrainData && (
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedTrainData.status)}`}>
              {selectedTrainData.status}
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search trains..."
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-transnet-red"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-transnet-red border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500">Loading trains...</p>
            </div>
          ) : filteredTrains.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No trains found</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {filteredTrains.map((train) => (
                <button
                  key={train.id}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors duration-150 ${
                    selectedTrain === train.train_code ? "bg-gray-50" : ""
                  }`}
                  onClick={() => {
                    onSelectTrain(train.train_code)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-md ${selectedTrain === train.train_code ? "bg-transnet-red/10" : "bg-gray-100"}`}
                    >
                      <TrainIcon
                        className={`w-4 h-4 ${selectedTrain === train.train_code ? "text-transnet-red" : "text-gray-500"}`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{train.train_code}</p>
                      <p className="text-sm text-gray-500">{train.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500">{train.route}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(train.status)}`}>
                      {train.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

