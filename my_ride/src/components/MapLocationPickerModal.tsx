'use client'
import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import axios from 'axios'
import { 
  X, 
  MapPin, 
  Navigation, 
  LocateFixed, 
  Search, 
  Check, 
  Sparkles,
  ArrowRight,
  Layers,
  Compass
} from 'lucide-react'

export interface SelectedLocation {
  address: string
  lat: number
  lng: number
  country?: string
}

interface MapLocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'pickup' | 'drop'
  currentPickup?: SelectedLocation | null
  currentDrop?: SelectedLocation | null
  onConfirm: (location: SelectedLocation, mode: 'pickup' | 'drop') => void
}

// Custom modern Leaflet DivIcons
const pickupMarkerIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.35));transform:translateY(-8px)">
      <div style="background:#09090b;color:#10b981;padding:5px 12px;border-radius:100px;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;font-family:-apple-system,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.3);border:1px solid rgba(16,185,129,0.4);white-space:nowrap">
        ● PICKUP
      </div>
      <div style="width:2px;height:12px;background:#10b981"></div>
      <div style="width:14px;height:14px;background:#10b981;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px rgba(16,185,129,0.3)"></div>
    </div>`,
  className: '',
  iconSize: [100, 64],
  iconAnchor: [50, 64]
})

const dropMarkerIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.35));transform:translateY(-8px)">
      <div style="background:#09090b;color:#38bdf8;padding:5px 12px;border-radius:100px;font-size:10px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;font-family:-apple-system,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.3);border:1px solid rgba(56,189,248,0.4);white-space:nowrap">
        ◆ DESTINATION
      </div>
      <div style="width:2px;height:12px;background:#38bdf8"></div>
      <div style="width:14px;height:14px;background:#38bdf8;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px rgba(56,189,248,0.3)"></div>
    </div>`,
  className: '',
  iconSize: [110, 64],
  iconAnchor: [55, 64]
})

// Sub-component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

// Sub-component to fly to a target location
function MapFlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 1.2 })
    }
  }, [target, map])
  return null
}

// Sub-component to auto fit both bounds if both exist
function AutoBounds({ p1, p2 }: { p1?: [number, number] | null; p2?: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (p1 && p2) {
      map.fitBounds([p1, p2], { padding: [80, 80], maxZoom: 15, animate: true })
    }
  }, [p1, p2, map])
  return null
}

