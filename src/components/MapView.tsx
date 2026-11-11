import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { useMemo, type RefObject } from 'react';
import MapGL, { AttributionControl, Layer, Marker, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre';
import type { Priced } from '../lib/data';
import { formatPrice3 } from '../lib/format';
import type { Bounds } from '../lib/types';

// Le worker de MapLibre 6 est un fichier autonome : on le fait émettre par Vite et on lui donne son adresse (sinon introuvable après build).
setWorkerUrl(new URL(workerUrl, window.location.href).href);

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
export const GREEN = '#15803d';
export const ORANGE = '#d97706';
export const RED = '#dc2626';

export interface ViewInfo {
  bounds: Bounds;
  lat: number;
  lng: number;
  zoom: number;
}

interface Props {
  mapRef: RefObject<MapRef | null>;
  items: Priced[];
  colorRange: [number, number];
  showPrices: boolean;
  selectedId: number | null;
  userPos: { lat: number; lng: number } | null;
  initial: { lat: number | null; lng: number | null; zoom: number | null };
  onSelect: (id: number) => void;
  onDeselect: () => void;
  onView: (v: ViewInfo) => void;
}

/** Zoom qui fait tenir la France métropolitaine (~16° de large, ~11° de haut) dans la zone de carte visible. */
function franceZoom(): number {
  const wide = window.innerWidth >= 1024;
  const w = window.innerWidth - (wide ? 380 : 0);
  const h = window.innerHeight - (wide ? 0 : 100);
  const zw = Math.log2((w * 360) / (512 * 16));
  const zh = Math.log2((h * 360 * Math.cos((46.6 * Math.PI) / 180)) / (512 * 11.5));
  return Math.max(3.5, Math.min(zw, zh, 6.5));
}
const MAX_BOUNDS: [number, number, number, number] = [
  -14, 35, 19, 58,
];

export function colorExpression(lo: number, hi: number) {
  const top = hi - lo < 0.01 ? lo + 0.01 : hi;
  return ['interpolate', ['linear'], ['get', 'price'], lo, GREEN, (lo + top) / 2, ORANGE, top, RED] as unknown as string;
}

export function MapView({ mapRef, items, colorRange, showPrices, selectedId, userPos, initial, onSelect, onDeselect, onView }: Props) {
  const data = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: items.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.station.lng, p.station.lat] },
        properties: { id: p.station.id, price: p.price, label: formatPrice3(p.price) },
      })),
    }),
    [items],
  );
  const color = useMemo(() => colorExpression(colorRange[0], colorRange[1]), [colorRange]);

  const report = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const c = map.getCenter();
    onView({
      bounds: { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
      lat: c.lat,
      lng: c.lng,
      zoom: map.getZoom(),
    });
  };

  const click = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (f) onSelect(Number(f.properties?.id));
    else onDeselect();
  };

  const hasInitial = initial.lat !== null && initial.lng !== null && initial.zoom !== null;

  return (
    <MapGL
      ref={mapRef}
      mapStyle={STYLE_URL}
      initialViewState={
        hasInitial
          ? { latitude: initial.lat!, longitude: initial.lng!, zoom: initial.zoom! }
          : { latitude: 46.6, longitude: 2.4, zoom: franceZoom() }
      }
      minZoom={3.5}
      maxZoom={18}
      maxBounds={MAX_BOUNDS}
      attributionControl={false}
      interactiveLayerIds={['stations-circle']}
      onClick={click}
      onLoad={report}
      onMoveEnd={report}
      cursor="auto"
      style={{ position: 'absolute', inset: 0 }}
      reuseMaps
    >
      <AttributionControl position="bottom-right" compact={false} customAttribution="Enseignes : © contributeurs OpenStreetMap" />
      <Source id="stations" type="geojson" data={data}>
        <Layer
          id="stations-circle"
          type="circle"
          paint={{
            'circle-color': color,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 8, 4.5, 12, 8, 15, 11],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-opacity': 0.95,
          }}
        />
        {showPrices && (
          <Layer
            id="stations-label"
            type="symbol"
            layout={{
              'text-field': ['get', 'label'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 12,
              'text-anchor': 'left',
              'text-offset': [0.9, 0],
              'text-allow-overlap': false,
              'text-optional': true,
              'symbol-sort-key': ['get', 'price'],
            }}
            paint={{ 'text-color': color, 'text-halo-color': '#ffffff', 'text-halo-width': 2 }}
          />
        )}
        <Layer
          id="stations-selected"
          type="circle"
          filter={['==', ['get', 'id'], selectedId ?? -1]}
          paint={{ 'circle-color': color, 'circle-radius': 13, 'circle-stroke-color': '#111827', 'circle-stroke-width': 3 }}
        />
      </Source>
      {userPos && (
        <Marker latitude={userPos.lat} longitude={userPos.lng}>
          <div className="user-dot" aria-label="Ma position" />
        </Marker>
      )}
    </MapGL>
  );
}
