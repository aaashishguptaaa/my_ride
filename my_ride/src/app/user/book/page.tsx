'use client'
import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Bike, Car, CheckCircle, ChevronRight, LocateFixed, MapPin, Navigation, Phone, Truck, Map, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { vehicleType } from '@/models/vehicle.model'
import axios from 'axios'
import dynamic from 'next/dynamic'

const MapLocationPickerModal = dynamic(
  () => import('@/components/MapLocationPickerModal'),
  { ssr: false }
)

const stepVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
}

const VEHICLES = [
  { id: "bike", label: "Bike", Icon: Bike, desc: "Quick & affordable" },
  { id: "auto", label: "Auto", Icon: Car, desc: "Everyday rides" },
  { id: "car", label: "Car", Icon: Car, desc: "Comfort rides" },
  { id: "loading", label: "Loading", Icon: Truck, desc: "Small cargo" },
  { id: "truck", label: "Truck", Icon: Truck, desc: "Heavy transport" },
];

type Place = {
  id: string; 
  name: string; 
  city?: string; 
  state?: string;
  country?: string; 
  countrycode?: string; 
  lat: number; 
  lng: number;
};

function page() {
  const router = useRouter()
  const [vehicle, setVehicle] = useState<vehicleType>()
  const [mobile, setMobile] = useState("")
  const [pickUp, setPickUp] = useState("")
  const [drop, setDrop] = useState("")
  const [pickUpCountry,setPickUpCountry]=useState("")
  const [pickUpLat,setPickUpLat]=useState<Number>()
  const [pickUpLon,setPickUpLon]=useState<Number>()
  const [dropCountry,setDropCountry]=useState("")
  const [dropLat,setDropLat]=useState<Number>()
  const [dropLon,setDropLon]=useState<Number>()
  const [locating,setLocating]=useState(false)
  const [pickUpSuggestions,setPickUpSuggestions]=useState<Place[]>([])
  const [dropSuggestions,setDropSuggestions]=useState<Place[]>([])
  
  // Interactive Map Picker Modal States
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [mapPickerMode, setMapPickerMode] = useState<'pickup' | 'drop'>('drop')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const mode = params.get('mode')
      if (mode === 'drop_map') {
        setMapPickerMode('drop')
        setIsMapModalOpen(true)
      } else if (mode === 'pickup_map') {
        setMapPickerMode('pickup')
        setIsMapModalOpen(true)
      }
      const qPickup = params.get('pickup')
      if (qPickup) setPickUp(qPickup)
      const qDrop = params.get('drop')
      if (qDrop) setDrop(qDrop)
      const qVehicle = params.get('vehicle')
      if (qVehicle && ['bike', 'auto', 'car', 'loading', 'truck'].includes(qVehicle)) {
        setVehicle(qVehicle as vehicleType)
      }
    }
  }, [])

  const handleConfirmMapLocation = (
    location: { address: string; lat: number; lng: number; country?: string },
    mode: 'pickup' | 'drop'
  ) => {
    if (mode === 'pickup') {
      setPickUp(location.address)
      setPickUpCountry(location.country || "India")
      setPickUpLat(location.lat)
      setPickUpLon(location.lng)
      setPickUpSuggestions([])
    } else {
      setDrop(location.address)
      setDropCountry(location.country || "India")
      setDropLat(location.lat)
      setDropLon(location.lng)
      setDropSuggestions([])
    }
  }

  const progress = [!!vehicle, !!(mobile.length == 10), !!pickUp, !!drop].filter(Boolean).length
  const canContinue=!!(vehicle && mobile && pickUp && drop && pickUpLat && pickUpLon && dropLat && dropLon)
