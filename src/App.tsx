import { useEffect, useState } from 'react';
import L from 'leaflet';
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CAMPUS_DATA, getBlockStats, getRoomStats, type Block, type Room, type Risk, type RiskLevel, type RiskStatus, ALL_RISKS } from './data';

// ─── Risk Level Helpers ───────────────────────────────────────────────────────

function levelColor(level: RiskLevel) {
  switch (level) {
    case 'critico': return '#c0280e';
    case 'alto': return '#d05a10';
    case 'moderado': return '#d98a00';
    case 'baixo': return '#22a861';
  }
}
function levelBg(level: RiskLevel) {
  switch (level) {
    case 'critico': return '#fff0ee';
    case 'alto': return '#fff1e8';
    case 'moderado': return '#fff8e6';
    case 'baixo': return '#edfaf3';
  }
}
function levelLabel(level: RiskLevel) {
  switch (level) {
    case 'critico': return 'Crítico';
    case 'alto': return 'Alto';
    case 'moderado': return 'Moderado';
    case 'baixo': return 'Baixo';
  }
}
function levelIcon(level: RiskLevel) {
  switch (level) {
    case 'critico': return '⬟';
    case 'alto': return '▲';
    case 'moderado': return '◆';
    case 'baixo': return '●';
  }
}

type RiskTypeKey = 'fisico' | 'quimico' | 'biologico' | 'ergonomico' | 'acidente';

const RISK_TYPE_THEME: Record<RiskTypeKey, { label: string; color: string; bg: string; border: string; icon: string }> = {
  fisico: { label: 'Físico', color: '#2e7d32', bg: '#eef8ef', border: '#a8d5ad', icon: '●' },
  quimico: { label: 'Químico', color: '#c62828', bg: '#fff0ef', border: '#efb4ad', icon: '◆' },
  biologico: { label: 'Biológico', color: '#795548', bg: '#f7f1ee', border: '#d2b8ad', icon: '✚' },
  ergonomico: { label: 'Ergonômico', color: '#a66a00', bg: '#fff8d7', border: '#e9c85e', icon: '■' },
  acidente: { label: 'Acidente', color: '#1565c0', bg: '#edf5ff', border: '#a8cdf7', icon: '▲' },
};

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function riskTypeFromCategory(category: string): RiskTypeKey {
  const normalized = normalizeText(category);

  if (normalized.includes('quim') || normalized.includes('gas')) return 'quimico';
  if (normalized.includes('biolog') || normalized.includes('residuo') || normalized.includes('sanitario')) return 'biologico';
  if (normalized.includes('ergonom') || normalized.includes('iluminacao') || normalized.includes('postura')) return 'ergonomico';
  if (normalized.includes('ruido') || normalized.includes('vibracao') || normalized.includes('temperatura') || normalized.includes('radiacao')) return 'fisico';

  return 'acidente';
}

function riskTypeTheme(category: string) {
  return RISK_TYPE_THEME[riskTypeFromCategory(category)];
}

function riskLevelWeight(level: RiskLevel) {
  switch (level) {
    case 'critico': return 4;
    case 'alto': return 3;
    case 'moderado': return 2;
    case 'baixo': return 1;
  }
}

function getActiveRisksFromBlock(block: Block) {
  return block.floors
    .flatMap(floor => floor.rooms.flatMap(room => room.risks))
    .filter(risk => risk.status !== 'resolvido' && risk.status !== 'rejeitado');
}

function filterRisksByType(risks: Risk[], type: RiskTypeKey | null) {
  if (!type) return risks;
  return risks.filter(risk => riskTypeFromCategory(risk.category) === type);
}

function getDominantRisk(risks: Risk[]) {
  const order: RiskLevel[] = ['critico', 'alto', 'moderado', 'baixo'];
  return [...risks].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))[0] ?? null;
}
function statusLabel(status: RiskStatus) {
  switch (status) {
    case 'pendente': return 'Pendente';
    case 'avaliacao': return 'Em avaliação';
    case 'validado': return 'Validado';
    case 'resolvido': return 'Resolvido';
    case 'rejeitado': return 'Rejeitado';
  }
}
function statusColor(status: RiskStatus) {
  switch (status) {
    case 'pendente': return { bg: '#fffbe6', fg: '#8b6b00' };
    case 'avaliacao': return { bg: '#e8f2fb', fg: '#1a5c8c' };
    case 'validado': return { bg: '#edfaf3', fg: '#1a5c38' };
    case 'resolvido': return { bg: '#f3f4f6', fg: '#4b5563' };
    case 'rejeitado': return { bg: '#fef2f2', fg: '#b91c1c' };
  }
}
function roomTypeLabel(type: string) {
  switch (type) {
    case 'sala': return 'Sala de aula';
    case 'laboratorio': return 'Laboratório';
    case 'corredor': return 'Corredor';
    case 'banheiro': return 'Banheiro';
    case 'area-tecnica': return 'Área técnica';
    case 'secretaria': return 'Secretaria / Administrativo';
    case 'auditorio': return 'Auditório';
    case 'deposito': return 'Depósito';
    case 'entrada': return 'Entrada / Acesso';
    default: return type;
  }
}

// ─── Small Shared Components ──────────────────────────────────────────────────

function RiskBadge({ level, category, size = 'sm' }: { level: RiskLevel; category?: string; size?: 'sm' | 'md' }) {
  const pad = size === 'md' ? '3px 10px' : '2px 7px';
  const fontSize = size === 'md' ? '12px' : '11px';
  const theme = category ? riskTypeTheme(category) : null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: theme?.bg ?? levelBg(level), color: theme?.color ?? levelColor(level),
      borderRadius: 5, padding: pad, fontWeight: 600, fontSize,
      border: `1px solid ${theme?.border ?? `${levelColor(level)}22`}`,
    }}>
      <span style={{ fontSize: size === 'md' ? 9 : 8 }}>{theme?.icon ?? levelIcon(level)}</span>
      {theme ? `${theme.label} · ${levelLabel(level)}` : levelLabel(level)}
    </span>
  );
}

function StatusBadge({ status }: { status: RiskStatus }) {
  if (status === 'pendente') return null;

  const c = statusColor(status);
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg, color: c.fg,
      borderRadius: 5, padding: '2px 8px',
      fontSize: 11, fontWeight: 600,
      border: `1px solid ${c.fg}20`,
    }}>{statusLabel(status)}</span>
  );
}

function Breadcrumb({ parts }: { parts: { label: string; onClick?: () => void }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7f74', flexWrap: 'wrap' }}>
      {parts.map((p, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: '#c5d1cc' }}>›</span>}
          <span
            onClick={p.onClick}
            style={{
              color: p.onClick ? '#1a5c38' : '#0f1a14',
              fontWeight: p.onClick ? 500 : 600,
              cursor: p.onClick ? 'pointer' : 'default',
              textDecoration: p.onClick ? 'none' : 'none',
            }}
            onMouseEnter={e => { if (p.onClick) (e.target as HTMLElement).style.textDecoration = 'underline'; }}
            onMouseLeave={e => { if (p.onClick) (e.target as HTMLElement).style.textDecoration = 'none'; }}
          >{p.label}</span>
        </span>
      ))}
    </div>
  );
}

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 24, height: 8, borderRadius: 3,
          background: i < value ? color : '#e2e8e4',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  );
}

// ─── Campus Map ───────────────────────────────────────────────────────────────

const CAMPUS_CENTER: [number, number] = [-7.2139, -35.9088];
const MAP_MIN_ZOOM = 15;
const MAP_INITIAL_ZOOM = 17;
const MAP_MAX_ZOOM = 19;

