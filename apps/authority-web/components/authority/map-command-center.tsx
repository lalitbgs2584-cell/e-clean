"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Crosshair,
  Layers3,
  RefreshCw,
  Search,
} from "lucide-react";
import type { AuthorityDashboardPayload, AuthorityReport } from "./shared";

type MapLibreMap = any;

declare global {
  interface Window {
    maplibregl?: any;
  }
}

const MAPLIBRE_SCRIPT =
  "https://unpkg.com/maplibre-gl@5.20.0/dist/maplibre-gl.js";
const MAPLIBRE_CSS =
  "https://unpkg.com/maplibre-gl@5.20.0/dist/maplibre-gl.css";

function validCoordinate(report: AuthorityReport) {
  return (
    Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    Math.abs(report.latitude) <= 90 &&
    Math.abs(report.longitude) <= 180
  );
}

function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  return new Promise<any>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-eclean-maplibre]",
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(window.maplibregl));
      existing.addEventListener("error", () =>
        reject(new Error("Map library could not load.")),
      );
      return;
    }
    if (!document.querySelector("link[data-eclean-maplibre]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS;
      link.dataset.ecleanMaplibre = "true";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = MAPLIBRE_SCRIPT;
    script.async = true;
    script.dataset.ecleanMaplibre = "true";
    script.onload = () =>
      window.maplibregl
        ? resolve(window.maplibregl)
        : reject(new Error("Map library did not initialise."));
    script.onerror = () => reject(new Error("Map library could not load."));
    document.head.appendChild(script);
  });
}

function toFeatureCollection(reports: AuthorityReport[]) {
  return {
    type: "FeatureCollection" as const,
    features: reports.filter(validCoordinate).map((report) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [report.longitude, report.latitude],
      },
      properties: {
        id: report.id,
        status: report.status,
        attention: report.attention,
        category: report.wasteCategory ?? "Unknown",
        assigned: Boolean(report.cleanup?.worker),
      },
    })),
  };
}

