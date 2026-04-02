import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shipment, DatasetStats } from '@/lib/api';
import { REGION_COORDINATES, getCityCoords, getRiskColor, getRiskHSL } from '@/lib/regionCoordinates';

interface LiveTelemetryMapProps {
  shipments: Shipment[];
  stats: DatasetStats | null;
  selectedShipment?: Shipment | null;
  onCloseShipment?: () => void;
}

export default function LiveTelemetryMap({ shipments, stats, selectedShipment, onCloseShipment }: LiveTelemetryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [activeShipmentIndex, setActiveShipmentIndex] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://carto.com/">CARTO</a> · © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Handle selected shipment Fly-to
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !selectedShipment) return;

    const origin = getCityCoords(selectedShipment.origin);
    const dest = getCityCoords(selectedShipment.destination);

    if (origin && dest) {
      const bounds = L.latLngBounds([origin, dest]);
      map.flyToBounds(bounds, { padding: [100, 100], duration: 1.5 });
    } else if (origin) {
      map.flyTo(origin, 5, { duration: 1.5 });
    }
  }, [selectedShipment]);

  // Draw heatmap layer
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !stats || !showHeatmap) return;

    const heatLayer = L.layerGroup().addTo(map);
    const maxCount = Math.max(...Object.values(stats.regionCounts));

    Object.entries(stats.regionCounts).forEach(([region, count]) => {
      const geo = REGION_COORDINATES[region];
      if (!geo) return;

      const risk = geo.riskWeight;
      const color = getRiskHSL(risk);
      const radius = 200000 + (count / maxCount) * 800000;

      L.circle([geo.lat, geo.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.15,
        color: color,
        weight: 1,
        opacity: 0.3,
      }).addTo(heatLayer);
    });

    return () => {
      heatLayer.remove();
    };
  }, [stats, showHeatmap]);

  // Draw region circles (always visible but subtle)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !stats || showHeatmap) return; // Hide when heatmap is on for clarity

    const regionLayer = L.layerGroup().addTo(map);
    const maxCount = Math.max(...Object.values(stats.regionCounts));

    Object.entries(stats.regionCounts).forEach(([region, count]) => {
      const geo = REGION_COORDINATES[region];
      if (!geo) return;

      const normalizedSize = (count / maxCount);
      const radius = 8 + normalizedSize * 32;

      const circle = L.circleMarker([geo.lat, geo.lng], {
        radius,
        fillColor: getRiskColor(geo.riskWeight),
        fillOpacity: 0.15,
        color: getRiskColor(geo.riskWeight),
        weight: 1,
        opacity: 0.4,
      }).addTo(regionLayer);

      circle.bindTooltip(`<b>${region}</b><br/>${count.toLocaleString()} shipments`, { direction: 'top', offset: [0, -radius] });
    });

    return () => {
      regionLayer.remove();
    };
  }, [stats, showHeatmap]);

  // Draw shipment routes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || shipments.length === 0) return;

    const routeLayer = L.layerGroup().addTo(map);

    shipments.forEach((shipment) => {
      const originCoords = getCityCoords(shipment.origin);
      const destCoords = getCityCoords(shipment.destination);
      if (!originCoords || !destCoords) return;

      const isSelected = selectedShipment?.id === shipment.id;
      const riskColor = getRiskColor(shipment.risk_score || 0);

      // Curved route line
      const midLat = (originCoords[0] + destCoords[0]) / 2;
      const midLng = (originCoords[1] + destCoords[1]) / 2;
      const offset = Math.abs(originCoords[1] - destCoords[1]) * 0.15;

      const curvePoints: L.LatLngExpression[] = [
        originCoords,
        [midLat + offset, midLng],
        destCoords,
      ];

      L.polyline(curvePoints, {
        color: isSelected ? 'var(--primary)' : riskColor,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 1 : 0.35,
        smoothFactor: 2,
        dashArray: isSelected ? undefined : '6, 8',
      }).addTo(routeLayer);

      // Markers
      L.circleMarker(originCoords, { radius: isSelected ? 6 : 4, fillColor: '#60a5fa', fillOpacity: 0.9, color: '#3b82f6', weight: 1.5 }).addTo(routeLayer);
      L.circleMarker(destCoords, { radius: isSelected ? 5 : 3, fillColor: isSelected ? 'var(--primary)' : riskColor, fillOpacity: 1, color: '#fff', weight: 1 }).addTo(routeLayer);
    });

    return () => {
      routeLayer.remove();
    };
  }, [shipments, selectedShipment]);

  // Pulse animation logic
  useEffect(() => {
    if (shipments.length === 0 || selectedShipment) return;

    const interval = setInterval(() => {
      setActiveShipmentIndex(prev => (prev + 1) % Math.min(shipments.length, 10));
    }, 3000);

    return () => clearInterval(interval);
  }, [shipments, selectedShipment]);

  // Active pulse marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || shipments.length === 0) return;

    const ship = selectedShipment || shipments[activeShipmentIndex];
    if (!ship) return;
    const coords = getCityCoords(ship.origin);
    if (!coords) return;

    const pulse = L.circleMarker(coords, {
      radius: selectedShipment ? 15 : 12,
      fillColor: selectedShipment ? 'var(--primary)' : '#60a5fa',
      fillOpacity: 0.5,
      color: selectedShipment ? 'var(--primary)' : '#3b82f6',
      weight: 2,
      className: 'pulse-marker',
    }).addTo(map);

    return () => {
      pulse.remove();
    };
  }, [activeShipmentIndex, shipments, selectedShipment]);

  // Mock Telemetry Data
  const telemetry = useMemo(() => {
    if (!selectedShipment) return null;
    const seed = selectedShipment.id.split('-').pop() || '0';
    const n = parseInt(seed, 16) || 0;
    return {
      temp: (2.5 + (n % 40) / 10).toFixed(1),
      humidity: (65 + (n % 20)).toFixed(1),
      vibration: ((n % 100) / 1000).toFixed(3),
      eta: '4.2h',
      battery: (85 - (n % 15)) + '%',
    };
  }, [selectedShipment]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Top UI Overlay */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
          padding: '0.75rem 1rem', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'livePulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.05em' }}>
              {selectedShipment ? 'SHIPMENT TRACKING' : 'LIVE TELEMETRY'}
            </span>
          </div>
          <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: 0 }}>
            {selectedShipment ? `Monitoring ID: ${selectedShipment.id}` : (stats ? `${stats.totalShipments.toLocaleString()} shipments · ${Object.keys(stats.regionCounts).length} regions` : 'Connecting...')}
          </p>
        </div>

        {/* Heatmap Toggle */}
        <button 
          onClick={() => setShowHeatmap(!showHeatmap)}
          style={{
            background: showHeatmap ? 'var(--primary)' : 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: '0.65rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
          {showHeatmap ? 'HIDE HEATMAP' : 'SHOW RISK HEATMAP'}
        </button>
      </div>

      {/* Selected Shipment Telemetry Card */}
      {selectedShipment && telemetry && (
        <div style={{
          position: 'absolute', top: '1rem', right: '3.5rem', width: '280px', zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(16px)',
          padding: '1.25rem', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>TELEMETRY FEED</h4>
            <button 
              onClick={onCloseShipment}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: '0 0 0.2rem 0', fontWeight: 600 }}>TEMPERATURE</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{telemetry.temp}°C</p>
            </div>
            <div>
              <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: '0 0 0.2rem 0', fontWeight: 600 }}>HUMIDITY</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{telemetry.humidity}%</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600 }}>VIBRATION SENSITIVITY</span>
              <span style={{ fontSize: '0.55rem', color: '#60a5fa', fontWeight: 800 }}>OPTIMAL</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '65%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '2px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: '0 0 0.1rem 0' }}>BATT</p>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e' }}>{telemetry.battery}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: '0 0 0.1rem 0' }}>ETA</p>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9' }}>{telemetry.eta}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: '0 0 0.1rem 0' }}>RISK</p>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: getRiskColor(selectedShipment.risk_score || 0) }}>
                {((selectedShipment.risk_score || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend (only show when not selected) */}
      {!selectedShipment && (
        <div style={{
          position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
          padding: '0.6rem 0.8rem', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>RISK LEVEL</p>
          {[
            { color: '#22c55e', label: 'Low' },
            { color: '#f59e0b', label: 'Medium' },
            { color: '#ef4444', label: 'Critical' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              <span style={{ fontSize: '0.55rem', color: '#cbd5e1' }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .pulse-marker { animation: markerPulse 2s ease-in-out infinite; }
        @keyframes markerPulse { 0% { stroke-opacity: 1; fill-opacity: 0.5; } 50% { stroke-opacity: 0.3; fill-opacity: 0.15; } 100% { stroke-opacity: 1; fill-opacity: 0.5; } }
        .leaflet-container { background: #0f172a !important; }
      `}</style>
    </div>
  );
}
