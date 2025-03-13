"use client"

import { useState } from "react"
import { LogOut, Bell, Settings, Menu, X } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { TrainSelector } from "./TrainSelector"

interface DashboardHeaderProps {
  selectedTrain: string
  onSelectTrain: (trainCode: string) => void
}

export const DashboardHeader = ({ selectedTrain, onSelectTrain }: DashboardHeaderProps) => {
  const { signOut, user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "Train 8903 has reported a delay of 15 minutes",
      time: "10 minutes ago",
      read: false,
    },
    {
      id: 2,
      message: "New crew assignment for tomorrow's journeys",
      time: "1 hour ago",
      read: true,
    },
  ])

  const unreadNotifications = notifications.filter((n) => !n.read).length

  return (
    <div className="bg-transnet-red">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src="https://www.transnet.net/images/LogoTransnet.png"
              alt="Transnet Logo"
              className="h-16 w-auto bg-white rounded-md p-2"
            />
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-white">Transnet Train Monitor</h1>
              <p className="text-white text-opacity-90">Real-time Journey Tracking System</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <button className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-transnet-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
            <button className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>

          <button
            className="md:hidden p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 bg-white rounded-lg shadow-lg p-4 space-y-4">
            <div className="text-center">
              <h1 className="text-xl font-bold text-transnet-red">Transnet Train Monitor</h1>
              <p className="text-gray-600 text-sm">Real-time Journey Tracking System</p>
            </div>
            <div className="flex justify-center space-x-4">
              <button className="p-2 rounded-full bg-gray-100 text-transnet-red hover:bg-gray-200 transition-colors relative">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-transnet-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <button className="p-2 rounded-full bg-gray-100 text-transnet-red hover:bg-gray-200 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 bg-transnet-red/10 rounded-lg text-transnet-red hover:bg-transnet-red/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <TrainSelector selectedTrain={selectedTrain} onSelectTrain={onSelectTrain} />
        </div>
      </div>
    </div>
  )
}