const searchAddress=async (q:string,setResults:(r:Place[])=>void,restrict?:string | null)=>{
  try {
    if(!q || q.trim().length<3 ){
      setResults([])
      return;
    }
    const {data}=await axios.get("https://api.geoapify.com/v1/geocode/autocomplete", {
  params: {
    text: q.trim(),
    apiKey: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY,
    filter: "countrycode:in", // India ke liye fix
    limit: 5
  }
})
    console.log(data)
    let results: Place[] = (data.features ?? []).map((f: any, idx: number) => ({
      id: String(f.properties?.place_id || f.properties?.osm_id || `${f.geometry?.coordinates?.[1]}_${f.geometry?.coordinates?.[0]}_${idx}`),
      name: f.properties?.name || f.properties?.formatted || "",
      city: f.properties?.city,
      state: f.properties?.state,
      country: f.properties?.country,
      countrycode: f.properties?.countrycode,
      lat: f.geometry?.coordinates?.[1],
      lng: f.geometry?.coordinates?.[0]
    }))
    if(restrict){
      results=results.filter(r=>r.country==restrict)
    }
    setResults(results)
  } catch (error) {
    console.log(error)
     setResults([])
  }
}

 const suggestion=(p:Place)=>[p.name,p.city,p.state,p.country].filter(Boolean).join(",")
 

  const useCurrentLocation=()=>{
     if(!navigator.geolocation) return;
     setLocating(true)
     navigator.geolocation.getCurrentPosition(async ({coords})=>{
       try {
        const {data}=await axios.get("https://api.geoapify.com/v1/geocode/reverse",{
          params:{
            lat:coords.latitude,
            lon:coords.longitude,
            apiKey:process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY,
            filter:"countrycode:in"
          }
        })
        console.log(data)
       if(data.features.length){
        const p=data.features[0].properties
        const address=[p.name,p.street,p.city,p.state,p.country].filter(Boolean).join(",")
        setPickUp(address)
        setPickUpCountry(p.country)
        setPickUpLat(coords.latitude)
        setPickUpLon(coords.longitude)
        setPickUpSuggestions([])
        setLocating(false)
       }
       } catch (error) {
        console.log(error)
        setLocating(false)
       }
     })
  }
  return (
    <div className='min-h-screen bg-zinc-100 flex flex-col items-center justify-start px-4 pt-28 pb-16 relative overflow-hidden'>
      {/* Pure CSS Figma Ambient Kinetic Glows - 0% CPU cost, GPU accelerated */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[300px] bg-sky-500/5 rounded-full blur-[140px]" />
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `radial-gradient(rgba(0, 0, 0, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }} 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className='flex items-center gap-4 mb-6 px-1'>
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => router.push("/")}
            className="w-11 h-11 rounded-2xl bg-white border border-zinc-200/90 shadow-xs flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-all flex-shrink-0 cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft size={18} className='text-zinc-900' />
          </motion.button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-zinc-900 text-xl font-black tracking-tight'>Book a Ride</h1>
            <p className='text-zinc-400 text-xs mt-0.5'>Fill in the details below</p>
          </div>

          <div className='flex items-center gap-1.5 flex-shrink-0'>
            {
              [0, 1, 2, 3].map((d, i) => (
                <motion.div
                  key={i}
                  animate={{ width: i < progress ? 22 : 8, background: i < progress ? "#09090b" : "#d4d4d8" }}
                  transition={{ duration: 0.3 }}
                  className="h-2 rounded-full"
                />
              ))
            }
          </div>
        </div>

        <div className='bg-white/95 backdrop-blur-xl rounded-3xl border border-zinc-200/80 shadow-[0_12px_48px_rgba(0,0,0,0.06)] overflow-hidden relative'>
          {/* Figma Directional Rim Highlight */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-400/50 via-sky-400/50 to-indigo-500/50" />
          
          <div className='p-6 space-y-7'>

            <motion.div
              variants={stepVariants}
              initial={"hidden"}
              animate={"visible"}
              transition={{ delay: 0.05 }}
            >
              <div className='flex items-center gap-2 mb-3'>
                <div className='w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0 shadow-xs'>
                  <span className='text-white text-[9px] font-black'>1</span>
                </div>
                <p className='text-xs font-bold text-zinc-500 uppercase tracking-widest'>
                  Choose Vehicle
                </p>
              </div>

              <div className='grid grid-cols-2 gap-2.5'>
                {VEHICLES.map((v, i) => {
                  const active = vehicle == v.id
                  return (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setVehicle(v.id as vehicleType)}
                      className={`relative p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all duration-200 cursor-pointer ${active
                        ? "bg-zinc-950 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                        : "bg-zinc-50/70 border-zinc-200/80 hover:bg-white hover:border-zinc-300 hover:shadow-sm"
                        }`}
                    >

                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${active ? "bg-white text-zinc-950 shadow-sm" : "bg-zinc-200/80 text-zinc-600"
                        }`}>
                        <v.Icon size={18} />
                      </div>
                      <div className='min-w-0'>
                        <p className={`text-sm font-bold truncate ${active ? "text-white" : "text-zinc-900"}`}>{v.label}</p>
                        <p className={`text-[10px] truncate ${active ? "text-zinc-400" : "text-zinc-400"}`}>{v.desc}</p>

                      </div>

                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: active ? 1 : 0 }}
                        className="absolute top-2.5 right-2.5"
                      >
                        <CheckCircle size={14} className="text-emerald-400 fill-emerald-400/20" />
                      </motion.div>

                    </motion.div>)
                })}
              </div>
            </motion.div>

            <div className='h-px bg-zinc-200' />

            <motion.div
              variants={stepVariants}
              initial={"hidden"}
              animate={"visible"}
              transition={{ delay: 0.05 }}
            >
              <div className='flex items-center gap-2 mb-3'>
                <div className='w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0'>
                  <span className='text-white text-[9px] font-black'>2</span>
                </div>
                <p className='text-xs font-bold text-zinc-500 uppercase tracking-widest'>
                  Mobile
                </p>
              </div>

              <div className='flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 focus-within:border-zinc-900 focus-within:bg-white transition-all'>
                <div className='w-8 h-8 rounded-xl bg-zinc-200 flex items-center justify-center flex-shrink-0'>

                  <Phone size={14} className='text-zinc-600' />
                </div>
                <input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter your mobile number"
                  inputMode="numeric"
                  maxLength={15}
                  className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none"
                />
                <AnimatePresence>
                  {mobile.length == 10 && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    >
                      <CheckCircle size={16} className="text-emerald-500 fill-emerald-50 flex-shrink-0" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className='text-zinc-400 text-[10px] mt-1.5 ml-1'>Ride updates will be sent to this number</p>


            </motion.div>

            <div className='h-px bg-zinc-200' />

            <motion.div
              variants={stepVariants}
              initial={"hidden"}
              animate={"visible"}
              transition={{ delay: 0.05 }}
            >
              <div className='flex items-center gap-2 mb-3'>
                <div className='w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0'>
                  <span className='text-white text-[9px] font-black'>3</span>
                </div>
                <p className='text-xs font-bold text-zinc-500 uppercase tracking-widest'>
                  Route
                </p>
              </div>

              <div className='bg-zinc-50 border border-zinc-200 rounded-2xl overflow-visible'>

                <div className='relative z-20'>
                  <div className='flex items-center gap-3 px-4 py-3.5 focus-within:bg-white rounded-t-2xl transition-colors'>
                    <div className='flex flex-col items-center flex-shrink-0'>
                      <div className='w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow"' />
                      <div className='w-px h-5 bg-zinc-300 mt-1' />
                    </div>

                    <input
                    onChange={(e)=>{
                      setPickUp(e.target.value)
                      searchAddress(e.target.value,setPickUpSuggestions)
                    }}
                    value={pickUp}
                      placeholder="Pickup location"
                      className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none"
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        onClick={useCurrentLocation}
                        disabled={locating}
                        title="Use my current GPS location"
                        className="w-8 h-8 rounded-xl bg-zinc-200 hover:bg-zinc-300 transition-colors flex items-center justify-center"
                      >
                        <LocateFixed size={14} className={`text-zinc-700 ${locating?"animate-spin":""}`} />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          setMapPickerMode('pickup')
                          setIsMapModalOpen(true)
                        }}
                        title="Pick pickup point on map"
                        className="h-8 px-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors flex items-center gap-1 text-xs font-bold"
                      >
                        <Map size={13} className="text-zinc-700" />
                        <span>Map</span>
                      </motion.button>
                    </div>

                  </div>
                  <AnimatePresence>
                    {pickUpSuggestions?.length>0 && (
                       <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-28 overflow-y-auto "
                       >
                        {pickUpSuggestions.map((p, i) => (
                          <motion.div
                            key={`pickup-${p.id || i}-${i}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={()=>{
                              setPickUp(suggestion(p))
                              setPickUpCountry(p.country ?? "")
                              setPickUpLat(p.lat)
                              setPickUpLon(p.lng)
                              setPickUpSuggestions([])
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                          >
<MapPin size={13} className="text-zinc-400 flex-shrink-0"/>
<span className="text-sm text-zinc-800 font-medium truncate">{suggestion(p)}</span>
<ChevronRight size={13} className="text-zinc-300 flex-shrink-0 ml-auto"/>

                          </motion.div>
                        ))}

                       </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className='h-px bg-zinc-200' />
                <div className='relative z-10'>
                  <div className='flex items-center gap-3 px-4 py-3.5 focus-within:bg-white rounded-t-2xl transition-colors'>
                    <div className='flex flex-col items-center flex-shrink-0'>
                      <div className='w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow"' />
                     
                    </div>

                    <input
                    onChange={(e)=>{
                      setDrop(e.target.value)
                      searchAddress(e.target.value,setDropSuggestions,pickUpCountry || null)
                    }}
                    value={drop}
                      placeholder="Destination / Drop Location"
                      className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 outline-none"
                    />
                 
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          setMapPickerMode('drop')
                          setIsMapModalOpen(true)
                        }}
                        title="Pick destination on map"
                        className="h-8 px-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors flex items-center gap-1 text-xs font-bold shadow-xs"
                      >
                        <Map size={13} className="text-sky-600" />
                        <span>Map</span>
                      </motion.button>
                      <Navigation size={14} className='text-zinc-400 flex-shrink-0'/>
                    </div>

                  </div>
                  <AnimatePresence>
                    {dropSuggestions?.length>0 && (
                       <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto"
                       >
                        {dropSuggestions.map((p, i) => (
                          <motion.div
                            key={`drop-${p.id || i}-${i}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={()=>{
                              setDrop(suggestion(p))
                              setDropCountry(p.country ?? "")
                              setDropLat(p.lat)
                              setDropLon(p.lng)
                              setDropSuggestions([])
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                          >
<Navigation size={13} className="text-zinc-400 flex-shrink-0"/>
<span className="text-sm text-zinc-800 font-medium truncate">{suggestion(p)}</span>
<ChevronRight size={13} className="text-zinc-300 flex-shrink-0 ml-auto"/>

                          </motion.div>
                        ))}

                       </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Interactive Choose on Map Callout Card */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setMapPickerMode('drop')
                  setIsMapModalOpen(true)
                }}
                className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 border border-sky-200 hover:border-sky-400 cursor-pointer flex items-center justify-between transition-all shadow-xs group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                    <Map className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-zinc-900">Choose on Interactive Map</p>
                      <span className="text-[9px] bg-sky-500/15 text-sky-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Live Pin</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">Tap or drag pin anywhere on map to choose destination</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
              </motion.div>

            </motion.div>

              <motion.div
               variants={stepVariants} 
               initial="hidden" 
               animate="visible" 
               transition={{ delay: 0.3 }}
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  whileHover={canContinue ? { scale: 1.01 } : {}}
                  disabled={!canContinue}
                  onClick={()=>{
                    router.push(`/user/search?pickup=${encodeURIComponent(pickUp)}&drop=${encodeURIComponent(drop)}&vehicle=${vehicle}&mobile=${encodeURIComponent(mobile)}&pickuplat=${pickUpLat}&pickuplon=${pickUpLon}&droplat=${dropLat}&droplon=${dropLon}`)
                  }}
                  className="w-full h-14 rounded-2xl bg-zinc-950 hover:bg-black disabled:opacity-35 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-zinc-950/20 disabled:shadow-none cursor-pointer group"
                >
                  <span>Continue to Drivers</span>
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>

              </motion.div>

          </div>

        </div>

      </motion.div>

      {/* Interactive Map Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialMode={mapPickerMode}
        currentPickup={
          pickUpLat && pickUpLon
            ? {
                address: pickUp,
                lat: Number(pickUpLat),
                lng: Number(pickUpLon),
                country: pickUpCountry
              }
            : null
        }
        currentDrop={
          dropLat && dropLon
            ? {
                address: drop,
                lat: Number(dropLat),
                lng: Number(dropLon),
                country: dropCountry
              }
            : null
        }
        onConfirm={handleConfirmMapLocation}
      />
    </div>
  )
}

export default page
