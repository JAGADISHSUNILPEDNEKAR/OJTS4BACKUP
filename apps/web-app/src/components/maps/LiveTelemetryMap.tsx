"use client";

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shipment, DatasetStats } from '@/lib/api';
import { REGION_COORDINATES, getCityCoords, getRiskColor } from '@/lib/regionCoordinates';

interface LiveTelemetryMapProps {
  shipments: Shipment[];
  stats: DatasetStats | null;
}

export default function LiveTelemetryMap({ shipments, stats }: LiveTelemetryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [activeShipment, setActiveShipment] = useState(0);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    // Dark tiles — CartoDB Dark Matter
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Attribution in bottom-right
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© <a href="https://carto.com/">CARTO</a> · © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    // Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Draw region circles from stats
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !stats) return;

    const regionLayer = L.layerGroup().addTo(map);
    const maxCount = Math.max(...Object.values(stats.regionCounts));

    Object.entries(stats.regionCounts).forEach(([region, count]) => {
      const geo = REGION_COORDINATES[region];
      if (!geo) return;

      const normalizedSize = (count / maxCount);
      const radius = 8 + normalizedSize * 32;

      // Pulsing circle
      const circle = L.circleMarker([geo.lat, geo.lng], {
        radius,
        fillColor: getRiskColor(geo.riskWeight),
        fillOpacity: 0.15,
        color: getRiskColor(geo.riskWeight),
        weight: 1,
        opacity: 0.4,
      }).addTo(regionLayer);

      circle.bindTooltip(
        `<div style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;">
          ${region}
        </div>
        <div style="font-size: 11px; color: #94a3b8;">
          ${count.toLocaleString()} shipments
        </div>`,
        { className: 'map-tooltip', direction: 'top', offset: [0, -radius] }
      );
    });

    return () => {
      regionLayer.remove();
    };
  }, [stats]);

  // Draw shipment route lines
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || shipments.length === 0) return;

    const routeLayer = L.layerGroup().addTo(map);
    const drawnRoutes = new Set<string>();

    shipments.forEach((shipment) => {
      const originCoords = getCityCoords(shipment.origin);
      const destCoords = getCityCoords(shipment.destination);
      if (!originCoords || !destCoords) return;

      const routeKey = `${originCoords[0]},${originCoords[1]}-${destCoords[0]},${destCoords[1]}`;
      if (drawnRoutes.has(routeKey)) return;
      drawnRoutes.add(routeKey);

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
        color: riskColor,
        weight: 1.5,
        opacity: 0.35,
        smoothFactor: 2,
        dashArray: '6, 8',
      }).addTo(routeLayer);

      // Origin marker
      L.circleMarker(originCoords, {
        radius: 4,
        fillColor: '#60a5fa',
        fillOpacity: 0.9,
        color: '#3b82f6',
        weight: 1.5,
      }).addTo(routeLayer);

      // Destination marker
      L.circleMarker(destCoords, {
        radius: 3,
        fillColor: riskColor,
        fillOpacity: 0.8,
        color: riskColor,
        weight: 1,
      }).addTo(routeLayer);
    });

    return () => {
      routeLayer.remove();
    };
  }, [shipments]);

  // Active shipment highlight pulse
  useEffect(() => {
    if (shipments.length === 0) return;

    const interval = setInterval(() => {
      setActiveShipment(prev => (prev + 1) % Math.min(shipments.length, 10));
    }, 3000);

    return () => clearInterval(interval);
  }, [shipments]);

  // Animate the active shipment pulse
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || shipments.length === 0) return;

    const ship = shipments[activeShipment];
    if (!ship) return;
    const coords = getCityCoords(ship.origin);
    if (!coords) return;

    const pulse = L.circleMarker(coords, {
      radius: 12,
      fillColor: '#60a5fa',
      fillOpacity: 0.5,
      color: '#3b82f6',
      weight: 2,
      className: 'pulse-marker',
    }).addTo(map);

    return () => {
      pulse.remove();
    };
  }, [activeShipment, shipments]);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
  const currentShip = shipments[activeShipment];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay: Title card */}
      <div style={{
        position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
        padding: '0.75rem 1rem', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'livePulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.05em' }}>LIVE TELEMETRY</span>
        </div>
        <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: 0 }}>
          {stats ? `${fmt(stats.totalShipments)} shipments · ${Object.keys(stats.regionCounts).length} regions` : 'Connecting...'}
        </p>
      </div>

      {/* Overlay: Active shipment info */}
      {currentShip && (
        <div style={{
          position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
          padding: '0.75rem 1rem', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          maxWidth: '280px',
          transition: 'opacity 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#60a5fa' }}>{currentShip.id}</span>
            <span style={{
              fontSize: '0.55rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px',
              background: currentShip.status === 'DELAYED' ? 'rgba(239,68,68,0.2)' : currentShip.status === 'IN_TRANSIT' ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)',
              color: currentShip.status === 'DELAYED' ? '#ef4444' : currentShip.status === 'IN_TRANSIT' ? '#60a5fa' : '#22c55e',
            }}>{currentShip.status}</span>
          </div>
          <p style={{ fontSize: '0.6rem', color: '#cbd5e1', margin: 0 }}>
            {currentShip.origin?.split(',')[0]} → {currentShip.destination?.split(',')[0]}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
            <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
              <div style={{
                height: '100%',
                width: `${(currentShip.risk_score || 0) * 100}%`,
                background: getRiskColor(currentShip.risk_score || 0),
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: getRiskColor(currentShip.risk_score || 0) }}>
              {((currentShip.risk_score || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
        padding: '0.6rem 0.8rem', borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>RISK LEVEL</p>
        {[
          { color: '#22c55e', label: 'Low (0–20%)' },
          { color: '#f97316', label: 'Medium (20–40%)' },
          { color: '#f59e0b', label: 'High (40–70%)' },
          { color: '#ef4444', label: 'Critical (70%+)' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
            <span style={{ fontSize: '0.55rem', color: '#cbd5e1' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pulse-marker {
          animation: markerPulse 2s ease-in-out infinite;
        }
        @keyframes markerPulse {
          0% { stroke-opacity: 1; fill-opacity: 0.5; }
          50% { stroke-opacity: 0.3; fill-opacity: 0.15; }
          100% { stroke-opacity: 1; fill-opacity: 0.5; }
        }
        .map-tooltip {
          background: rgba(15, 23, 42, 0.92) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
          color: #f1f5f9 !important;
        }
        .map-tooltip::before {
          border-top-color: rgba(15, 23, 42, 0.92) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(15, 23, 42, 0.85) !important;
          color: #94a3b8 !important;
          border-color: rgba(255,255,255,0.1) !important;
          backdrop-filter: blur(12px);
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30, 41, 59, 0.95) !important;
          color: #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
}
