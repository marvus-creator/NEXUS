'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { PlaceSummary } from '@/lib/places-client';
import { useT } from '@/i18n/client';

const KIGALI: [number, number] = [30.0619, -1.9441];
const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';
const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';

type Point = { lat: number; lng: number };

function isLight() {
  return document.documentElement.classList.contains('light');
}

function resolveColor(value: string) {
  const match = value.match(/^var\((--[^)]+)\)$/);
  const raw = match
    ? getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim()
    : value;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx || !raw) return '#3B82F6';
  ctx.fillStyle = '#3B82F6';
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

function toGeoJSON(places: PlaceSummary[], tints: Record<string, string>) {
  return {
    type: 'FeatureCollection' as const,
    features: places
      .filter((place) => place.latitude !== null && place.longitude !== null)
      .map((place) => ({
        type: 'Feature' as const,
        id: place.id,
        properties: {
          id: place.id,
          name: place.name,
          color: resolveColor(tints[place.category] ?? 'var(--accent)'),
          events: place.eventCount,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [place.longitude as number, place.latitude as number],
        },
      })),
  };
}

export function PlacesMap({
  places,
  tints,
  selectedId,
  onSelect,
  me,
  picking,
  picked,
  onPick,
}: {
  places: PlaceSummary[];
  tints: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  me: Point | null;
  picking: boolean;
  picked: Point | null;
  onPick: (point: Point) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const t = useT();
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import('maplibre-gl') | null>(null);
  const meMarker = useRef<Marker | null>(null);
  const pickMarker = useRef<Marker | null>(null);
  const latest = useRef({ places, tints, selectedId, onSelect, picking, onPick });
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  latest.current = { places, tints, selectedId, onSelect, picking, onPick };

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    function addLayers(map: MapLibreMap) {
      const { places, tints, selectedId } = latest.current;
      const accent = resolveColor('var(--accent)');

      if (!map.getSource('places')) {
        map.addSource('places', {
          type: 'geojson',
          data: toGeoJSON(places, tints),
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 14,
        });
      }

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': accent,
          'circle-opacity': 0.9,
          'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 15, 26],
          'circle-stroke-width': 4,
          'circle-stroke-color': accent,
          'circle-stroke-opacity': 0.25,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'places',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'place-halo',
        type: 'circle',
        source: 'places',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedId ?? '']],
        paint: {
          'circle-radius': 18,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
        },
      });
      map.addLayer({
        id: 'place-points',
        type: 'circle',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['>', ['get', 'events'], 0], 9, 7],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': isLight() ? '#ffffff' : '#0B0D10',
        },
      });
      map.addLayer({
        id: 'place-labels',
        type: 'symbol',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        minzoom: 13,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': isLight() ? '#1f2937' : '#e5e7eb',
          'text-halo-color': isLight() ? '#ffffff' : '#0B0D10',
          'text-halo-width': 1.5,
        },
      });
    }

    async function boot() {
      try {
        const lib = await import('maplibre-gl');
        if (cancelled || !container.current) return;
        libRef.current = lib;
        if (!lib.getWorkerUrl().includes('/maplibre/'))
          lib.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

        const map = new lib.Map({
          container: container.current,
          style: isLight() ? STYLE_LIGHT : STYLE_DARK,
          center: KIGALI,
          zoom: 12.5,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right');

        map.on('style.load', () => {
          addLayers(map);
          setReady(true);
        });
        map.on('error', (event) => {
          if (!map.loaded() && String(event.error?.message ?? '').includes('style'))
            setFailed(true);
        });

        map.on('click', 'clusters', async (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          const source = map.getSource('places') as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
          map.easeTo({
            center: (feature.geometry as unknown as { coordinates: [number, number] }).coordinates,
            zoom,
          });
        });
        map.on('click', 'place-points', (event) => {
          const id = event.features?.[0]?.properties.id as string | undefined;
          if (id) latest.current.onSelect(id);
        });
        map.on('click', (event: MapMouseEvent) => {
          if (latest.current.picking) {
            latest.current.onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
            return;
          }
          const hits = map.queryRenderedFeatures(event.point, {
            layers: ['place-points', 'clusters'],
          });
          if (hits.length === 0) latest.current.onSelect(null);
        });
        for (const layer of ['clusters', 'place-points']) {
          map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
          map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
        }

        let lastLight = isLight();
        observer = new MutationObserver(() => {
          const light = isLight();
          if (light === lastLight) return;
          lastLight = light;
          map.setStyle(light ? STYLE_LIGHT : STYLE_DARK);
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
      } catch {
        setFailed(true);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource('places') as GeoJSONSource | undefined;
    source?.setData(toGeoJSON(places, tints));

    const located = places.filter((p) => p.latitude !== null && p.longitude !== null);
    if (!fitted.current && located.length > 0 && libRef.current) {
      fitted.current = true;
      const bounds = new libRef.current.LngLatBounds();
      located.forEach((p) => bounds.extend([p.longitude as number, p.latitude as number]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 14.5, duration: 0 });
    }
  }, [places, tints, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer('place-halo')) return;
    map.setFilter('place-halo', [
      'all',
      ['!', ['has', 'point_count']],
      ['==', ['get', 'id'], selectedId ?? ''],
    ]);
    const place = places.find((p) => p.id === selectedId);
    if (place && place.latitude !== null && place.longitude !== null) {
      map.easeTo({
        center: [place.longitude, place.latitude],
        zoom: Math.max(map.getZoom(), 14),
        duration: 600,
      });
    }
  }, [selectedId, places, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !ready) return;
    meMarker.current?.remove();
    meMarker.current = null;
    if (me) {
      const dot = document.createElement('div');
      dot.className = 'nexus-me-dot';
      meMarker.current = new lib.Marker({ element: dot }).setLngLat([me.lng, me.lat]).addTo(map);
      map.easeTo({ center: [me.lng, me.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 800 });
    }
  }, [me, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || !ready) return;
    map.getCanvas().style.cursor = picking ? 'crosshair' : '';
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (picking && picked) {
      pickMarker.current = new lib.Marker({ color: resolveColor('var(--accent)') })
        .setLngLat([picked.lng, picked.lat])
        .addTo(map);
    }
  }, [picking, picked, ready]);

  if (failed) {
    return (
      <div className="text-ink-muted flex h-full items-center justify-center px-6 text-center text-sm">
        {t('places.mapFailed')}
      </div>
    );
  }

  return (
    <>
      <style>{`
        .nexus-me-dot{width:16px;height:16px;border-radius:50%;background:var(--accent);border:3px solid #fff;box-shadow:0 0 0 6px color-mix(in oklab,var(--accent) 30%,transparent)}
        .maplibregl-ctrl-group{background:var(--surface-raised)!important;border:1px solid var(--border)!important;box-shadow:none!important}
        .maplibregl-ctrl-group button+button{border-top:1px solid var(--border)!important}
        .maplibregl-ctrl-group button span{filter:var(--map-ctrl-filter,invert(1))}
        html.light .maplibregl-ctrl-group button span{filter:none}
        .maplibregl-ctrl-attrib{background:color-mix(in oklab,var(--surface) 85%,transparent)!important;color:var(--ink-muted)!important;font-size:10px}
        .maplibregl-ctrl-attrib a{color:var(--ink-muted)!important}
        .maplibregl-ctrl-attrib-button{filter:var(--map-ctrl-filter,invert(1))}
        html.light .maplibregl-ctrl-attrib-button{filter:none}
      `}</style>
      <div ref={container} className="h-full w-full" />
      {!ready ? (
        <div className="bg-surface text-ink-subtle absolute inset-0 flex items-center justify-center text-xs">
          {t('places.mapLoading')}
        </div>
      ) : null}
    </>
  );
}
