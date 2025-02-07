import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Timeline } from '../components/Timeline';
import { trainData } from '../data';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-transnet-red">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <img 
                src="https://www.transnet.net/images/LogoTransnet.png"
                alt="Transnet Logo"
                className="h-20 w-auto bg-white rounded-md p-4"
              />
              <div>
                <h1 className="text-4xl font-bold text-white">Transnet Passenger Train</h1>
                <p className="text-white text-opacity-90">Real-time Train Journey Monitoring System</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>
        <Timeline
          stations={trainData.stations}
          trainCode={trainData.trainCode}
          crew={trainData.crew}
        />
      </main>
    </div>
  );
}