export function MapCommandCenter({
  payload,
  onOpen,
  token,
}: {
  payload: AuthorityDashboardPayload;
  onOpen: (report: AuthorityReport) => void;
  token: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [attention, setAttention] = useState("ALL");
  const [heatmap, setHeatmap] = useState(false);
  const [workers, setWorkers] = useState(false);
  const [workerFeatures, setWorkerFeatures] = useState<any[]>([]);
  const [remoteReports, setRemoteReports] = useState<any | null>(null);
  const validReports = useMemo(
    () => payload.reports.filter(validCoordinate),
    [payload.reports],
  );
  const filteredReports = useMemo(
    () =>
      validReports.filter(
        (report) =>
          (status === "ALL" || report.status === status) &&
          (attention === "ALL" || report.attention === attention) &&
          (!query.trim() ||
            [
              report.id,
              report.location,
              report.zone,
              report.wasteCategory,
              report.status,
              report.cleanup?.worker?.name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [attention, query, status, validReports],
  );
  const hasWorkerCoordinates = workerFeatures.length > 0;

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (attention !== "ALL") params.set("attention", attention);
    fetch(`/api/authority/map/reports?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setRemoteReports)
      .catch(() => setRemoteReports(null));
  }, [attention, status, token]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/authority/map/workers", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) =>
        setWorkerFeatures(
          (body.data ?? [])
            .filter(
              (worker: any) =>
                Number.isFinite(worker.workerLatitude) &&
                Number.isFinite(worker.workerLongitude),
            )
            .map((worker: any) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [worker.workerLongitude, worker.workerLatitude],
              },
              properties: {
                id: worker.id,
                name: worker.name,
                available: worker.available,
                assignment: worker.currentAssignment?.reportId ?? null,
              },
            })),
        ),
      )
      .catch(() => setWorkerFeatures([]));
  }, [token]);

  useEffect(() => {
    const style = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
    if (!style) {
      setError(
        "Map style is not configured. Set NEXT_PUBLIC_MAP_STYLE_URL for the authority portal.",
      );
      return;
    }
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const center = validReports.length
          ? [
              validReports.reduce((sum, report) => sum + report.longitude, 0) /
                validReports.length,
              validReports.reduce((sum, report) => sum + report.latitude, 0) /
                validReports.length,
            ]
          : [
              Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG ?? 0),
              Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT ?? 0),
            ];
        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center,
          zoom: validReports.length ? 11 : 2,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.on("load", () => {
          if (cancelled) return;
          map.addSource("eclean-reports", {
            type: "geojson",
            data: toFeatureCollection(validReports),
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 48,
          });
          map.addSource("eclean-workers", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "report-heat",
            type: "heatmap",
            source: "eclean-reports",
            maxzoom: 15,
            paint: {
              "heatmap-weight": 1,
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                0.65,
                13,
                2,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(46,125,79,0)",
                0.25,
                "#a5d6a7",
                0.55,
                "#f4b942",
                0.8,
                "#d9534f",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                10,
                13,
                35,
              ],
              "heatmap-opacity": 0,
            },
          });
          map.addLayer({
            id: "report-clusters",
            type: "circle",
            source: "eclean-reports",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#77ae89",
                20,
                "#e2a03d",
                60,
                "#d9534f",
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                17,
                20,
                22,
                60,
                28,
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
          map.addLayer({
            id: "report-cluster-count",
            type: "symbol",
            source: "eclean-reports",
            filter: ["has", "point_count"],
            layout: {
              "text-field": "{point_count_abbreviated}",
              "text-size": 12,
            },
            paint: { "text-color": "#173b2b" },
          });
          map.addLayer({
            id: "report-points",
            type: "circle",
            source: "eclean-reports",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": [
                "case",
                ["==", ["get", "attention"], "URGENT"],
                9,
                6,
              ],
              "circle-color": [
                "case",
                ["==", ["get", "attention"], "URGENT"],
                "#d9534f",
                ["==", ["get", "status"], "IN_PROGRESS"],
                "#377bd6",
                ["==", ["get", "status"], "RESOLVED"],
                "#6d9b7f",
                "#2e7d4f",
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });
          map.addLayer({
            id: "worker-points",
            type: "circle",
            source: "eclean-workers",
            paint: {
              "circle-radius": 7,
              "circle-color": "#d7a432",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
            layout: { visibility: "none" },
          });
          map.on("click", "report-clusters", (event: any) => {
            const feature = map.queryRenderedFeatures(event.point, {
              layers: ["report-clusters"],
            })[0];
            const clusterId = feature?.properties?.cluster_id;
            (map.getSource("eclean-reports") as any).getClusterExpansionZoom(
              clusterId,
              (err: Error, zoom: number) => {
                if (!err)
                  map.easeTo({ center: feature.geometry.coordinates, zoom });
              },
            );
          });
          map.on("click", "report-points", (event: any) => {
            const id = String(event.features?.[0]?.properties?.id ?? "");
            const report = payload.reports.find((item) => item.id === id);
            if (report) onOpen(report);
          });
          map.on(
            "mouseenter",
            "report-points",
            () => (map.getCanvas().style.cursor = "pointer"),
          );
          map.on(
            "mouseleave",
            "report-points",
            () => (map.getCanvas().style.cursor = ""),
          );
          setReady(true);
        });
        observer = new ResizeObserver(() => map.resize());
        observer.observe(containerRef.current);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Map could not initialise.",
        ),
      );
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onOpen, payload.reports, validReports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("eclean-reports") as any)?.setData(
      remoteReports ?? toFeatureCollection(filteredReports),
    );
    (map.getSource("eclean-workers") as any)?.setData({
      type: "FeatureCollection",
      features: workerFeatures,
    });
    map.setPaintProperty("report-heat", "heatmap-opacity", heatmap ? 0.75 : 0);
    map.setLayoutProperty(
      "worker-points",
      "visibility",
      workers ? "visible" : "none",
    );
  }, [filteredReports, heatmap, ready, remoteReports, workerFeatures, workers]);
  const fitReports = () => {
    const map = mapRef.current;
    const first = filteredReports[0];
    if (!map || !first) return;
    const bounds = filteredReports.reduce(
      (current: any, report) =>
        current.extend([report.longitude, report.latitude]),
      new (window.maplibregl as any).LngLatBounds(
        [first.longitude, first.latitude],
        [first.longitude, first.latitude],
      ),
    );
    map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
  };
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (position) =>
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
        }),
      () => setError("Your location could not be retrieved."),
    );

  return (
    <section className="command-center">
      <header className="command-toolbar">
        <div className="command-title">
          <h2>Map Command Center</h2>
          <p>
            {payload.metrics.openReports} open reports ·{" "}
            {payload.metrics.availableWorkers} available workers
          </p>
        </div>
        <label className="command-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Report ID, category, location, worker…"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="ALL">All statuses</option>
          {[...new Set(payload.reports.map((report) => report.status))].map(
            (item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ),
          )}
        </select>
        <select
          value={attention}
          onChange={(event) => setAttention(event.target.value)}
        >
          <option value="ALL">All priority</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
        </select>
        <button className="button ghost" onClick={fitReports}>
          <RefreshCw size={14} /> Fit reports
        </button>
        <button className="icon-button" title="Locate me" onClick={locate}>
          <Crosshair size={16} />
        </button>
      </header>
      <div className="command-body">
        <div className="command-map-wrap">
          <div ref={containerRef} className="command-map" />
          {!ready && !error && (
            <div className="command-map-state">Loading operational map…</div>
          )}
          {error && (
            <div className="command-map-state error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
          <div className="command-layer-control">
            <b>
              <Layers3 size={14} /> Layers
            </b>
            <label>
              <input type="checkbox" checked readOnly /> Reports
            </label>
            <label
              title={
                hasWorkerCoordinates
                  ? undefined
                  : "Worker locations are not currently stored"
              }
            >
              <input
                type="checkbox"
                checked={workers}
                disabled={!hasWorkerCoordinates}
                onChange={(event) => setWorkers(event.target.checked)}
              />{" "}
              Workers {!hasWorkerCoordinates && "(not tracked)"}
            </label>
            <label>
              <input
                type="checkbox"
                checked={heatmap}
                onChange={(event) => setHeatmap(event.target.checked)}
              />{" "}
              Waste density
            </label>
          </div>
        </div>
        <aside className="command-summary">
          <b>Map summary</b>
          <div>
            <span>Total reports</span>
            <strong>{payload.reports.length}</strong>
          </div>
          <div>
            <span>Displayed</span>
            <strong>{filteredReports.length}</strong>
          </div>
          <div>
            <span>Urgent</span>
            <strong className="danger">
              {
                filteredReports.filter(
                  (report) => report.attention === "URGENT",
                ).length
              }
            </strong>
          </div>
          <div>
            <span>Unassigned</span>
            <strong>
              {filteredReports.filter((report) => !report.cleanup).length}
            </strong>
          </div>
          <div>
            <span>Pending verification</span>
            <strong>{payload.metrics.reviewQueue}</strong>
          </div>
          <p>
            Click a report marker to open its verified workflow details and
            assignment actions.
          </p>
        </aside>
      </div>
      <footer className="command-legend">
        <span>
          <i className="legend-dot urgent" /> Urgent
        </span>
        <span>
          <i className="legend-dot" /> Active report
        </span>
        <span>
          <i className="legend-dot working" /> In progress
        </span>
        <span>
          <i className="legend-dot resolved" /> Resolved
        </span>
        <span>Clusters indicate report density</span>
      </footer>
    </section>
  );
}
