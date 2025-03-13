"use client"

import { Phone, Mail } from "lucide-react"

interface CrewMember {
  id: string
  name: string
  role: string
  shift: string
  phone?: string
  email?: string
  avatar?: string
}

interface CrewInfoProps {
  crew: CrewMember[]
}

export const CrewInfo = ({ crew }: CrewInfoProps) => {
  // Add some sample contact info to the crew members
  const enhancedCrew = crew.map((member) => ({
    ...member,
    phone: member.phone || "+27 71 234 5678",
    email: member.email || `${member.name.toLowerCase().replace(" ", ".")}@transnet.co.za`,
    avatar:
      member.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=ef4435&color=fff`,
  }))

  return (
    <div className="bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <h2 className="text-xl font-bold mb-4">Crew Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enhancedCrew.map((member) => (
          <div
            key={member.id}
            className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4 transition-all duration-200 hover:bg-gray-100"
          >
            <img
              src={member.avatar || "/placeholder.svg"}
              alt={member.name}
              className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
            />
            <div>
              <h3 className="font-semibold text-transnet-gray">{member.name}</h3>
              <p className="text-sm text-gray-600 mb-1">
                {member.role} - {member.shift} Shift
              </p>
              <div className="flex items-center text-xs text-gray-500">
                <Phone className="w-3 h-3 mr-1" />
                <span>{member.phone}</span>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Mail className="w-3 h-3 mr-1" />
                <span>{member.email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