export default function MapLocationPickerModal({
  isOpen,
  onClose,
  initialMode = 'drop',
  currentPickup,
  currentDrop,
  onConfirm
}: MapLocationPickerModalProps) {
  const [mode, setMode] = useState<'pickup' | 'drop'>(initialMode)
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('India')
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  
  // Search in map
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // Route preview between pickup & drop if both exist
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  // Initialize position when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      if (initialMode === 'drop') {
        if (currentDrop?.lat && currentDrop?.lng) {
          setSelectedPos([currentDrop.lat, currentDrop.lng])
          setSelectedAddress(currentDrop.address)
          setFlyTarget([currentDrop.lat, currentDrop.lng])
        } else if (currentPickup?.lat && currentPickup?.lng) {
          // Default near pickup if drop is not set
          const offsetDrop: [number, number] = [currentPickup.lat + 0.015, currentPickup.lng + 0.015]
          setSelectedPos(offsetDrop)
          setFlyTarget(offsetDrop)
          fetchAddress(offsetDrop[0], offsetDrop[1])
        } else {
          // Default to user's location
          getUserLocation()
        }
      } else {
        if (currentPickup?.lat && currentPickup?.lng) {
          setSelectedPos([currentPickup.lat, currentPickup.lng])
          setSelectedAddress(currentPickup.address)
          setFlyTarget([currentPickup.lat, currentPickup.lng])
        } else {
          getUserLocation()
        }
      }
    }
  }, [isOpen, initialMode])

  // When mode changes internally
  const handleModeChange = (newMode: 'pickup' | 'drop') => {
    setMode(newMode)
    if (newMode === 'pickup') {
      if (currentPickup?.lat && currentPickup?.lng) {
        setSelectedPos([currentPickup.lat, currentPickup.lng])
        setSelectedAddress(currentPickup.address)
        setFlyTarget([currentPickup.lat, currentPickup.lng])
      }
    } else {
      if (currentDrop?.lat && currentDrop?.lng) {
        setSelectedPos([currentDrop.lat, currentDrop.lng])
        setSelectedAddress(currentDrop.address)
        setFlyTarget([currentDrop.lat, currentDrop.lng])
      }
    }
  }

  // Fetch address via Geoapify Reverse Geocoding
  const fetchAddress = async (lat: number, lng: number) => {
    setGeocodingLoading(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
      const { data } = await axios.get('https://api.geoapify.com/v1/geocode/reverse', {
        params: {
          lat,
          lon: lng,
          apiKey,
          filter: 'countrycode:in'
        }
      })

      if (data?.features?.length > 0) {
        const props = data.features[0].properties
        const formatted = props.formatted || [props.name, props.street, props.suburb, props.city, props.state, props.country].filter(Boolean).join(', ')
        setSelectedAddress(formatted)
        setSelectedCountry(props.country || 'India')
      } else {
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err)
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      setGeocodingLoading(false)
    }
  }

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPos([lat, lng])
    fetchAddress(lat, lng)
  }

  // Use current browser location
  const getUserLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setSelectedPos([lat, lng])
        setFlyTarget([lat, lng])
        fetchAddress(lat, lng)
      },
      (err) => {
        console.warn('Geolocation denied or error:', err)
        // Fallback default coordinates (Prayagraj / Delhi)
        const fallback: [number, number] = [25.4954, 81.8692]
        setSelectedPos(fallback)
        setFlyTarget(fallback)
        fetchAddress(fallback[0], fallback[1])
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Search address inside map modal
  const handleSearch = async (val: string) => {
    setSearchQuery(val)
    if (!val || val.trim().length < 3) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
      const { data } = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
        params: {
          text: val.trim(),
          apiKey,
          filter: 'countrycode:in',
          limit: 5
        }
      })
      const places = (data.features ?? []).map((f: any) => ({
        name: f.properties?.formatted || f.properties?.name || '',
        lat: f.geometry?.coordinates?.[1],
        lng: f.geometry?.coordinates?.[0],
        country: f.properties?.country || 'India'
      }))
      setSearchResults(places)
    } catch (err) {
      console.error('Search error:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSearchResult = (place: any) => {
    setSelectedPos([place.lat, place.lng])
    setSelectedAddress(place.name)
    setSelectedCountry(place.country)
    setFlyTarget([place.lat, place.lng])
    setSearchResults([])
    setSearchQuery('')
  }

  // Load driving route if both pickup and drop coordinates exist
  useEffect(() => {
    const p1 = mode === 'pickup' ? selectedPos : (currentPickup ? [currentPickup.lat, currentPickup.lng] : null)
    const p2 = mode === 'drop' ? selectedPos : (currentDrop ? [currentDrop.lat, currentDrop.lng] : null)

    if (p1 && p2) {
      axios.get(`https://router.project-osrm.org/route/v1/driving/${p1[1]},${p1[0]};${p2[1]},${p2[0]}?overview=full&geometries=geojson`)
        .then(res => {
          if (res.data?.routes?.[0]) {
            const coords = res.data.routes[0].geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number])
            setRouteCoords(coords)
            setDistanceKm(+(res.data.routes[0].distance / 1000).toFixed(1))
          }
        })
        .catch(() => {
          setRouteCoords([])
          setDistanceKm(null)
        })
    } else {
      setRouteCoords([])
      setDistanceKm(null)
    }
  }, [selectedPos, mode, currentPickup, currentDrop])

  const handleConfirm = () => {
    if (!selectedPos || !selectedAddress) return
    onConfirm({
      address: selectedAddress,
      lat: selectedPos[0],
      lng: selectedPos[1],
      country: selectedCountry
    }, mode)
    onClose()
  }

  if (!isOpen) return null

  const isPickup = mode === 'pickup'
  const defaultCenter: [number, number] = selectedPos || [25.4954, 81.8692]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md">
        
        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-4xl h-[92vh] sm:h-[86vh] bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
        >
          {/* Top Bar Header */}
          <div className="relative z-30 bg-zinc-900/90 backdrop-blur-xl border-b border-white/10 p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              
              {/* Pickup vs Destination Segmented Switcher */}
              <div className="flex items-center bg-zinc-950 p-1 rounded-2xl border border-white/10 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleModeChange('pickup')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isPickup
                      ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <MapPin size={13} className={isPickup ? 'text-zinc-950' : 'text-emerald-400'} />
                  <span>Set Pickup</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('drop')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    !isPickup
                      ? 'bg-cyan-400 text-zinc-950 shadow-md shadow-cyan-400/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Navigation size={13} className={!isPickup ? 'text-zinc-950' : 'text-cyan-400'} />
                  <span>Set Destination</span>
                </button>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={getUserLocation}
                  title="Locate me"
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 active:scale-95 text-xs text-white px-3 py-2 rounded-xl transition-all"
                >
                  <LocateFixed size={14} className="text-emerald-400" />
                  <span className="hidden sm:inline">My Location</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                >
                  <X size={17} />
                </button>
              </div>

            </div>

            {/* Quick Map Search Bar */}
            <div className="relative">
              <div className="flex items-center bg-zinc-950 rounded-xl px-3.5 py-2.5 border border-white/10 focus-within:border-emerald-400 transition-colors">
                <Search size={15} className="text-zinc-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder={isPickup ? "Search pickup location..." : "Search destination on map..."}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-zinc-400 hover:text-white text-xs mr-1">
                    Clear
                  </button>
                )}
              </div>

              {/* Search Autocomplete Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900 border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto"
                  >
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                      >
                        <MapPin size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-zinc-200 truncate">{res.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Leaflet Map Canvas */}
          <div className="relative flex-1 w-full bg-zinc-900 z-10">
            <MapContainer
              center={defaultCenter}
              zoom={14}
              zoomControl={false}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickHandler onMapClick={handleMapClick} />
              <MapFlyTo target={flyTarget} />

              {/* Show other point if exists */}
              {mode === 'drop' && currentPickup?.lat && currentPickup?.lng && (
                <Marker position={[currentPickup.lat, currentPickup.lng]} icon={pickupMarkerIcon} />
              )}
              {mode === 'pickup' && currentDrop?.lat && currentDrop?.lng && (
                <Marker position={[currentDrop.lat, currentDrop.lng]} icon={dropMarkerIcon} />
              )}

              {/* Active Selected Marker */}
              {selectedPos && (
                <Marker
                  position={selectedPos}
                  icon={isPickup ? pickupMarkerIcon : dropMarkerIcon}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const latlng = e.target.getLatLng()
                      handleMapClick(latlng.lat, latlng.lng)
                    }
                  }}
                />
              )}

              {/* Real route line if both locations available */}
              {routeCoords.length > 0 && (
                <Polyline
                  positions={routeCoords}
                  color={isPickup ? "#10b981" : "#38bdf8"}
                  weight={5}
                  opacity={0.85}
                  dashArray="8, 8"
                />
              )}

              <AutoBounds
                p1={mode === 'pickup' ? selectedPos : (currentPickup ? [currentPickup.lat, currentPickup.lng] : null)}
                p2={mode === 'drop' ? selectedPos : (currentDrop ? [currentDrop.lat, currentDrop.lng] : null)}
              />
            </MapContainer>

            {/* Instruction Floating Helper Banner */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
              <div className="bg-zinc-950/90 text-white border border-white/15 px-4 py-1.5 rounded-full text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-2">
                <Compass size={13} className="text-emerald-400 animate-spin" />
                <span>Tap or drag anywhere on the map to set location</span>
              </div>
            </div>

            {/* Distance badge if route exists */}
            {distanceKm && (
              <div className="absolute top-4 right-4 z-[400]">
                <div className="bg-zinc-950/90 border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl backdrop-blur-md">
                  Route: <span className="text-emerald-400">{distanceKm} km</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Confirmation & Address Drawer */}
          <div className="relative z-30 bg-zinc-950 border-t border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-start gap-3 w-full sm:w-auto flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isPickup ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}>
                {isPickup ? <MapPin size={18} /> : <Navigation size={18} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isPickup ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    Selected {isPickup ? 'Pickup Location' : 'Destination'}
                  </span>
                  {geocodingLoading && (
                    <span className="text-[10px] text-zinc-400 animate-pulse">Resolving address...</span>
                  )}
                </div>

                <p className="text-sm font-semibold text-white leading-snug truncate mt-0.5">
                  {selectedAddress || 'Click on the map to choose...'}
                </p>

                {selectedPos && (
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    {selectedPos[0].toFixed(5)}, {selectedPos[1].toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-bold transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedPos || geocodingLoading}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-40 cursor-pointer ${
                  isPickup
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-zinc-950 shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-400 text-zinc-950 shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <Check size={16} strokeWidth={3} />
                <span>Confirm {isPickup ? 'Pickup' : 'Destination'}</span>
              </button>
            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  )
}
