import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader } from 'lucide-react';

const customIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const startIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMyMmM1NTUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const endIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNlYzRjMjYiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export default function ItineraryMap({ itinerary, packageName, isLoading = false }) {
  const [locations, setLocations] = useState([]);
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    if (!itinerary) {
      setLocations([]);
      return;
    }

    try {
      const days = typeof itinerary === 'string' ? JSON.parse(itinerary) : itinerary;
      const locs = [];

      days.forEach((day, index) => {
        if (day.coordinates) {
          const [lat, lng] = day.coordinates.split(',').map(c => parseFloat(c.trim()));
          if (!isNaN(lat) && !isNaN(lng)) {
            locs.push({
              id: day.date || index,
              lat,
              lng,
              title: day.location || day.title || `Day ${index + 1}`,
              activities: day.activities || day.description || '',
              dayNumber: index + 1,
            });
          }
        }
      });

      setLocations(locs);

      // Calculate bounds
      if (locs.length > 0) {
        const lats = locs.map(l => l.lat);
        const lngs = locs.map(l => l.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        setBounds([[minLat, minLng], [maxLat, maxLng]]);
      }
    } catch (error) {
      console.error('Error parsing itinerary:', error);
      setLocations([]);
    }
  }, [itinerary]);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-center py-20">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Itinerary Map</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-12">
          No location coordinates available for this itinerary.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{packageName || 'Safari'} Route</h3>
        </div>
      </div>

      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        style={{ height: '400px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route line */}
        {locations.length > 1 && (
          <Polyline
            positions={locations.map(loc => [loc.lat, loc.lng])}
            color="#137345"
            weight={3}
            opacity={0.6}
            dashArray="5, 5"
          />
        )}

        {/* Markers */}
        {locations.map((location, index) => (
          <Marker
            key={location.id}
            position={[location.lat, location.lng]}
            icon={index === 0 ? startIcon : index === locations.length - 1 ? endIcon : customIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{location.title}</p>
                <p className="text-xs text-muted-foreground">Day {location.dayNumber}</p>
                {location.activities && (
                  <p className="text-xs mt-1 line-clamp-2">{location.activities}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Locations list */}
      <div className="p-4 bg-secondary/30 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Stops</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {locations.map((location, index) => (
            <div
              key={location.id}
              className="text-xs p-2 rounded bg-card border border-border"
            >
              <p className="font-medium">{location.title}</p>
              <p className="text-muted-foreground">Day {location.dayNumber}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}