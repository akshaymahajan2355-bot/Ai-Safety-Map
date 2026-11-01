import { Server as HttpServer } from 'http';
import { RoadSafetyAgent } from '../services/roadSafetyAgent/roadSafetyAgent';
import { PotholeService } from '../services/pothole/potholeService';

export function setupWebSocket(server: HttpServer) {
  // Can be bound to WebSocket or socket.io if needed
  console.log('Road Safety Real-Time Navigation Engine initialized');
}

export function handleRealTimeGpsPing(
  currentLocation: { latitude: number; longitude: number },
  routeCoordinates: [number, number][],
  alertedIds: number[]
) {
  const hazards = routeCoordinates?.length
    ? PotholeService.getOnRoute(routeCoordinates, 120)
    : PotholeService.getNearby(currentLocation.latitude, currentLocation.longitude, 1200);

  return RoadSafetyAgent.evaluateUpcomingHazards(
    currentLocation,
    routeCoordinates,
    hazards,
    new Set(alertedIds)
  );
}
