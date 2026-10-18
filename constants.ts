
import { Satellite } from './types.ts';

export const COMMON_SATELLITES: Satellite[] = [
  { id: 't-11w', name: 'Telstar 11N', longitude: -37.5, orbitalSlot: '37.5°W', operator: 'Telesat', apogee: 35794, perigee: 35778, inclination: 0.02, velocity: 3.07, status: 'active', frequencies: ['Ku-Band (11.7-14.5 GHz)'] },
  { id: 't-12v', name: 'Telstar 12V', longitude: -15.0, orbitalSlot: '15°W', operator: 'Telesat', apogee: 35791, perigee: 35781, inclination: 0.01, velocity: 3.07, status: 'active', frequencies: ['Ku-Band (10.9-14.5 GHz)'] },
  { id: 'eutelsat-10b', name: 'Eutelsat 10B', longitude: 10.0, orbitalSlot: '10°E', operator: 'Eutelsat', apogee: 35788, perigee: 35784, inclination: 0.05, velocity: 3.08, status: 'maintenance', frequencies: ['Ka-Band (17.7-31.0 GHz)', 'Ku-Band'] },
  { id: 'astra-1n', name: 'Astra 1N', longitude: 19.2, orbitalSlot: '19.2°E', operator: 'SES', apogee: 35790, perigee: 35782, inclination: 0.02, velocity: 3.07, status: 'active', frequencies: ['Ku-Band (10.7-12.75 GHz)'] },
  { id: 'arab-5c', name: 'Arabsat 5C', longitude: 20.0, orbitalSlot: '20°E', operator: 'Arabsat', apogee: 35802, perigee: 35770, inclination: 0.08, velocity: 3.07, status: 'active', frequencies: ['C-Band', 'Ka-Band'] },
  { id: 'astra-2e', name: 'Astra 2E', longitude: 28.2, orbitalSlot: '28.2°E', operator: 'SES', apogee: 35789, perigee: 35783, inclination: 0.02, velocity: 3.07, status: 'active', frequencies: ['Ku-Band', 'Ka-Band'] },
  { id: 'express-am44', name: 'Express AM44', longitude: 11.0, orbitalSlot: '11°W', operator: 'RSCC', apogee: 35810, perigee: 35762, inclination: 0.12, velocity: 3.06, status: 'offline', frequencies: ['C-Band', 'Ku-Band', 'L-Band'] },
  { id: 'galaxy-19', name: 'Galaxy 19', longitude: -97.0, orbitalSlot: '97°W', operator: 'Intelsat', apogee: 35792, perigee: 35780, inclination: 0.03, velocity: 3.07, status: 'active', frequencies: ['C-Band', 'Ku-Band (11.7-12.2 GHz)'] },
  { id: 'intelsat-34', name: 'Intelsat 34', longitude: -55.5, orbitalSlot: '55.5°W', operator: 'Intelsat', apogee: 35786, perigee: 35786, inclination: 0.01, velocity: 3.07, status: 'active', frequencies: ['C-Band', 'Ku-Band'] },
  { id: 'abs-2', name: 'ABS-2', longitude: 75.0, orbitalSlot: '75°E', operator: 'ABS', apogee: 35798, perigee: 35774, inclination: 0.04, velocity: 3.07, status: 'decommissioned', frequencies: ['C-Band', 'Ku-Band', 'Ka-Band'] },
  { id: 'asiasat-7', name: 'AsiaSat 7', longitude: 105.5, orbitalSlot: '105.5°E', operator: 'AsiaSat', apogee: 35793, perigee: 35779, inclination: 0.02, velocity: 3.07, status: 'active', frequencies: ['C-Band', 'Ku-Band'] },
];

export const EARTH_RADIUS = 6378.137; // km
export const GEO_ALTITUDE = 35786; // km
export const SPEED_OF_LIGHT = 299792.458; // km/s
