import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';

// Custom icons
const activeVehicleIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0iIzA4YTc0NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTE2IDggTDIwIDE4IEwxNiAyMiBMMTIgMTggWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const stationaryIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0iI2YwNjAyNyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTE2IDggTDIwIDE4IEwxNiAyMiBMMTIgMTggWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0iI2VhNTMwNyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTE2IDggTDIwIDE4IEwxNiAyMiBMMTIgMTggWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export default function VehicleLocationMap({ vehicles = [], assignments = [] }) {
  const [vehicleLocations, setVehicleLocations] = useState([]);
  const [stationaryVehicles, setStationaryVehicles] = useState([]);

  // Simulate real-time vehicle coordinates (in production, this would come from GPS/API)
  useEffect(() => {
    const generateLocations = () => {
      const activeVehicles = vehicles.filter(v => v.is_active && v.maintenance_status === 'operational');
      
      const locations = activeVehicles.map(vehicle => ({
        id: vehicle.id,
        registration: vehicle.registration_number,
        name: vehicle.name,
        // Simulate coordinates around Nairobi/Kenya region
        lat: -1.286389 + (Math.random() - 0.5) * 0.5,
        lng: 36.817223 + (Math.random() - 0.5) * 0.5,
        lastUpdate: new Date(),
        assignment: assignments.find(a => a.vehicle_id === vehicle.id && a.status === 'in_use'),
      }));

      setVehicleLocations(locations);

      // Identify stationary vehicles (same location for more than 30 mins in demo)
      const stationary = locations.filter(v => {
        // In production, check actual GPS movement data
        // For demo, mark vehicles without active assignments as stationary
        return !v.assignment || v.assignment.status !== 'in_use';
      });

      setStationaryVehicles(stationary);
    };

    generateLocations();
    const interval = setInterval(generateLocations, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [vehicles, assignments]);

  const defaultCenter = [-1.286389, 36.817223]; // Nairobi

  if (vehicleLocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Vehicle Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No active vehicles available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Real-Time Vehicle Tracking
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {vehicleLocations.length} active vehicles
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 rounded-lg border border-border overflow-hidden">
          <MapContainer
            center={defaultCenter}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            
            {/* Active vehicles */}
            {vehicleLocations.map((location) => {
              const isStationary = stationaryVehicles.some(v => v.id === location.id);
              return (
                <Marker
                  key={location.id}
                  position={[location.lat, location.lng]}
                  icon={isStationary ? stationaryIcon : activeVehicleIcon}
                >
                  <Popup>
                    <div className="p-2 text-sm">
                      <p className="font-semibold">{location.registration}</p>
                      <p className="text-xs text-muted-foreground">{location.name}</p>
                      {isStationary && (
                        <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stationary
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Legend and stationary vehicles list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Legend */}
          <div className="border border-border rounded p-3">
            <p className="text-xs font-semibold mb-2">Legend</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span>Active & Moving</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span>Stationary (30+ mins)</span>
              </div>
            </div>
          </div>

          {/* Stationary vehicles alert */}
          {stationaryVehicles.length > 0 && (
            <div className="border border-orange-200 bg-orange-50 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-orange-900">{stationaryVehicles.length} vehicle(s) stationary</p>
                  <div className="mt-1 space-y-1">
                    {stationaryVehicles.slice(0, 3).map((v) => (
                      <p key={v.id} className="text-orange-800">{v.registration}</p>
                    ))}
                    {stationaryVehicles.length > 3 && (
                      <p className="text-orange-800">+{stationaryVehicles.length - 3} more</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}