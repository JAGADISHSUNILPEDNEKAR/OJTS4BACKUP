"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DatasetStats } from '@/lib/api';
import { REGION_COORDINATES, getRiskColor, getRiskHSL } from '@/lib/regionCoordinates';

interface RiskHeatmapProps {
  stats: DatasetStats | null;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function RiskHeatmap({ stats, zoomLevel, onZoomIn, onZoomOut }: RiskHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [20, 15],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    // Dark tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© <a href="https://carto.com/">CARTO</a> · © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Sync zoom with external state
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const targetZoom = Math.round(1 + zoomLevel * 2); // map 0.5..2 → 2..5
    if (map.getZoom() !== targetZoom) {
      map.setZoom(targetZoom, { animate: true });
    }
  }, [zoomLevel]);

  // Draw heatmap regions
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !stats) return;

    const heatLayer = L.layerGroup().addTo(map);
    const regionEntries = Object.entries(stats.regionCounts);
    const maxCount = Math.max(...regionEntries.map(([, c]) => c));
    const totalShipments = stats.totalShipments;

    // Calculate per-region "effective risk" from fraud/alert density
    const fraudDensity = stats.fraudCount / totalShipments;

    regionEntries.forEach(([region, count]) => {
      const geo = REGION_COORDINATES[region];
      if (!geo) return;

      const normalizedSize = count / maxCount;
      const radius = 60000 + normalizedSize * 500000; // meters

      // Blend region base risk with data density
      const dataRisk = geo.riskWeight * 0.6 + (count / totalShipments) * 2 * 0.4;
      const clampedRisk = Math.min(dataRisk, 1);
      const color = getRiskHSL(clampedRisk);

      // Outer glow circle
      L.circle([geo.lat, geo.lng], {
        radius: radius * 1.5,
        fillColor: color,
        fillOpacity: 0.06,
        color: 'transparent',
        weight: 0,
      }).addTo(heatLayer);

      // Main heat circle
      const mainCircle = L.circle([geo.lat, geo.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.2,
        color,
        weight: 1.5,
        opacity: 0.4,
      }).addTo(heatLayer);

      // Inner bright core
      L.circle([geo.lat, geo.lng], {
        radius: radius * 0.3,
        fillColor: color,
        fillOpacity: 0.35,
        color: 'transparent',
        weight: 0,
      }).addTo(heatLayer);

      // Styled tooltip
      const pct = ((count / totalShipments) * 100).toFixed(1);
      const riskLabel = clampedRisk > 0.6 ? 'HIGH' : clampedRisk > 0.35 ? 'MEDIUM' : 'LOW';
      const riskColor = getRiskColor(clampedRisk);

      mainCircle.bindTooltip(
        `<div style="font-family: 'Inter', sans-serif;">
          <div style="font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 6px;">${region}</div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="font-size: 11px; color: #94a3b8;">Shipments</span>
            <span style="font-size: 11px; font-weight: 700; color: #e2e8f0;">${count.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
            <span style="font-size: 11px; color: #94a3b8;">Share</span>
            <span style="font-size: 11px; font-weight: 700; color: #e2e8f0;">${pct}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="font-size: 11px; color: #94a3b8;">Risk Level</span>
            <span style="font-size: 11px; font-weight: 800; color: ${riskColor};">${riskLabel}</span>
          </div>
        </div>`,
        { className: 'heatmap-tooltip', direction: 'top' }
      );

      // Click to zoom
      mainCircle.on('click', () => {
        map.setView([geo.lat, geo.lng], 4, { animate: true });
      });
    });

    // Connect high-volume regions with subtle arcs
    const sortedRegions = regionEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    for (let i = 0; i < sortedRegions.length - 1; i++) {
      const [regionA] = sortedRegions[i];
      const [regionB] = sortedRegions[i + 1];
      const geoA = REGION_COORDINATES[regionA];
      const geoB = REGION_COORDINATES[regionB];
      if (!geoA || !geoB) continue;

      const midLat = (geoA.lat + geoB.lat) / 2;
      const midLng = (geoA.lng + geoB.lng) / 2;
      const offset = Math.abs(geoA.lng - geoB.lng) * 0.12;

      L.polyline(
        [[geoA.lat, geoA.lng], [midLat + offset, midLng], [geoB.lat, geoB.lng]],
        { color: '#334155', weight: 1, opacity: 0.3, dashArray: '4, 8', smoothFactor: 2 }
      ).addTo(heatLayer);
    }

    return () => {
      heatLayer.remove();
    };
  }, [stats]);

  // Sorted regions for the table
  const sortedRegions = stats
    ? Object.entries(stats.regionCounts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />

      {/* Top-right: Stats overlay */}
      <div style={{
        position: 'absolute', top: '1rem', right: '1rem', zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
        padding: '0.75rem 1rem', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>
          SPATIAL INTELLIGENCE
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
              {stats ? stats.totalShipments.toLocaleString() : '—'}
            </p>
            <p style={{ fontSize: '0.55rem', color: '#64748b', margin: 0 }}>Total Shipments</p>
          </div>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
              {stats ? Object.keys(stats.regionCounts).length : '—'}
            </p>
            <p style={{ fontSize: '0.55rem', color: '#64748b', margin: 0 }}>Active Regions</p>
          </div>
        </div>
      </div>

      {/* Bottom-left: Top regions list */}
      <div style={{
        position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
        padding: '0.75rem 1rem', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        maxHeight: '160px', overflowY: 'auto',
      }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 0.4rem 0', letterSpacing: '0.05em' }}>
          TOP REGIONS
        </p>
        {sortedRegions.slice(0, 6).map(([region, count]) => {
          const geo = REGION_COORDINATES[region];
          const riskColor = geo ? getRiskColor(geo.riskWeight) : '#64748b';
          return (
            <div key={region} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: riskColor, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.6rem', color: '#cbd5e1', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{region}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>{count.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom-right: Zoom controls */}
      <div style={{
        position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 1000,
        display: 'flex', gap: '0.5rem',
      }}>
        <button
          onClick={() => {
            onZoomIn();
            mapInstance.current?.zoomIn(1, { animate: true });
          }}
          style={{
            background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            padding: '0.5rem 1rem', color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30,41,59,0.95)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15,23,42,0.88)'}
        >
          Zoom In
        </button>
        <button
          onClick={() => {
            onZoomOut();
            mapInstance.current?.zoomOut(1, { animate: true });
          }}
          style={{
            background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            padding: '0.5rem 1rem', color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30,41,59,0.95)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15,23,42,0.88)'}
        >
          Zoom Out
        </button>
      </div>

      {/* Risk level legend */}
      <div style={{
        position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(12px)',
        padding: '0.6rem 0.8rem', borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 0.35rem 0', letterSpacing: '0.05em' }}>RISK ZONES</p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {[
            { color: '#22c55e', label: 'Low' },
            { color: '#f59e0b', label: 'Medium' },
            { color: '#ef4444', label: 'High' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block', opacity: 0.6 }} />
              <span style={{ fontSize: '0.55rem', color: '#cbd5e1' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS */}
      <style jsx global>{`
        .heatmap-tooltip {
          background: rgba(15, 23, 42, 0.92) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 10px !important;
          padding: 10px 14px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
          color: #f1f5f9 !important;
          min-width: 140px;
        }
        .heatmap-tooltip::before {
          border-top-color: rgba(15, 23, 42, 0.92) !important;
        }
      `}</style>
    </div>
  );
}
