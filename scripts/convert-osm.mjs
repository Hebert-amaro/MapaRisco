import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Converte `public/maps/map.osm` em arquivos leves para o front.
 * Use `pnpm maps:convert` sempre que atualizar o OSM.
 * Saídas:
 * - `campus.geojson`: desenho do campus no Leaflet.
 * - `campus-routing.json`: caminhos para futuras rotas/geolocalização.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const osmPath = resolve(root, 'public/maps/map.osm');
const geojsonPath = resolve(root, 'public/maps/campus.geojson');
const routingPath = resolve(root, 'public/maps/campus-routing.json');

const xml = readFileSync(osmPath, 'utf8');

const nodes = new Map();
for (const match of xml.matchAll(/<node\b([^>]*)\/?>/g)) {
  const attrs = parseAttrs(match[1]);
  if (!attrs.id || !attrs.lat || !attrs.lon) continue;
  nodes.set(attrs.id, {
    id: attrs.id,
    lat: Number(attrs.lat),
    lon: Number(attrs.lon),
  });
}

const features = [];
const routingWays = [];

for (const match of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
  const attrs = parseAttrs(match[1]);
  const body = match[2];
  const refs = [...body.matchAll(/<nd\b([^>]*)\/>/g)]
    .map(nd => parseAttrs(nd[1]).ref)
    .filter(Boolean);
  const tags = Object.fromEntries(
    [...body.matchAll(/<tag\b([^>]*)\/>/g)].map(tag => {
      const parsed = parseAttrs(tag[1]);
      return [parsed.k, parsed.v];
    }).filter(([key]) => Boolean(key))
  );

  const coordinates = refs
    .map(ref => nodes.get(ref))
    .filter(Boolean)
    .map(node => [node.lon, node.lat]);

  if (coordinates.length < 2) continue;

  const isClosed = refs.length > 2 && refs[0] === refs[refs.length - 1];
  const isBuilding = Boolean(tags.building);
  const isArea = isClosed && (isBuilding || tags.landuse || tags.leisure || tags.amenity || tags.natural);
  const isRoutingWay = Boolean(tags.highway) && !['motorway', 'trunk'].includes(tags.highway);

  if (isBuilding || tags.highway || tags.name || tags.landuse || tags.leisure || tags.amenity || tags.natural) {
    features.push({
      type: 'Feature',
      id: `way/${attrs.id}`,
      properties: {
        osmId: attrs.id,
        kind: isBuilding ? 'building' : tags.highway ? 'path' : isArea ? 'area' : 'line',
        ...tags,
      },
      geometry: isArea
        ? { type: 'Polygon', coordinates: [coordinates] }
        : { type: 'LineString', coordinates },
    });
  }

  if (isRoutingWay) {
    routingWays.push({
      id: attrs.id,
      highway: tags.highway,
      name: tags.name ?? null,
      refs,
      coordinates,
    });
  }
}

const boundsMatch = xml.match(/<bounds\b([^>]*)\/>/);
const bounds = boundsMatch ? parseAttrs(boundsMatch[1]) : null;

const geojson = {
  type: 'FeatureCollection',
  name: 'UFCG Campus Map',
  bounds: bounds ? {
    minlat: Number(bounds.minlat),
    minlon: Number(bounds.minlon),
    maxlat: Number(bounds.maxlat),
    maxlon: Number(bounds.maxlon),
  } : null,
  features,
};

const routing = {
  generatedAt: new Date().toISOString(),
  source: 'public/maps/map.osm',
  nodeCount: nodes.size,
  wayCount: routingWays.length,
  nodes: Object.fromEntries([...nodes.entries()].map(([id, node]) => [id, [node.lat, node.lon]])),
  ways: routingWays,
};

mkdirSync(dirname(geojsonPath), { recursive: true });
writeFileSync(geojsonPath, `${JSON.stringify(geojson)}\n`);
writeFileSync(routingPath, `${JSON.stringify(routing)}\n`);

console.log(`Generated ${features.length} GeoJSON features at ${geojsonPath}`);
console.log(`Generated ${routingWays.length} routing ways at ${routingPath}`);

function parseAttrs(value) {
  return Object.fromEntries(
    [...value.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, attrValue]) => [
      key,
      decodeXml(attrValue),
    ])
  );
}

function decodeXml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}