type CampusMapFeature = {
  type: 'Feature';
  properties: {
    kind?: string;
    osmId?: string;
    name?: string;
    building?: string;
    highway?: string;
    landuse?: string;
    leisure?: string;
    natural?: string;
  };
  geometry: {
    type: 'Polygon' | 'LineString';
    coordinates: unknown;
  };
};

type CampusMapGeoJSON = {
  type: 'FeatureCollection';
  bounds?: {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
  };
  features: CampusMapFeature[];
};

type MapNamedPlace = {
  id: string;
  name: string;
  kind?: string;
  position: [number, number];
  blockId?: string;
};

type LocationMarker = {
  id: string;
  blockId: string;
  position: [number, number];
};

type MapFocusTarget = {
  id: string;
  position: [number, number];
  zoom?: number;
};

function getBlockCoordinate(block: Block): [number, number] | null {
  if (block.coordinates) return block.coordinates;

  for (const floor of block.floors) {
    const room = floor.rooms.find(item => item.coordinates);
    if (room?.coordinates) return room.coordinates;
  }

  return null;
}

function getRoomCoordinate(room: Room, block: Block): [number, number] | null {
  return room.coordinates ?? getBlockCoordinate(block);
}

function collectGeoJsonPoints(coordinates: unknown): [number, number][] {
  if (!Array.isArray(coordinates)) return [];

  if (
    coordinates.length >= 2
    && typeof coordinates[0] === 'number'
    && typeof coordinates[1] === 'number'
  ) {
    return [[coordinates[0], coordinates[1]]];
  }

  return coordinates.flatMap(collectGeoJsonPoints);
}

function getFeatureCenter(feature: CampusMapFeature): [number, number] | null {
  const points = collectGeoJsonPoints(feature.geometry.coordinates);
  if (points.length === 0) return null;

  const [lonSum, latSum] = points.reduce(
    ([lonTotal, latTotal], [lon, lat]) => [lonTotal + lon, latTotal + lat],
    [0, 0],
  );

  return [latSum / points.length, lonSum / points.length];
}

function getFeatureBadgePosition(feature: CampusMapFeature): [number, number] | null {
  const points = collectGeoJsonPoints(feature.geometry.coordinates);
  if (points.length === 0) return null;

  const lats = points.map(([, lat]) => lat);
  const lons = points.map(([lon]) => lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.00004);
  const lonSpan = Math.max(maxLon - minLon, 0.00004);

  return [
    maxLat - latSpan * 0.22,
    maxLon - lonSpan * 0.18,
  ];
}

