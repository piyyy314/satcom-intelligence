
import { Satellite, SatelliteStatus } from '../types.ts';
import { COMMON_SATELLITES } from '../constants.ts';

// Create a mutable copy to simulate a database
let mockSatelliteData: Satellite[] = JSON.parse(JSON.stringify(COMMON_SATELLITES));

const ALL_STATUSES: SatelliteStatus[] = ['active', 'offline', 'maintenance'];

/**
 * Simulates fetching satellite status updates from a remote API.
 * Has a chance to randomly change the status of one satellite.
 */
export const fetchSatelliteStatusUpdates = async (): Promise<Satellite[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // 25% chance to update a status on each poll
      if (Math.random() < 0.25) {
        const satIndexToUpdate = Math.floor(Math.random() * mockSatelliteData.length);
        const currentSat = mockSatelliteData[satIndexToUpdate];
        
        const possibleNewStatuses = ALL_STATUSES.filter(s => s !== currentSat.status);
        const newStatus = possibleNewStatuses[Math.floor(Math.random() * possibleNewStatuses.length)];
        
        mockSatelliteData[satIndexToUpdate] = {
          ...currentSat,
          status: newStatus,
        };
        console.log(`MOCK_API: Status of ${currentSat.name} changed to ${newStatus.toUpperCase()}`);
      }
      
      // Return a deep copy to prevent direct state mutation
      resolve(JSON.parse(JSON.stringify(mockSatelliteData)));
    }, 500); // 500ms network latency simulation
  });
};
