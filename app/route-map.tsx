import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { ROUTE_STOPS } from '../constants/transport';

const ORANGE = '#E05C04';

const STOP_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Cebu South Bus Terminal': { lat: 10.2967, lng: 123.8945 },
  'Talisay City': { lat: 10.2447, lng: 123.8494 },
  Minglanilla: { lat: 10.2450, lng: 123.7964 },
  'City of Naga': { lat: 10.2100, lng: 123.7580 },
  Balirong: { lat: 10.2215, lng: 123.7064 },
  Uling: { lat: 10.2719, lng: 123.6805 },
  Lutopan: { lat: 10.3002, lng: 123.6327 },
  'Juan Climaco': { lat: 10.3331, lng: 123.6049 },
  Ilihan: { lat: 10.2988, lng: 123.5686 },
  Sangi: { lat: 10.3494, lng: 123.6331 },
  Luray: { lat: 10.2700, lng: 123.5668 },
  Bato: { lat: 10.2686, lng: 123.5481 },
  Tajao: { lat: 10.2744, lng: 123.5259 },
  Cabangon: { lat: 10.2765, lng: 123.5075 },
  'Pinamungajan Terminal': { lat: 10.2709, lng: 123.5839 },
};

function buildMapHtml(
  stops: { name: string; city: string; landmark: string; lat: number; lng: number }[],
  selectedIndex: number
) {
  const routePoints = JSON.stringify(stops.map((stop) => [stop.lat, stop.lng]));
  const markerData = JSON.stringify(stops.map((stop, index) => ({ ...stop, index })));

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
      .leaflet-control-attribution { font-size: 9px; }
      .stop-pin {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #111827;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid #fff;
        box-shadow: 0 3px 10px rgba(0,0,0,0.28);
        font: 800 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .stop-pin.start { background: #E05C04; }
      .stop-pin.end { background: #16a34a; }
      .stop-pin.selected {
        width: 34px;
        height: 34px;
        background: #E05C04;
        border-color: #fde68a;
      }
      .popup-title { font-weight: 800; color: #111827; margin-bottom: 2px; }
      .popup-body { color: #374151; font-size: 12px; line-height: 16px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const routePoints = ${routePoints};
      const stops = ${markerData};
      const selectedIndex = ${selectedIndex};
      const map = L.map('map', { zoomControl: true, scrollWheelZoom: true });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const line = L.polyline(routePoints, {
        color: '#E05C04',
        weight: 5,
        opacity: 0.88
      }).addTo(map);

      stops.forEach((stop) => {
        const classes = [
          'stop-pin',
          stop.index === 0 ? 'start' : '',
          stop.index === stops.length - 1 ? 'end' : '',
          stop.index === selectedIndex ? 'selected' : ''
        ].filter(Boolean).join(' ');

        const icon = L.divIcon({
          className: '',
          html: '<div class="' + classes + '">' + (stop.index + 1) + '</div>',
          iconSize: stop.index === selectedIndex ? [34, 34] : [28, 28],
          iconAnchor: stop.index === selectedIndex ? [17, 17] : [14, 14]
        });

        L.marker([stop.lat, stop.lng], { icon })
          .addTo(map)
          .bindPopup(
            '<div class="popup-title">' + stop.name + '</div>' +
            '<div class="popup-body">' + stop.city + '<br />' + stop.landmark + '</div>'
          )
          .on('click', () => {
            window.ReactNativeWebView?.postMessage(String(stop.index));
          });
      });

      map.fitBounds(line.getBounds(), { padding: [28, 28] });
      if (stops[selectedIndex]) {
        map.setView([stops[selectedIndex].lat, stops[selectedIndex].lng], 12);
      }
    </script>
  </body>
</html>`;
}

export default function RouteMapScreen() {
  const [reverse, setReverse] = useState(false);
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const stops = useMemo(
    () => (reverse ? [...ROUTE_STOPS].reverse() : ROUTE_STOPS).map((stop) => ({
      ...stop,
      ...STOP_COORDINATES[stop.name],
    })),
    [reverse]
  );
  const selectedStop = stops[selectedStopIndex] ?? stops[0];
  const mapHtml = useMemo(() => buildMapHtml(stops, selectedStopIndex), [stops, selectedStopIndex]);

  const toggleDirection = () => {
    setReverse((prev) => !prev);
    setSelectedStopIndex(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Map</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={toggleDirection}>
          <Ionicons name="swap-vertical" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routeSummary}>
          <Text style={styles.routeTitle}>
            {reverse ? 'Pinamungahan to Cebu' : 'Cebu to Pinamungahan'}
          </Text>
          <Text style={styles.routeSubtitle}>Stops, landmarks, and route order</Text>
        </View>

        <View style={styles.liveMapCard}>
          <View style={styles.mapHeaderRow}>
            <View>
              <Text style={styles.mapTitle}>Interactive Route Map</Text>
              <Text style={styles.mapSubtitle}>{stops.length} stops with landmark pins</Text>
            </View>
            <View style={styles.directionPill}>
              <Ionicons name="navigate" size={14} color="#fff" />
              <Text style={styles.directionPillText}>{reverse ? 'To Cebu' : 'To Pinamungahan'}</Text>
            </View>
          </View>
          <View style={styles.webMapShell}>
            <WebView
              key={`${reverse}-${selectedStopIndex}`}
              source={{ html: mapHtml }}
              style={styles.webMap}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              onMessage={(event) => {
                const nextIndex = Number(event.nativeEvent.data);
                if (!Number.isNaN(nextIndex)) setSelectedStopIndex(nextIndex);
              }}
            />
          </View>
          <View style={styles.selectedStopCard}>
            <View style={styles.selectedStopBadge}>
              <Text style={styles.selectedStopBadgeText}>{selectedStopIndex + 1}</Text>
            </View>
            <View style={styles.selectedStopInfo}>
              <Text style={styles.selectedStopName}>{selectedStop.name}</Text>
              <Text style={styles.selectedStopCity}>{selectedStop.city}</Text>
              <View style={styles.landmarkRow}>
                <Ionicons name="location-outline" size={16} color={ORANGE} />
                <Text style={styles.landmarkText}>{selectedStop.landmark}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={toggleDirection} activeOpacity={0.85}>
            <Ionicons name="swap-vertical" size={18} color={ORANGE} />
            <Text style={styles.quickActionText}>Reverse Route</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => setSelectedStopIndex(0)} activeOpacity={0.85}>
            <Ionicons name="flag" size={18} color={ORANGE} />
            <Text style={styles.quickActionText}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => setSelectedStopIndex(stops.length - 1)} activeOpacity={0.85}>
            <Ionicons name="location" size={18} color={ORANGE} />
            <Text style={styles.quickActionText}>Terminal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapPanel}>
          <View style={styles.stopListHeader}>
            <Text style={styles.stopListTitle}>Stop Locations & Landmarks</Text>
            <Text style={styles.stopListCount}>{stops.length} stops</Text>
          </View>
          {stops.map((stop, index) => (
            <TouchableOpacity
              key={`${stop.name}-${index}`}
              style={[styles.stopRow, selectedStopIndex === index && styles.stopRowSelected]}
              activeOpacity={0.82}
              onPress={() => setSelectedStopIndex(index)}
            >
              <View style={styles.timeline}>
                <View style={[styles.stopDot, index === 0 && styles.stopDotStart, index === stops.length - 1 && styles.stopDotEnd]}>
                  <Text style={styles.stopNumber}>{index + 1}</Text>
                </View>
                {index < stops.length - 1 && <View style={styles.stopLine} />}
              </View>
              <View style={styles.stopCard}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopCity}>{stop.city}</Text>
                <View style={styles.landmarkRow}>
                  <Ionicons name="location-outline" size={16} color={ORANGE} />
                  <Text style={styles.landmarkText}>{stop.landmark}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ORANGE,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  routeSummary: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  routeTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
  },
  routeSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    marginTop: 4,
    fontSize: 14,
  },
  liveMapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 12,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  mapSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 2,
  },
  directionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  directionPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  webMapShell: {
    height: 320,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  webMap: {
    flex: 1,
  },
  selectedStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    backgroundColor: '#fff7ed',
  },
  selectedStopBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedStopBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  selectedStopInfo: {
    flex: 1,
  },
  selectedStopName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  selectedStopCity: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickActionBtn: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '800',
  },
  mapPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stopListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stopListTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  stopListCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '800',
  },
  stopRow: {
    flexDirection: 'row',
    borderRadius: 10,
  },
  stopRowSelected: {
    backgroundColor: '#fff7ed',
  },
  timeline: {
    alignItems: 'center',
    marginRight: 12,
    paddingLeft: 8,
    paddingTop: 4,
  },
  stopDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotStart: {
    backgroundColor: ORANGE,
  },
  stopDotEnd: {
    backgroundColor: '#16a34a',
  },
  stopNumber: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  stopLine: {
    width: 3,
    flex: 1,
    minHeight: 70,
    backgroundColor: '#e5e7eb',
  },
  stopCard: {
    flex: 1,
    paddingBottom: 18,
    paddingTop: 4,
    paddingRight: 8,
  },
  stopName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  stopCity: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  landmarkText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
  },
});