function normalizeMapName(value: string) {
  return normalizeText(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapFeatureMatchesBlock(featureName: string | undefined, block: Block) {
  if (!featureName) return false;

  const feature = normalizeMapName(featureName);
  const blockName = normalizeMapName(block.name);
  const shortName = normalizeMapName(block.shortName);

  return (
    feature === blockName
    || feature.includes(blockName)
    || feature.includes(`bloco ${shortName}`)
  );
}

function getBlockForMapFeature(feature: CampusMapFeature) {
  if (feature.properties.kind !== 'building') return null;
  return CAMPUS_DATA.find(block => mapFeatureMatchesBlock(feature.properties.name, block)) ?? null;
}

function getMapFeatureForBlock(block: Block, campusGeoJson: CampusMapGeoJSON | null) {
  return campusGeoJson?.features.find(feature => getBlockForMapFeature(feature)?.id === block.id) ?? null;
}

function getBlockMapPosition(block: Block, campusGeoJson: CampusMapGeoJSON | null): [number, number] | null {
  const feature = getMapFeatureForBlock(block, campusGeoJson);
  return feature ? getFeatureCenter(feature) : getBlockCoordinate(block);
}

function getBlockRiskIndicatorPosition(block: Block, campusGeoJson: CampusMapGeoJSON | null): [number, number] | null {
  const feature = getMapFeatureForBlock(block, campusGeoJson);
  const badgePosition = feature ? getFeatureBadgePosition(feature) : null;
  if (badgePosition) return badgePosition;

  const coordinate = getBlockCoordinate(block);
  return coordinate ? [coordinate[0] + 0.00008, coordinate[1] + 0.00008] : null;
}

function getLocationMarkers(campusGeoJson: CampusMapGeoJSON | null): LocationMarker[] {
  return CAMPUS_DATA.flatMap(block => {
    const position = getBlockRiskIndicatorPosition(block, campusGeoJson);
    if (!position) return [];

    return [{
      id: `${block.id}-location`,
      blockId: block.id,
      position,
    }];
  });
}

type RiskTypeSummary = {
  type: RiskTypeKey;
  count: number;
  maxLevel: RiskLevel;
};

function getRiskTypeSummaries(risks: Risk[]): RiskTypeSummary[] {
  const summaries = new Map<RiskTypeKey, RiskTypeSummary>();

  risks.forEach(risk => {
    const type = riskTypeFromCategory(risk.category);
    const current = summaries.get(type);

    if (!current) {
      summaries.set(type, { type, count: 1, maxLevel: risk.level });
      return;
    }

    current.count += 1;
    if (riskLevelWeight(risk.level) > riskLevelWeight(current.maxLevel)) {
      current.maxLevel = risk.level;
    }
  });

  return [...summaries.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return riskLevelWeight(b.maxLevel) - riskLevelWeight(a.maxLevel);
  });
}

function createRiskSummaryIcon({
  summaries,
  expanded,
  selected,
}: {
  summaries: RiskTypeSummary[];
  expanded: boolean;
  selected: boolean;
}) {
  const dominant = summaries[0];
  const dominantTheme = RISK_TYPE_THEME[dominant.type];
  const size = selected || expanded ? 20 : 17;
  const width = expanded ? 132 : size;
  const height = expanded ? 62 : size;
  const itemsHtml = summaries.map(summary => {
    const theme = RISK_TYPE_THEME[summary.type];
    return `
      <span class="risk-summary-marker__item" title="${theme.label}: ${summary.count}">
        <span class="risk-summary-marker__mini-dot" style="background:${theme.color}">${theme.icon}</span>
        <span class="risk-summary-marker__count">${summary.count}</span>
      </span>
    `;
  }).join('');

  return L.divIcon({
    className: 'risk-summary-marker',
    html: `
      <div class="risk-summary-marker__wrap ${expanded ? 'is-expanded' : ''}">
        <div class="risk-summary-marker__main" style="width:${size}px;height:${size}px;background:${dominantTheme.color};box-shadow:0 0 0 3px ${dominantTheme.bg},0 2px 8px rgba(15,26,20,0.22)">
          <span>${dominantTheme.icon}</span>
        </div>
        ${expanded ? `<div class="risk-summary-marker__dropdown">${itemsHtml}</div>` : ''}
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, expanded ? 10 : size / 2],
  });
}

function CampusOsmOverlay({
  campusGeoJson,
  selectedBlockId,
  onSelectBlock,
}: {
  campusGeoJson: CampusMapGeoJSON | null;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
}) {
  if (!campusGeoJson) return null;

  return (
    <GeoJSON
      data={campusGeoJson}
      interactive
      onEachFeature={(feature, layer) => {
        const block = getBlockForMapFeature(feature as CampusMapFeature);
        if (!block) return;

        layer.on({
          click: () => onSelectBlock(block.id),
        });
      }}
      style={feature => {
        const properties = feature?.properties as CampusMapFeature['properties'] | undefined;
        const block = feature ? getBlockForMapFeature(feature as CampusMapFeature) : null;
        const isSelected = block?.id === selectedBlockId;

        if (properties?.kind === 'building') {
          if (block) {
            return {
              className: 'campus-block-perimeter',
              color: isSelected ? '#1a5c38' : '#795548',
              fillColor: isSelected ? '#e8f5ee' : '#d5cbc3',
              fillOpacity: isSelected ? 0.62 : 0.5,
              opacity: 0.9,
              weight: isSelected ? 2.2 : 1.5,
            };
          }

          return {
            color: '#9c8f86',
            fillColor: '#d5cbc3',
            fillOpacity: 0.42,
            opacity: 0.58,
            weight: 1,
          };
        }
        if (properties?.kind === 'path') {
          return {
            color: properties.highway === 'footway' || properties.highway === 'path' ? '#b97963' : '#9a9a9a',
            opacity: properties.highway === 'footway' || properties.highway === 'path' ? 0.4 : 0.2,
            weight: properties.highway === 'footway' || properties.highway === 'path' ? 1.2 : 1,
            dashArray: properties.highway === 'footway' || properties.highway === 'path' ? '4 5' : undefined,
          };
        }
        return {
          color: '#9dbf98',
          fillColor: '#b9d8b2',
          fillOpacity: 0.12,
          opacity: 0.16,
          weight: 1,
        };
      }}
    />
  );
}

function MapFocus({ target }: { target: MapFocusTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    map.flyTo(target.position, target.zoom ?? MAP_MAX_ZOOM, {
      animate: true,
      duration: 0.8,
    });
  }, [map, target]);

  return null;
}

function CampusMap({
  selectedBlockId,
  onSelectBlock,
  focusTarget,
  selectedRiskType,
}: {
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  focusTarget: MapFocusTarget | null;
  selectedRiskType: RiskTypeKey | null;
}) {
  const [expandedRiskBlockId, setExpandedRiskBlockId] = useState<string | null>(null);
  const [campusGeoJson, setCampusGeoJson] = useState<CampusMapGeoJSON | null>(null);
  const locationMarkers = getLocationMarkers(campusGeoJson);

  useEffect(() => {
    let active = true;

    fetch(`${import.meta.env.BASE_URL}maps/campus.geojson`)
      .then(response => response.ok ? response.json() : null)
      .then((data: CampusMapGeoJSON | null) => {
        if (active) setCampusGeoJson(data);
      })
      .catch(() => {
        if (active) setCampusGeoJson(null);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={CAMPUS_CENTER}
        zoom={MAP_INITIAL_ZOOM}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', background: '#eef1f4' }}
        aria-label="Mapa real do campus da UFCG com pontos de risco monitorados"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxNativeZoom={MAP_MAX_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          noWrap
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CampusOsmOverlay
          campusGeoJson={campusGeoJson}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
        />
        <MapFocus target={focusTarget} />

        {locationMarkers.map(location => {
          const block = CAMPUS_DATA.find(item => item.id === location.blockId);
          if (!block) return null;

          const risks = filterRisksByType(getActiveRisksFromBlock(block), selectedRiskType);
          const summaries = getRiskTypeSummaries(risks);
          if (summaries.length === 0) return null;

          const isExpanded = expandedRiskBlockId === block.id;
          const isSelected = selectedBlockId === block.id;

          return (
            <Marker
              key={`${location.id}-risk-summary`}
              position={location.position}
              icon={createRiskSummaryIcon({
                summaries,
                expanded: isExpanded,
                selected: isSelected,
              })}
              zIndexOffset={900}
              eventHandlers={{
                click: event => {
                  L.DomEvent.stopPropagation(event);
                  setExpandedRiskBlockId(current => current === block.id ? null : block.id);
                },
              }}
            />
          );
        })}
      </MapContainer>

      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: 'rgba(255,255,255,0.94)', borderRadius: 9, padding: '8px 12px',
        border: '1px solid #e2e8e4', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        fontSize: 11, fontWeight: 650, color: '#2d4a38', pointerEvents: 'none',
      }}>
        Campus Campina Grande · Setor CCT
      </div>
    </div>
  );
}

// ─── Block Panel ──────────────────────────────────────────────────────────────

function BlockPanel({
  block,
  onClose,
  onSelectRoom,
  selectedRoomId,
  compact = false,
  narrow = false,
}: {
  block: Block;
  onClose: () => void;
  onSelectRoom: (room: Room, floorName: string) => void;
  selectedRoomId: string | null;
  compact?: boolean;
  narrow?: boolean;
}) {
  const stats = getBlockStats(block);
  const dominantRisk = getDominantRisk(getActiveRisksFromBlock(block));
  const [openFloors, setOpenFloors] = useState<Set<string>>(new Set(block.floors.map(f => f.id)));

  const toggleFloor = (id: string) => {
    setOpenFloors(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="panel-enter" style={{
      width: compact ? '100%' : narrow ? 320 : 360,
      height: compact ? '44vh' : '100%',
      maxHeight: compact ? '52vh' : undefined,
      minHeight: compact ? 260 : undefined,
      background: 'white',
      borderRight: compact ? 'none' : '1px solid #e2e8e4',
      borderTop: compact ? '1px solid #e2e8e4' : 'none',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: compact ? '0 -8px 24px rgba(15,26,20,0.12)' : undefined,
      zIndex: compact ? 10 : undefined,
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', borderBottom: '1px solid #e2e8e4', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <Breadcrumb parts={[
            { label: 'Campus', onClick: onClose },
            { label: block.shortName },
          ]} />
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: '#6b7f74', fontSize: 18, lineHeight: 1, padding: '0 2px',
          }}>×</button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Sans, Inter, sans-serif', color: '#0f1a14' }}>{block.name}</div>
          <div style={{ fontSize: 12, color: '#6b7f74', marginTop: 2 }}>{block.fullName}</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Pavimentos', value: stats.floors },
            { label: 'Ambientes', value: stats.rooms },
            { label: 'Riscos ativos', value: stats.total },
          ].map(s => (
            <div key={s.label} style={{
              background: '#f5f6f8', borderRadius: 8, padding: '8px 10px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f1a14' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6b7f74', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {block.description && (
          <div style={{
            marginTop: 12,
            border: '1px solid #e2e8e4',
            background: '#f9fbf9',
            borderRadius: 8,
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 10,
                  color: '#795548',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 3,
                }}>
                  Informações do bloco
                </div>
                <div style={{
                  fontSize: 13,
                  color: '#0f1a14',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  fontFamily: 'DM Sans, Inter, sans-serif',
                }}>
                  {block.fullName}
                </div>
              </div>
              <span style={{
                flexShrink: 0,
                padding: '3px 7px',
                borderRadius: 999,
                background: '#f7f1ee',
                color: '#795548',
                fontSize: 10,
                fontWeight: 800,
                border: '1px solid #eadbd3',
              }}>
                {block.shortName}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 6,
              marginTop: 9,
            }}>
              {[
                { label: 'Campus', value: block.campus },
                { label: 'Centro', value: block.center },
                { label: 'Unidade', value: block.unit },
                { label: 'Prédio', value: block.name },
              ].filter((item): item is { label: string; value: string } => Boolean(item.value)).map(item => (
                <div key={item.label} style={{
                  minWidth: 0,
                  background: 'white',
                  border: '1px solid #edf1ee',
                  borderRadius: 7,
                  padding: '6px 7px',
                }}>
                  <div style={{ fontSize: 9, color: '#6b7f74', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.label}
                  </div>
                  <div style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: '#0f1a14',
                    fontWeight: 700,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 9 }}>
              <div>
                <div style={{ fontSize: 9, color: '#6b7f74', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Descrição
                </div>
                <div style={{
                  marginTop: 2,
                  fontSize: 11,
                  color: '#0f1a14',
                  lineHeight: 1.45,
                  maxHeight: 64,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}>
                  {block.description}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk distribution */}
        {stats.total > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {stats.critical > 0 && <RiskBadge level="critico" />}
            {stats.high > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: levelColor('alto'), fontWeight: 600 }}>
              <span>▲</span>{stats.high} alto{stats.high > 1 ? 's' : ''}
            </span>}
            {stats.moderate > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: levelColor('moderado'), fontWeight: 600 }}>
              <span>◆</span>{stats.moderate} moderado{stats.moderate > 1 ? 's' : ''}
            </span>}
            {stats.low > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: levelColor('baixo'), fontWeight: 600 }}>
              <span>●</span>{stats.low} baixo{stats.low > 1 ? 's' : ''}
            </span>}
            {dominantRisk && <RiskBadge level={dominantRisk.level} category={dominantRisk.category} />}
          </div>
        )}
      </div>

      {/* Floors accordion */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {block.floors.map(floor => {
          const isOpen = openFloors.has(floor.id);
          return (
            <div key={floor.id}>
              {/* Floor header */}
              <button
                onClick={() => toggleFloor(floor.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  color: '#0f1a14', fontWeight: 600, fontSize: 13,
                  borderBottom: '1px solid #f0f2f4',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6, background: '#f0f4f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#1a5c38', fontWeight: 700,
                  }}>
                    {floor.name.charAt(0)}
                  </span>
                  {floor.name}
                </span>
                <span style={{ fontSize: 12, color: '#6b7f74', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{floor.rooms.length} amb.</span>
                  <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : '' }}>▾</span>
                </span>
              </button>

              {/* Rooms */}
              {isOpen && (
                <div style={{ padding: '4px 12px 4px' }}>
                  {floor.rooms.map(room => {
                    const rs = getRoomStats(room);
                    const dominantRoomRisk = getDominantRisk(room.risks.filter(r => r.status !== 'resolvido' && r.status !== 'rejeitado'));
                    const isSelected = selectedRoomId === room.id;
                    return (
                      <button
                        key={room.id}
                        onClick={() => onSelectRoom(room, floor.name)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 10px', background: isSelected ? '#e8f5ee' : 'none',
                          border: 'none', borderRadius: 8,
                          cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f5f6f8'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#1a5c38' : '#0f1a14', marginBottom: 1 }}>
                            {room.code}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7f74' }}>{roomTypeLabel(room.type)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                          {rs.total === 0 ? (
                            <span style={{ fontSize: 11, color: '#22a861', fontWeight: 500 }}>Sem riscos</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f1a14' }}>
                                {rs.total} risco{rs.total > 1 ? 's' : ''}
                              </span>
                              <RiskBadge level={rs.maxLevel!} category={dominantRoomRisk?.category} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Room Detail Panel ────────────────────────────────────────────────────────

function RoomPanel({
  room,
  floorName,
  block,
  onBack,
  onClose,
  onSelectRisk,
  selectedRiskId,
  compact = false,
  narrow = false,
}: {
  room: Room;
  floorName: string;
  block: Block;
  onBack: () => void;
  onClose: () => void;
  onSelectRisk: (risk: Risk) => void;
  selectedRiskId: string | null;
  compact?: boolean;
  narrow?: boolean;
}) {
  const rs = getRoomStats(room);
  const activeRisks = room.risks.filter(r => r.status !== 'resolvido' && r.status !== 'rejeitado');
  const dominantRisk = getDominantRisk(activeRisks);

  return (
    <div className="panel-enter" style={{
      width: compact ? '100%' : narrow ? 340 : 400,
      height: compact ? '45vh' : '100%',
      maxHeight: compact ? '54vh' : undefined,
      minHeight: compact ? 280 : undefined,
      background: 'white',
      borderRight: compact ? 'none' : '1px solid #e2e8e4',
      borderTop: compact ? '1px solid #e2e8e4' : 'none',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      boxShadow: compact ? '0 -8px 24px rgba(15,26,20,0.12)' : undefined,
      zIndex: compact ? 10 : undefined,
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e2e8e4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            aria-label="Voltar para o bloco"
            title="Voltar para o bloco"
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              border: '1px solid #e2e8e4',
              background: 'white',
              color: '#1a5c38',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 800,
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8f5ee')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            ←
          </button>
          <Breadcrumb parts={[
            { label: 'Campus', onClick: onBack },
            { label: block.shortName, onClick: onBack },
            { label: floorName, onClick: onBack },
            { label: room.code },
          ]} />
          <button
            onClick={onClose}
            aria-label="Fechar aba"
            title="Fechar aba"
            style={{
              marginLeft: 'auto',
              width: 30,
              height: 30,
              borderRadius: 7,
              border: 'none',
              background: '#f0f2f4',
              color: '#6b7f74',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e2e8e4')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f0f2f4')}
          >
            ×
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Sans, Inter, sans-serif' }}>{room.code}</div>
          <div style={{ fontSize: 12, color: '#6b7f74', marginTop: 2 }}>{roomTypeLabel(room.type)}</div>
        </div>

        {rs.total > 0 ? (
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0f1a14' }}>{rs.total} riscos ativos</span>
            <span style={{ color: '#e2e8e4' }}>·</span>
            {dominantRisk && <RiskBadge level={dominantRisk.level} category={dominantRisk.category} size="md" />}
            {rs.lastUpdate && <span style={{ fontSize: 11, color: '#6b7f74', marginLeft: 4 }}>Atualizado {rs.lastUpdate}</span>}
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 13, color: '#22a861', fontWeight: 600 }}>
            ✓ Nenhum risco ativo neste ambiente
          </div>
        )}
      </div>

      {/* Risk cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {(room.description || room.activities || room.exposureGroup) && (
          <div style={{
            border: '1px solid #e2e8e4',
            background: '#f9fbf9',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 10,
                  color: '#795548',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 3,
                }}>
                  Informações da sala
                </div>
                <div style={{
                  fontSize: 14,
                  color: '#0f1a14',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  fontFamily: 'DM Sans, Inter, sans-serif',
                }}>
                  {room.name}
                </div>
              </div>
              <span style={{
                flexShrink: 0,
                padding: '3px 7px',
                borderRadius: 999,
                background: '#f7f1ee',
                color: '#795548',
                fontSize: 10,
                fontWeight: 800,
                border: '1px solid #eadbd3',
              }}>
                {floorName}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 6,
              marginTop: 10,
            }}>
              {[
                { label: 'Tipo', value: roomTypeLabel(room.type) },
                { label: 'Público', value: room.exposureGroup },
              ].filter((item): item is { label: string; value: string } => Boolean(item.value)).map(item => (
                <div key={item.label} style={{
                  minWidth: 0,
                  background: 'white',
                  border: '1px solid #edf1ee',
                  borderRadius: 7,
                  padding: '6px 7px',
                }}>
                  <div style={{ fontSize: 9, color: '#6b7f74', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.label}
                  </div>
                  <div style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: '#0f1a14',
                    fontWeight: 700,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {room.activities && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, color: '#6b7f74', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Atividades
                </div>
                <div style={{ marginTop: 2, fontSize: 11, color: '#0f1a14', lineHeight: 1.45 }}>
                  {room.activities}
                </div>
              </div>
            )}

            {room.description && (
              <div style={{ marginTop: 9 }}>
                <div style={{ fontSize: 9, color: '#6b7f74', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Descrição da sala
                </div>
                <div style={{
                  marginTop: 2,
                  fontSize: 11,
                  color: '#0f1a14',
                  lineHeight: 1.45,
                  maxHeight: 72,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}>
                  {room.description}
                </div>
              </div>
            )}
          </div>
        )}

        {activeRisks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7f74', fontSize: 13 }}>
            Este ambiente não possui riscos ativos registrados.
          </div>
        )}
        {activeRisks.map(risk => {
          const isSelected = selectedRiskId === risk.id;
          const theme = riskTypeTheme(risk.category);
          return (
            <button
              key={risk.id}
              onClick={() => onSelectRisk(risk)}
              style={{
                width: '100%', textAlign: 'left', background: isSelected ? theme.bg : 'white',
                border: `1.5px solid ${isSelected ? theme.color : '#e2e8e4'}`,
                borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                cursor: 'pointer', display: 'block',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.borderColor = theme.border; (e.currentTarget as HTMLElement).style.background = theme.bg; } }}
              onMouseLeave={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8e4'; (e.currentTarget as HTMLElement).style.background = 'white'; } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1a14', lineHeight: 1.4, flex: 1 }}>
                  {risk.title}
                </div>
                <RiskBadge level={risk.level} category={risk.category} />
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#6b7f74' }}>
                {risk.category}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <StatusBadge status={risk.status} />
                <span style={{ fontSize: 11, color: '#6b7f74' }}>{risk.updatedAt}</span>
              </div>
            </button>
          );
        })}

        {room.risks.filter(r => r.status === 'resolvido' || r.status === 'rejeitado').length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#6b7f74', textAlign: 'center' }}>
            + {room.risks.filter(r => r.status === 'resolvido' || r.status === 'rejeitado').length} risco(s) resolvido(s) não exibido(s)
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Risk Detail Drawer ───────────────────────────────────────────────────────

function RiskDrawer({
  risk,
  breadcrumb,
  onClose,
  compact = false,
  narrow = false,
}: {
  risk: Risk;
  breadcrumb: string;
  onClose: () => void;
  compact?: boolean;
  narrow?: boolean;
}) {
  const typeTheme = riskTypeTheme(risk.category);
  const riskColor = typeTheme.color;
  const riskScore = risk.severity * risk.probability;

  return (
    <div className="drawer-enter" style={{
      width: compact ? '100%' : narrow ? 330 : 380,
      height: compact ? '42vh' : '100%',
      maxHeight: compact ? '50vh' : undefined,
      minHeight: compact ? 260 : undefined,
      background: 'white',
      borderRight: compact ? 'none' : '1px solid #e2e8e4',
      borderTop: compact ? '1px solid #e2e8e4' : 'none',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      boxShadow: compact ? '0 -8px 24px rgba(15,26,20,0.12)' : undefined,
      zIndex: compact ? 12 : 5,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #e2e8e4',
        background: `linear-gradient(135deg, ${riskColor}08, transparent)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <RiskBadge level={risk.level} category={risk.category} size="md" />
          <button onClick={onClose} style={{
            border: 'none', background: '#f0f2f4', cursor: 'pointer', borderRadius: 6,
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#6b7f74',
          }}>×</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, Inter, sans-serif', lineHeight: 1.3 }}>
          {risk.title}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: '#6b7f74' }}>{breadcrumb}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <StatusBadge status={risk.status} />
          <span style={{ fontSize: 11, color: '#6b7f74' }}>· {risk.category}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Risk matrix */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f4' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7f74', marginBottom: 6 }}>Severidade</div>
              <ScoreBar value={risk.severity} color={riskColor} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1a14', marginTop: 4 }}>{risk.severity}/5</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7f74', marginBottom: 6 }}>Probabilidade</div>
              <ScoreBar value={risk.probability} color={riskColor} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1a14', marginTop: 4 }}>{risk.probability}/5</div>
            </div>
          </div>

          {/* Risk score */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: typeTheme.bg, borderRadius: 10, padding: '12px 14px',
            border: `1px solid ${typeTheme.border}`,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: riskColor, fontFamily: 'DM Sans, Inter, sans-serif', lineHeight: 1 }}>
                {riskScore}
              </div>
              <div style={{ fontSize: 10, color: '#6b7f74', marginTop: 1 }}>R = S × P</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: riskColor }}>
                {typeTheme.icon} {typeTheme.label.toUpperCase()} · {levelLabel(risk.level).toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: '#6b7f74', marginTop: 2 }}>Tipo ocupacional e nível calculado</div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f4' }}>
          {[
            { label: 'Perigo identificado', value: risk.hazard },
            { label: 'Evento de risco', value: risk.riskEvent },
            { label: 'Consequência possível', value: risk.consequence },
            { label: 'Público exposto', value: risk.exposedPublic },
            { label: 'Circulação / Exposição', value: risk.circulation },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, color: '#0f1a14', lineHeight: 1.5 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f4' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Descrição
          </div>
          <div style={{ fontSize: 13, color: '#0f1a14', lineHeight: 1.6 }}>{risk.description}</div>
        </div>

        {/* Flags */}
        {risk.flags.length > 0 && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f4' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Sinalizadores
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {risk.flags.map(flag => (
                <span key={flag} style={{
                  background: '#e8f5ee', color: '#1a5c38', borderRadius: 20, padding: '3px 10px',
                  fontSize: 11, fontWeight: 600, border: '1px solid #c5e0cd',
                }}>{flag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Dates */}
        <div style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#6b7f74', marginBottom: 2 }}>Registrado em</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1a14' }}>{risk.registeredAt}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#6b7f74', marginBottom: 2 }}>Última atualização</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1a14' }}>{risk.updatedAt}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Engineer Dashboard ───────────────────────────────────────────────────────

const ENGINEER_RISKS = ALL_RISKS.slice(0, 8);
const ENGINEER_RISK_FULL = ALL_RISKS.find(r => r.id === 'r011')!;
const DASH_BLOCKS = ['Todos', 'CAA', 'CCT', 'CEEI', 'BCx', 'RU'];
const DASH_LEVELS = ['Todos', 'Crítico', 'Alto', 'Moderado', 'Baixo'];
const DASH_STATUS = ['Todos', 'Em avaliação', 'Validado', 'Resolvido'];

function EngineerDashboard() {
  const [activeNav, setActiveNav] = useState('relatos');
  const [selectedReport, setSelectedReport] = useState<Risk>(ENGINEER_RISK_FULL || ENGINEER_RISKS[0]);
  const [filterBlock, setFilterBlock] = useState('Todos');
  const [filterLevel, setFilterLevel] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchQ, setSearchQ] = useState('');

  const navItems = [
    { id: 'overview', icon: '⊞', label: 'Visão geral' },
    { id: 'relatos', icon: '◎', label: 'Relatos pendentes' },
    { id: 'ativos', icon: '▲', label: 'Riscos ativos' },
    { id: 'locais', icon: '⌂', label: 'Locais do campus' },
    { id: 'historico', icon: '◷', label: 'Histórico' },
  ];

  const kpis = [
    { label: 'Relatos pendentes', value: 5, icon: '◎', color: '#d98a00', bg: '#fff8e6' },
    { label: 'Riscos validados', value: 9, icon: '✓', color: '#1a5c38', bg: '#edfaf3' },
    { label: 'Riscos críticos', value: 1, icon: '⬟', color: '#c0280e', bg: '#fff0ee' },
    { label: 'Resolvidos no mês', value: 3, icon: '●', color: '#4b5563', bg: '#f3f4f6' },
  ];

  const filteredRisks = ENGINEER_RISKS.filter(r => {
    if (searchQ && !r.title.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filterLevel !== 'Todos' && levelLabel(r.level).toLowerCase() !== filterLevel.toLowerCase()) return false;
    if (filterStatus !== 'Todos' && statusLabel(r.status).toLowerCase() !== filterStatus.toLowerCase()) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f6f8' }}>
      {/* Sidebar */}
      <div style={{
        width: 220, background: '#0f3824', display: 'flex', flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo area */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #ffffff18' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', fontFamily: 'DM Sans, Inter, sans-serif', letterSpacing: '-0.02em' }}>
            Mapa Digital de Riscos
          </div>
          <div style={{ fontSize: 10, color: '#7ab897', marginTop: 2, fontWeight: 500 }}>Smart Campus — UFCG</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          <div style={{ fontSize: 9, color: '#5a8c70', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px', marginBottom: 6 }}>
            Painel técnico
          </div>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeNav === item.id ? '#1a5c38' : 'transparent',
                color: activeNav === item.id ? '#ffffff' : '#9dc8af',
                fontSize: 13, fontWeight: activeNav === item.id ? 600 : 400,
                textAlign: 'left', marginBottom: 2,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (activeNav !== item.id) (e.currentTarget as HTMLElement).style.background = '#ffffff12'; }}
              onMouseLeave={e => { if (activeNav !== item.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14, opacity: 0.9 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Profile */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #ffffff18' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: '#1a5c38',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>EC</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>Eng. Carlos Silva</div>
              <div style={{ fontSize: 10, color: '#7ab897' }}>SIASS · UFCG</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '16px 24px', background: 'white', borderBottom: '1px solid #e2e8e4',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'DM Sans, Inter, sans-serif' }}>Central de Riscos</div>
            <div style={{ fontSize: 12, color: '#6b7f74', marginTop: 1 }}>Triagem e análise de registros · Campus UFCG</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{
              padding: '7px 16px', borderRadius: 8, border: '1.5px solid #1a5c38',
              background: 'white', color: '#1a5c38', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Exportar relatório</button>
            <button style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              background: '#1a5c38', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>+ Novo registro</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* KPIs */}
          <div style={{ padding: '20px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {kpis.map(kpi => (
              <div key={kpi.label} style={{
                background: 'white', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #e2e8e4', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: kpi.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  <span style={{ color: kpi.color }}>{kpi.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f1a14', fontFamily: 'DM Sans, Inter, sans-serif', lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: '#6b7f74', marginTop: 3 }}>{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div style={{ padding: '14px 24px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar relato..."
              style={{
                padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e2e8e4',
                fontSize: 12, outline: 'none', background: 'white', minWidth: 180,
              }}
            />
            {[
              { label: 'Bloco', options: DASH_BLOCKS, value: filterBlock, set: setFilterBlock },
              { label: 'Nível', options: DASH_LEVELS, value: filterLevel, set: setFilterLevel },
              { label: 'Status', options: DASH_STATUS, value: filterStatus, set: setFilterStatus },
            ].map(f => (
              <select
                key={f.label}
                value={f.value}
                onChange={e => f.set(e.target.value)}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8e4',
                  fontSize: 12, outline: 'none', background: 'white', cursor: 'pointer',
                }}
              >
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7f74' }}>
              {filteredRisks.length} registro{filteredRisks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Master-detail */}
          <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', padding: '0 24px 20px' }}>
            {/* List */}
            <div style={{
              width: 340, flexShrink: 0, background: 'white', borderRadius: '12px 0 0 12px',
              border: '1px solid #e2e8e4', borderRight: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f2f4', fontSize: 11, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Registros
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredRisks.map(risk => {
                  const isSelected = selectedReport?.id === risk.id;
                  const theme = riskTypeTheme(risk.category);
                  return (
                    <button
                      key={risk.id}
                      onClick={() => setSelectedReport(risk)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '11px 14px',
                        background: isSelected ? theme.bg : 'white',
                        border: 'none', borderBottom: '1px solid #f0f2f4',
                        cursor: 'pointer', display: 'block',
                        borderLeft: isSelected ? `3px solid ${theme.color}` : '3px solid transparent',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = theme.bg; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'white'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1a14', lineHeight: 1.4, flex: 1 }}>{risk.title}</div>
                        <RiskBadge level={risk.level} category={risk.category} />
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7f74', marginTop: 3 }}>{risk.category}</div>
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <StatusBadge status={risk.status} />
                        <span style={{ fontSize: 10, color: '#6b7f74' }}>{risk.updatedAt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Analysis panel */}
            {selectedReport && (
              <div style={{
                flex: 1, background: 'white', borderRadius: '0 12px 12px 0',
                border: '1px solid #e2e8e4', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
                {/* Panel header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8e4', background: riskTypeTheme(selectedReport.category).bg }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Analisar relato
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f1a14', fontFamily: 'DM Sans, Inter, sans-serif', lineHeight: 1.3 }}>
                        {selectedReport.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7f74', marginTop: 3 }}>{selectedReport.category}</div>
                    </div>
                    <RiskBadge level={selectedReport.level} category={selectedReport.category} size="md" />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                  {/* Description */}
                  <div style={{ fontSize: 13, color: '#0f1a14', lineHeight: 1.6, marginBottom: 16, padding: '12px 14px', background: '#f9fbf9', borderRadius: 8, border: '1px solid #e8f5ee' }}>
                    {selectedReport.description}
                  </div>

                  {/* Grid of fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    {[
                      { label: 'Perigo identificado', value: selectedReport.hazard },
                      { label: 'Evento de risco', value: selectedReport.riskEvent },
                      { label: 'Consequência', value: selectedReport.consequence },
                      { label: 'Público exposto', value: selectedReport.exposedPublic },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{f.label}</div>
                        <div style={{ fontSize: 12, color: '#0f1a14', lineHeight: 1.5 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Risk matrix */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#6b7f74', marginBottom: 4 }}>Severidade</div>
                      <ScoreBar value={selectedReport.severity} color={riskTypeTheme(selectedReport.category).color} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1a14', marginTop: 4 }}>{selectedReport.severity}/5</div>
                    </div>
                    <div style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#6b7f74', marginBottom: 4 }}>Probabilidade</div>
                      <ScoreBar value={selectedReport.probability} color={riskTypeTheme(selectedReport.category).color} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1a14', marginTop: 4 }}>{selectedReport.probability}/5</div>
                    </div>
                    <div style={{
                      background: riskTypeTheme(selectedReport.category).bg, borderRadius: 8, padding: '10px 12px',
                      border: `1px solid ${riskTypeTheme(selectedReport.category).border}`, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: riskTypeTheme(selectedReport.category).color, fontFamily: 'DM Sans, Inter, sans-serif', lineHeight: 1 }}>
                        {selectedReport.riskScore}
                      </div>
                      <div style={{ fontSize: 9, color: '#6b7f74', marginTop: 1 }}>R = S × P</div>
                      <RiskBadge level={selectedReport.level} category={selectedReport.category} />
                    </div>
                  </div>

                  {/* Flags */}
                  {selectedReport.flags.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Sinalizadores</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedReport.flags.map(flag => (
                          <span key={flag} style={{
                            background: '#e8f5ee', color: '#1a5c38', borderRadius: 20, padding: '3px 10px',
                            fontSize: 11, fontWeight: 600, border: '1px solid #c5e0cd',
                          }}>{flag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div style={{ background: '#f0f9f4', borderRadius: 8, padding: '12px 14px', border: '1px solid #c5e0cd' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#1a5c38', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      Recomendação preventiva
                    </div>
                    <div style={{ fontSize: 12, color: '#0f1a14', lineHeight: 1.6 }}>
                      Isolar área imediatamente e notificar equipe de manutenção elétrica. Emitir relatório para Prefeitura do Campus com urgência. Sinalizar área com fita de segurança.
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                <div style={{
                  padding: '12px 20px', borderTop: '1px solid #e2e8e4',
                  display: 'flex', gap: 8, alignItems: 'center', background: '#f9fbf9',
                }}>
                  <button style={{
                    padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8e4',
                    background: 'white', color: '#c0280e', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Rejeitar</button>
                  <button style={{
                    padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8e4',
                    background: 'white', color: '#6b7f74', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Solicitar ajuste</button>
                  <button style={{
                    padding: '8px 14px', borderRadius: 8, border: '1.5px solid #1a5c38',
                    background: 'white', color: '#1a5c38', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Editar classificação</button>
                  <button style={{
                    marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: '#1a5c38', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>✓ Validar e publicar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function MapLegend({
  compact = false,
  selectedType,
  onSelectType,
}: {
  compact?: boolean;
  selectedType: RiskTypeKey | null;
  onSelectType: (type: RiskTypeKey | null) => void;
}) {
  const types: RiskTypeKey[] = ['fisico', 'quimico', 'biologico', 'ergonomico', 'acidente'];
  return (
    <div className="map-risk-legend" style={{
      position: 'absolute',
      bottom: compact ? 12 : 20,
      right: compact ? 12 : 20,
      background: 'white', borderRadius: 10, padding: compact ? '8px 10px' : '10px 14px',
      border: '1px solid #e2e8e4', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      zIndex: 800,
      maxWidth: compact ? 148 : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: compact ? 6 : 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Tipo de risco
        </div>
        {selectedType && (
          <button
            onClick={() => onSelectType(null)}
            title="Limpar filtro"
            style={{
              border: 'none',
              background: '#f0f2f4',
              color: '#6b7f74',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 11,
              height: 20,
              lineHeight: '20px',
              padding: '0 6px',
            }}
          >
            ×
          </button>
        )}
      </div>
      {types.map(type => {
        const theme = RISK_TYPE_THEME[type];
        const isActive = selectedType === type;
        const isDimmed = Boolean(selectedType && !isActive);
        return (
        <button
          key={type}
          onClick={() => onSelectType(isActive ? null : type)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: compact ? 3 : 4,
            border: `1px solid ${isActive ? theme.border : 'transparent'}`,
            borderRadius: 6,
            background: isActive ? theme.bg : 'transparent',
            cursor: 'pointer',
            opacity: isDimmed ? 0.42 : 1,
            padding: compact ? '3px 4px' : '4px 5px',
            textAlign: 'left',
          }}
        >
          <span style={{ color: theme.color, fontSize: 10 }}>{theme.icon}</span>
          <span style={{ fontSize: compact ? 10 : 11, color: '#0f1a14', fontWeight: isActive ? 800 : 500 }}>{theme.label}</span>
        </button>
        );
      })}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

type AppView = 'campus' | 'engineer';

function useViewportFlags() {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    isMobile: width < 760,
    isTablet: width >= 760 && width < 1024,
  };
}

type SearchResult = {
  id: string;
  type: 'block' | 'room' | 'map';
  label: string;
  subtitle: string;
  block?: Block;
  room?: Room;
  floorName?: string;
  position: [number, number] | null;
};

export default function App() {
  const { isMobile, isTablet } = useViewportFlags();
  const [view, setView] = useState<AppView>('campus');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<{ room: Room; floorName: string } | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [searchVal, setSearchVal] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(null);
  const [mapNamedPlaces, setMapNamedPlaces] = useState<MapNamedPlace[]>([]);
  const [selectedRiskType, setSelectedRiskType] = useState<RiskTypeKey | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`${import.meta.env.BASE_URL}maps/campus.geojson`)
      .then(response => response.ok ? response.json() : null)
      .then((data: CampusMapGeoJSON | null) => {
        if (!active || !data) return;

        const names = new Map<string, MapNamedPlace>();
        data.features.forEach(feature => {
          const name = feature.properties.name;
          if (!name) return;

          const position = getFeatureCenter(feature);
          if (!position) return;

          const key = normalizeText(name);
          if (names.has(key)) return;

          names.set(key, {
            id: feature.properties.osmId ? `osm-${feature.properties.osmId}` : key,
            name,
            kind: feature.properties.kind,
            position,
            blockId: getBlockForMapFeature(feature)?.id,
          });
        });

        setMapNamedPlaces([...names.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (active) setMapNamedPlaces([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const allSearchResults: SearchResult[] = CAMPUS_DATA.flatMap(block => {
    const blockPosition = mapNamedPlaces.find(place => place.blockId === block.id)?.position ?? getBlockCoordinate(block);
    const blockResult: SearchResult = {
      id: block.id,
      type: 'block',
      label: block.name,
      subtitle: block.fullName,
      block,
      position: blockPosition,
    };

    const roomResults = block.floors.flatMap(floor =>
      floor.rooms.map(room => ({
        id: room.id,
        type: 'room' as const,
        label: room.name,
        subtitle: `${block.shortName} · ${floor.name}`,
        block,
        room,
        floorName: floor.name,
        position: getRoomCoordinate(room, block),
      }))
    );

    return [blockResult, ...roomResults];
  });

  const mapSearchResults: SearchResult[] = mapNamedPlaces
    .filter(place => !place.blockId)
    .map(place => ({
      id: place.id,
      type: 'map',
      label: place.name,
      subtitle: place.kind === 'building' ? 'Nome do prédio no mapa' : 'Nome do mapa',
      position: place.position,
    }));

  const query = normalizeText(searchVal.trim());
  const searchResults = query.length >= 2
    ? [...allSearchResults, ...mapSearchResults]
      .filter(result => normalizeText(`${result.label} ${result.subtitle} ${result.block?.name ?? ''} ${result.block?.fullName ?? ''}`).includes(query))
      .slice(0, 8)
    : [];

  const handleSelectBlock = (id: string) => {
    const block = CAMPUS_DATA.find(b => b.id === id) ?? null;
    setSelectedBlock(block);
    setSelectedRoom(null);
    setSelectedRisk(null);
  };

  const handleSelectRoom = (room: Room, floorName: string) => {
    setSelectedRoom({ room, floorName });
    setSelectedRisk(null);
  };

  const handleCloseBlock = () => {
    setSelectedBlock(null);
    setSelectedRoom(null);
    setSelectedRisk(null);
  };

  const handleBackToBlock = () => {
    setSelectedRoom(null);
    setSelectedRisk(null);
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    setView('campus');
    setSelectedBlock(result.block ?? null);
    setSelectedRoom(result.room && result.floorName ? { room: result.room, floorName: result.floorName } : null);
    setSelectedRisk(null);
    setSearchVal(result.label);
    setIsSearchOpen(false);

    if (result.position) {
      setFocusTarget({
        id: `${result.id}-${Date.now()}`,
        position: result.position,
        zoom: MAP_MAX_ZOOM,
      });
    }
  };

  if (view === 'engineer') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top nav */}
        <div style={{
          background: '#0f3824', height: 48, display: 'flex', alignItems: 'center',
          paddingInline: 20, gap: 4, flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'white', fontFamily: 'DM Sans, Inter, sans-serif', marginRight: 20 }}>
            MDR
          </div>
          {['Mapa do Campus', 'Painel Técnico'].map((label, i) => {
            const isActive = i === 1;
            return (
              <button
                key={label}
                onClick={() => setView(i === 0 ? 'campus' : 'engineer')}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: isActive ? 'white' : '#9dc8af', fontWeight: isActive ? 600 : 400,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <EngineerDashboard />
        </div>
      </div>
    );
  }

  const riskBreadcrumb = selectedBlock && selectedRoom
    ? `${selectedBlock.name} › ${selectedRoom.floorName} › ${selectedRoom.room.code}`
    : '';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top navigation bar */}
      <header style={{
        minHeight: isMobile ? 104 : 56,
        background: 'white', borderBottom: '1px solid #e2e8e4',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        padding: isMobile ? '10px 12px' : '0 20px',
        gap: isMobile ? 8 : 16,
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#1a5c38',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0,
          }}>M</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1a14', fontFamily: 'DM Sans, Inter, sans-serif', lineHeight: 1.2 }}>
              Mapa Digital de Riscos
            </div>
            <div style={{ fontSize: 10, color: '#6b7f74' }}>Smart Campus — UFCG</div>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 2, marginLeft: isMobile ? 'auto' : 8, order: isMobile ? 2 : 0 }}>
          {['Mapa do Campus', 'Painel Técnico'].map((label, i) => {
            const isActive = i === 0;
            return (
              <button
                key={label}
                onClick={() => setView(i === 0 ? 'campus' : 'engineer')}
                style={{
                  padding: isMobile ? '6px 9px' : '6px 14px', borderRadius: 6, border: 'none',
                  background: isActive ? '#e8f5ee' : 'transparent',
                  color: isActive ? '#1a5c38' : '#6b7f74', fontWeight: isActive ? 600 : 400,
                  fontSize: isMobile ? 12 : 13, cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{
          flex: isMobile ? '1 0 100%' : 1,
          maxWidth: isMobile ? 'none' : 480,
          marginInline: isMobile ? 0 : 'auto',
          position: 'relative',
          order: isMobile ? 3 : 0,
        }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#6b7f74' }}>⌕</span>
          <input
            value={searchVal}
            onChange={e => {
              setSearchVal(e.target.value);
              setIsSearchOpen(true);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchResults[0]) {
                handleSelectSearchResult(searchResults[0]);
              }
              if (e.key === 'Escape') {
                setIsSearchOpen(false);
              }
            }}
            placeholder="Buscar bloco, sala ou laboratório..."
            style={{
              width: '100%', padding: '8px 12px 8px 34px',
              borderRadius: 8, border: '1.5px solid #e2e8e4',
              fontSize: 13, outline: 'none', background: '#f5f6f8',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#1a5c38';
              setIsSearchOpen(true);
            }}
            onBlur={e => {
              e.target.style.borderColor = '#e2e8e4';
              window.setTimeout(() => setIsSearchOpen(false), 120);
            }}
          />
          {isSearchOpen && searchVal.trim().length >= 2 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 1200,
              background: 'white',
              border: '1px solid #e2e8e4',
              borderRadius: 9,
              boxShadow: '0 8px 24px rgba(15,26,20,0.14)',
              overflow: 'hidden',
            }}>
              {searchResults.length > 0 ? searchResults.map(result => (
                <button
                  key={result.id}
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    handleSelectSearchResult(result);
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderBottom: '1px solid #f0f2f4',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f8f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: result.type === 'block' ? '#e8f5ee' : result.type === 'room' ? '#f7f1ee' : '#edf5ff',
                    color: result.type === 'block' ? '#1a5c38' : result.type === 'room' ? '#795548' : '#1565c0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {result.type === 'block' ? 'B' : result.type === 'room' ? 'S' : 'M'}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: '#0f1a14', fontSize: 13, fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.label}
                    </span>
                    <span style={{ display: 'block', color: '#6b7f74', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.subtitle}
                    </span>
                  </span>
                </button>
              )) : (
                <div style={{ padding: '11px 12px', color: '#6b7f74', fontSize: 12 }}>
                  Nenhum bloco ou sala encontrado
                </div>
              )}
            </div>
          )}
        </div>

        {/* User profile */}
        <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#1a5c38',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer',
          }}>U</div>
          <div style={{ fontSize: 12, color: '#0f1a14', fontWeight: 500 }}>Visitante</div>
          <span style={{ fontSize: 10, color: '#c5d1cc' }}>▾</span>
        </div>
      </header>

      {/* Breadcrumb banner */}
      {selectedBlock && (
        <div style={{
          background: '#f0f4f1', borderBottom: '1px solid #e2e8e4',
          padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <Breadcrumb parts={[
            { label: 'Campus', onClick: handleCloseBlock },
            ...(selectedBlock ? [{ label: selectedBlock.name, onClick: selectedRoom ? handleBackToBlock : undefined }] : []),
            ...(selectedRoom ? [{ label: selectedRoom.floorName, onClick: handleBackToBlock }, { label: selectedRoom.room.code }] : []),
          ]} />
        </div>
      )}

      {/* Main area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Block panel */}
        {selectedBlock && !selectedRoom && (
          <BlockPanel
            block={selectedBlock}
            onClose={handleCloseBlock}
            onSelectRoom={handleSelectRoom}
            selectedRoomId={selectedRoom ? (selectedRoom as any).room.id : null}
            compact={isMobile}
            narrow={isTablet}
          />
        )}

        {/* Room panel */}
        {selectedBlock && selectedRoom && (
          <>
            {(!isMobile || !selectedRisk) && (
              <RoomPanel
                room={selectedRoom.room}
                floorName={selectedRoom.floorName}
                block={selectedBlock}
                onBack={handleBackToBlock}
                onClose={handleCloseBlock}
                onSelectRisk={setSelectedRisk}
                selectedRiskId={selectedRisk?.id ?? null}
                compact={isMobile}
                narrow={isTablet}
              />
            )}
            {/* Risk detail drawer */}
            {selectedRisk && (
              <RiskDrawer
                risk={selectedRisk}
                breadcrumb={riskBreadcrumb}
                onClose={() => setSelectedRisk(null)}
                compact={isMobile}
                narrow={isTablet}
              />
            )}
          </>
        )}

        {/* Map */}
        <div style={{
          flex: 1,
          minHeight: isMobile ? (selectedBlock ? '44vh' : 0) : undefined,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <CampusMap
            selectedBlockId={selectedBlock?.id ?? null}
            onSelectBlock={handleSelectBlock}
            focusTarget={focusTarget}
            selectedRiskType={selectedRiskType}
          />
          <MapLegend
            compact={isMobile || isTablet}
            selectedType={selectedRiskType}
            onSelectType={setSelectedRiskType}
          />

          {/* Campus summary overlay */}
          {!selectedBlock && (
            <div style={{
              position: 'absolute', top: isMobile ? 12 : 16, right: isMobile ? 12 : 16,
              background: 'white', borderRadius: 12, padding: '12px 16px',
              border: '1px solid #e2e8e4', boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              minWidth: isMobile ? 170 : 200,
              maxWidth: isMobile ? 210 : undefined,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7f74', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Visão geral do campus
              </div>
              {[
                { label: 'Blocos monitorados', value: CAMPUS_DATA.length },
                { label: 'Riscos ativos', value: ALL_RISKS.filter(r => r.status !== 'resolvido').length },
                { label: 'Riscos críticos', value: ALL_RISKS.filter(r => r.level === 'critico').length },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#6b7f74' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: '#0f1a14' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f2f4', fontSize: 11, color: '#6b7f74' }}>
                Clique em um bloco para explorar
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
