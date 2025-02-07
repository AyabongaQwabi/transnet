import React, { useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

export const InterruptionModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold">Report Train Interruption</h2>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span>Current Time: {new Date().toLocaleTimeString()}</span>
          </div>
          <p className="text-sm text-gray-600">
            Please provide details about the interruption. This will help track delays and adjust the schedule accordingly.
          </p>
        </div>
        
        <textarea
          className="w-full p-3 border rounded-lg mb-4 h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Please provide the reason for the interruption..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (reason.trim()) {
                onConfirm(reason);
                setReason('');
              }
            }}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Confirm Interruption
          </button>
        </div>
      </div>
    </div>
  );
};