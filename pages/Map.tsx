import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, RefreshCw, Layers, AlertTriangle, AlertOctagon, Info, Bell, Crosshair, Siren, HeartPulse, Building2, Plus, X, Send, ShieldCheck } from 'lucide-react';
import { MAP_CENTER, ZOOM_LEVEL } from '../constants';
import { DisasterType, UserReport, EmergencyResource, Alert, RiskLevel, Coordinates } from '../types';
import { api } from '../services/storage';

// Fix leaflet icons by using CDN URLs instead of direct imports
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for resources
const hospitalIcon = L.divIcon({
  html: '<div class="w-8 h-8 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg></div>',
  className: 'custom-icon-hospital',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const policeIcon = L.divIcon({
  html: '<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l-8 4v6c0 5.5 8 10 8 10s8-4.5 8-10V6l-8-4z"/><path d="M12 22s8-4.5 8-10V6l-8-4-8 4v6c0 5.5 8 10 8 10z"/></svg></div>',
  className: 'custom-icon-police',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const shelterIcon = L.divIcon({
  html: '<div class="w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/></svg></div>',
  className: 'custom-icon-shelter',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const RecenterMap = ({ center }: { center: Coordinates }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], 14, { duration: 2 });
  }, [center, map]);
  return null;
};

// Component to handle AI Map Commands
const MapController = () => {
    const map = useMap();
    
    useEffect(() => {
        const handleMapControl = (event: CustomEvent) => {
            const { command } = event.detail;
            console.log("Map Control Received:", command);

            if (command === 'ZOOM_IN') {
                map.setZoom(map.getZoom() + 2);
            } else if (command === 'ZOOM_OUT') {
                map.setZoom(map.getZoom() - 2);
            } else if (command === 'RECENTER') {
                map.flyTo([MAP_CENTER.lat, MAP_CENTER.lng], ZOOM_LEVEL);
            }
        };

        window.addEventListener('aiden-map', handleMapControl as EventListener);
        return () => {
            window.removeEventListener('aiden-map', handleMapControl as EventListener);
        };
    }, [map]);

    return null;
}

const MapPage: React.FC = () => {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [resources, setResources] = useState<EmergencyResource[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [showReports, setShowReports] = useState(true);
  const [showResources, setShowResources] = useState(true);
  
  // Interaction State
  const [isReporting, setIsReporting] = useState(false);
  const [newReportType, setNewReportType] = useState<DisasterType>(DisasterType.FLOOD);
  const [newReportDesc, setNewReportDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dbReports, dbResources, dbAlerts] = await Promise.all([
          api.getReports(),
          api.getResources(),
          api.getAlerts()
      ]);

      setReports(dbReports);
      setResources(dbResources);
      setAlerts(dbAlerts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch map data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNearbyResources = async (lat: number, lng: number) => {
      // In a real app, this would query backend with lat/lng
      // Here we just mock dynamic addition to current state if empty
      const current = await api.getResources();
      if (current.some(r => r.id.startsWith('dynamic'))) return;

      // Logic to add dynamic resources omitted for brevity as it's handled in main fetch
      // but we ensure we refresh data
      fetchData();
  };

  const getUserLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const newLoc = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                  };
                  setUserLocation(newLoc);
              },
              (error) => console.warn("Location access denied or unavailable:", error)
          );
      }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newReportDesc) return;
      
      setIsSubmitting(true);
      try {
          const coords = userLocation || MAP_CENTER;
          await api.createReport({
              type: newReportType,
              description: newReportDesc,
              coordinates: coords
          });
          setIsReporting(false);
          setNewReportDesc("");
          // Data will auto-refresh via event listener, but we can also trigger manually
          fetchData();
      } catch (err) {
          console.error(err);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleVerifyReport = async (id: string) => {
    setVerifyingId(id);
    try {
      await api.verifyReport(id);
      // Data refresh is handled by the event listener, but local state update adds responsiveness
      setReports(prev => prev.map(r => r.id === id ? { ...r, verified: true } : r));
    } catch (error) {
      console.error("Verification failed", error);
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    fetchData();
    getUserLocation();

    // Listen for database updates (Real-time simulation)
    const handleUpdate = () => {
        console.log("Backend update detected, syncing...");
        fetchData();
    };

    // Listen for AI command to open report modal
    const handleOpenReport = () => {
         setIsReporting(true);
    };

    window.addEventListener('db-reports-updated', handleUpdate);
    window.addEventListener('aiden-report-ui', handleOpenReport);
    
    return () => {
        window.removeEventListener('db-reports-updated', handleUpdate);
        window.removeEventListener('aiden-report-ui', handleOpenReport);
    };
  }, []);

  const getDisasterColor = (type: DisasterType) => {
    switch (type) {
      case DisasterType.FLOOD: return '#3b82f6';
      case DisasterType.FIRE: return '#ef4444';
      case DisasterType.STORM: return '#a855f7';
      default: return '#f59e0b';
    }
  };

  const getAlertStyles = (level: RiskLevel) => {
    switch (level) {
        case RiskLevel.CRITICAL:
            return {
                bg: 'bg-red-950/90',
                border: 'border-red-500',
                text: 'text-red-100',
                icon: <AlertOctagon className="text-red-500 animate-pulse" size={20} />
            };
        case RiskLevel.HIGH:
            return {
                bg: 'bg-orange-950/90',
                border: 'border-orange-500',
                text: 'text-orange-100',
                icon: <AlertTriangle className="text-orange-500" size={20} />
            };
        case RiskLevel.MODERATE:
            return {
                bg: 'bg-yellow-950/90',
                border: 'border-yellow-500',
                text: 'text-yellow-100',
                icon: <Info className="text-yellow-500" size={20} />
            };
        default:
            return {
                bg: 'bg-slate-900/90',
                border: 'border-slate-500',
                text: 'text-slate-100',
                icon: <Bell className="text-slate-400" size={20} />
            };
    }
  };

  const getResourceIcon = (type: string) => {
      switch(type) {
          case 'HOSPITAL': return hospitalIcon;
          case 'POLICE': return policeIcon;
          case 'SHELTER': return shelterIcon;
          default: return DefaultIcon;
      }
  };

  return (
    <div className="h-[calc(100vh-8rem)] w-full rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative">
      
      {/* Real-time Alert Bar */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {alerts.map((alert) => {
            const styles = getAlertStyles(alert.level);
            return (
                <div 
                    key={alert.id} 
                    className={`${styles.bg} ${styles.text} backdrop-blur-md p-3 rounded-lg border-l-4 ${styles.border} shadow-lg flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2 duration-500 pointer-events-auto`}
                >
                    <div className="mt-0.5 shrink-0">{styles.icon}</div>
                    <div>
                        <p className="text-sm font-bold leading-tight">{alert.message}</p>
                        <p className="text-[10px] opacity-70 mt-1 font-mono uppercase">
                            {alert.level} PRIORITY • {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Map Control Panel */}
      <div className="absolute top-4 right-4 z-[400] bg-slate-900/95 backdrop-blur p-4 rounded-lg border border-slate-700 shadow-xl w-64">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <h3 className="font-bold text-slate-100">Map Data</h3>
            </div>
            <div className="flex gap-1">
                <button 
                  onClick={getUserLocation} 
                  className="p-1.5 hover:bg-slate-700 rounded-md transition text-slate-400 hover:text-white"
                  title="Recenter on Me"
                >
                    <Crosshair size={14} />
                </button>
                <button 
                  onClick={fetchData} 
                  disabled={isLoading} 
                  className="p-1.5 hover:bg-slate-700 rounded-md transition text-slate-400 hover:text-white"
                  title="Refresh Data"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 mb-4">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-slate-300 group-hover:text-white transition">Disaster Reports ({reports.length})</span>
            <input 
              type="checkbox" 
              checked={showReports} 
              onChange={(e) => setShowReports(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500/50 bg-slate-800"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-slate-300 group-hover:text-white transition">Emergency Resources</span>
            <input 
              type="checkbox" 
              checked={showResources} 
              onChange={(e) => setShowResources(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500/50 bg-slate-800"
            />
          </label>
        </div>

        {/* Legend */}
        <div className="pt-3 border-t border-slate-700">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Legend</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
                <HeartPulse size={12} className="text-red-500" /> <span className="text-slate-400">Hospital</span>
            </div>
            <div className="flex items-center gap-2">
                <Siren size={12} className="text-blue-500" /> <span className="text-slate-400">Police</span>
            </div>
            <div className="flex items-center gap-2">
                <Building2 size={12} className="text-emerald-500" /> <span className="text-slate-400">Shelter/NGO</span>
            </div>
          </div>
        </div>

        {lastUpdated && (
            <div className="mt-3 pt-2 border-t border-slate-700 text-right">
                <p className="text-[10px] text-slate-500 font-mono">
                    UPDATED: {lastUpdated.toLocaleTimeString()}
                </p>
            </div>
        )}
      </div>

      {/* Report Incident FAB */}
      <div className="absolute bottom-6 right-6 z-[400]">
          <button 
            onClick={() => setIsReporting(true)}
            className="group flex items-center justify-center w-14 h-14 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-red-500/30"
            title="Report Incident"
          >
              <Plus size={32} className="text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>
      </div>

      {/* Report Modal */}
      {isReporting && (
          <div className="absolute inset-0 z-[500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-4 border-b border-slate-800">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <AlertTriangle className="text-red-500" size={20} />
                          Report Incident
                      </h3>
                      <button onClick={() => setIsReporting(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-full transition">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleSubmitReport} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Incident Type</label>
                          <div className="grid grid-cols-3 gap-2">
                              {[DisasterType.FLOOD, DisasterType.FIRE, DisasterType.STORM, DisasterType.EARTHQUAKE, DisasterType.LANDSLIDE].map(type => (
                                  <button
                                      key={type}
                                      type="button"
                                      onClick={() => setNewReportType(type)}
                                      className={`p-2 rounded-lg text-xs font-bold border transition-all ${newReportType === type ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                  >
                                      {type}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                          <textarea 
                              value={newReportDesc}
                              onChange={(e) => setNewReportDesc(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                              placeholder="Describe what you see..."
                              required
                          />
                      </div>
                      <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3 flex items-center gap-3">
                          <Crosshair size={20} className="text-blue-500" />
                          <div>
                              <p className="text-xs text-blue-300 font-bold">Location Attached</p>
                              <p className="text-[10px] text-blue-400/70">
                                  {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : "Using Map Center (Default)"}
                              </p>
                          </div>
                      </div>
                      <div className="pt-2">
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-900/50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                              Submit Report
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {isLoading && !lastUpdated && (
         <div className="absolute inset-0 z-[600] bg-slate-900 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p className="font-mono text-sm tracking-wide">ESTABLISHING SATELLITE UPLINK...</p>
         </div>
      )}

      <MapContainer center={MAP_CENTER} zoom={ZOOM_LEVEL} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        {userLocation && <RecenterMap center={userLocation} />}
        <MapController />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* User Location Marker */}
        {userLocation && (
            <>
                <Circle 
                    center={[userLocation.lat, userLocation.lng]} 
                    pathOptions={{ color: 'transparent', fillColor: '#3b82f6', fillOpacity: 0.2 }} 
                    radius={100} 
                />
                <CircleMarker 
                    center={[userLocation.lat, userLocation.lng]} 
                    radius={8} 
                    pathOptions={{ color: 'white', weight: 2, fillColor: '#3b82f6', fillOpacity: 1 }}
                >
                    <Popup>
                        <div className="text-center">
                            <h4 className="font-bold text-slate-900">Your Location</h4>
                            <p className="text-xs text-slate-600">Lat: {userLocation.lat.toFixed(4)}<br/>Lng: {userLocation.lng.toFixed(4)}</p>
                        </div>
                    </Popup>
                </CircleMarker>
            </>
        )}

        {/* Resources */}
        {showResources && resources.map(res => (
          <Marker 
            key={res.id} 
            position={[res.location.lat, res.location.lng]}
            icon={getResourceIcon(res.type)}
          >
            <Popup>
              <div className="p-1">
                <h4 className="font-bold text-slate-900">{res.name}</h4>
                <p className="text-xs text-slate-600 font-bold mb-1">{res.type}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${res.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {res.status}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Disaster Zones */}
        {showReports && reports.map(rep => (
          <Circle 
            key={rep.id} 
            center={[rep.coordinates.lat, rep.coordinates.lng]}
            pathOptions={{ fillColor: getDisasterColor(rep.type), color: getDisasterColor(rep.type) }}
            radius={500}
          >
            <Popup>
               <div className="p-1 min-w-[150px]">
                <h4 className="font-bold text-slate-900">{rep.type} ALERT</h4>
                <p className="text-xs text-slate-600 my-1">{rep.description}</p>
                <p className="text-[10px] text-slate-500 italic mb-2">{new Date(rep.timestamp).toLocaleTimeString()}</p>
                
                {rep.verified 
                    ? <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 rounded border border-emerald-200">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <p className="text-[10px] text-emerald-700 font-bold">VERIFIED SOURCE</p>
                      </div>
                    : (
                        <div className="space-y-2">
                            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                <AlertTriangle size={12} /> UNVERIFIED REPORT
                            </p>
                            <button 
                                onClick={() => handleVerifyReport(rep.id)}
                                disabled={verifyingId === rep.id}
                                className="w-full py-1.5 px-3 bg-blue-600 text-white text-[11px] font-bold rounded shadow hover:bg-blue-500 transition flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                {verifyingId === rep.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <ShieldCheck size={12} />
                                )}
                                {verifyingId === rep.id ? 'Verifying...' : 'Verify Report'}
                            </button>
                        </div>
                    )
                }
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapPage;