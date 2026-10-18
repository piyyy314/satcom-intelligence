
import { Coordinates, LookAngles, LinkBudgetParams, LinkBudgetResults } from '../types.ts';
import { EARTH_RADIUS, GEO_ALTITUDE, SPEED_OF_LIGHT } from '../constants.ts';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const calculateLookAngles = (userLoc: Coordinates, satLong: number): LookAngles => {
  const L = toRad(userLoc.lat);
  const G = toRad(satLong - userLoc.lng);
  const R = EARTH_RADIUS;
  const H = GEO_ALTITUDE;
  const Rs = R + H;

  const numerator = Math.cos(L) * Math.cos(G) - (R / Rs);
  const denominator = Math.sqrt(1 - Math.pow(Math.cos(L), 2) * Math.pow(Math.cos(G), 2));
  const elevation = toDeg(Math.atan2(numerator, denominator));

  let azimuth = toDeg(Math.atan2(Math.tan(G), Math.sin(L)));
  if (userLoc.lat >= 0) {
    azimuth = (180 + azimuth) % 360;
  } else {
    azimuth = (360 + azimuth) % 360;
  }

  const skew = toDeg(Math.atan2(Math.sin(G), Math.tan(L)));
  const distance = Math.sqrt(
    Math.pow(R, 2) + Math.pow(Rs, 2) - 2 * R * Rs * Math.cos(L) * Math.cos(G)
  );

  return { azimuth, elevation, skew, distance };
};

export const calculateLinkBudget = (params: LinkBudgetParams, distance: number): LinkBudgetResults => {
  const { uplinkFreq, txPower, antSize, efficiency, lnbNoiseTemp, rainFade } = params;
  
  // Free Space Path Loss (dB) = 20log10(d) + 20log10(f) + 92.45
  const fspl = 20 * Math.log10(distance) + 20 * Math.log10(uplinkFreq) + 92.45;
  
  // Antenna Gain (dBi) = 10log10(eff * (pi * D / lambda)^2)
  const lambda = SPEED_OF_LIGHT / (uplinkFreq * 1e9) * 1000; // in meters
  const gain = 10 * Math.log10((efficiency / 100) * Math.pow((Math.PI * antSize) / (lambda / 1000), 2));
  
  // G/T (dB/K) = Gain - 10log10(Noise Temp)
  const gt = gain - 10 * Math.log10(lnbNoiseTemp);
  
  // Estimated Eb/No (simplified link margin calculation)
  const eirp = txPower + gain;
  const ebNo = eirp - fspl + gt + 228.6 - rainFade - 70; // 70 is arbitrary constant for typical data rates (approx 10Mbps)

  // Bit Error Rate Estimation based on Eb/No (Approximate for QPSK)
  const ber = ebNo > 12 ? '1e-9' : ebNo > 8 ? '1e-7' : ebNo > 5 ? '1e-4' : '>1e-2';

  return { fspl, antGain: gain, gt, ebNo, ber };
};

export const calculateRainFade = (rainRate: number, frequencyGhz: number, elevation: number) => {
  // Simplified ITU-R P.618 parameters for Ka-band (~30GHz)
  const k = 0.22; 
  const alpha = 0.9;
  const specificAttenuation = k * Math.pow(rainRate, alpha); // dB/km
  const pathLength = (5 - 0.5) / Math.sin(toRad(elevation)); // Effective rain height
  return specificAttenuation * pathLength;
};

export const formatDegrees = (val: number) => `${val.toFixed(2)}°`;