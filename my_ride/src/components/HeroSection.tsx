'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Bike, 
  Car, 
  Truck, 
  Bus, 
  MapPin, 
  Navigation, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Map,
  Star,
  CheckCircle2,
  Radio,
  Compass
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { useRouter } from 'next/navigation'

interface HeroSectionProps {
  onAuthRequired: () => void
}

const VEHICLES = [
  { id: 'bike', label: 'Sprint Bike', icon: Bike, time: '2 min', fare: '₹35', desc: 'Fastest in traffic', tag: 'Quick' },
  { id: 'car', label: 'City Cab', icon: Car, time: '4 min', fare: '₹120', desc: 'Comfortable & AC', tag: 'Popular' },
  { id: 'suv', label: 'Executive SUV', icon: Bus, time: '6 min', fare: '₹220', desc: 'Spacious & premium', tag: 'Luxury' },
  { id: 'truck', label: 'Freight Cargo', icon: Truck, time: '10 min', fare: '₹450', desc: 'Heavy load carrier', tag: 'Cargo' },
]

export default function HeroSection({ onAuthRequired }: HeroSectionProps) {
  const { userData } = useSelector((state: RootState) => state.user)
  const router = useRouter()
  const [selectedVehicle, setSelectedVehicle] = useState('car')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')

  const handleStartBooking = () => {
    if (!userData) {
      onAuthRequired()
    } else {
      const params = new URLSearchParams()
      if (pickup && pickup !== 'Current Location') params.set('pickup', pickup)
      if (dropoff) params.set('drop', dropoff)
      if (selectedVehicle) params.set('vehicle', selectedVehicle)
      const qs = params.toString()
      router.push(qs ? `/user/book?${qs}` : '/user/book')
    }
  }

  const currentVehicle = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[1]

  return (
    <section className="relative min-h-[94vh] w-full bg-[#080B12] text-white flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Ambient Kinetic Glows & Mesh Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.035]" 
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '28px 28px'
          }} 
        />
        {/* Soft Radial Ambient Lights */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/3 translate-y-1/3 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: Booking Console & Headline */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            
            {/* Live Telemetry Radar Pill */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-lg"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-zinc-300">
                480+ active drivers nearby
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                <Zap size={11} /> Avg. 3 min pickup
              </span>
            </motion.div>

            {/* Classy, Clean Headline */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="space-y-3"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Effortless rides, <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  instant dispatch.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-xl font-normal leading-relaxed">
                Connect seamlessly with verified drivers for city commutes, quick bike sprints, luxury SUVs, or commercial freight. Upfront transparent fares with zero surge surprises.
              </p>
            </motion.div>

            {/* Refined Obsidian Kinetic Booking Widget */}
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="bg-zinc-900/80 border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl relative overflow-hidden"
            >
              {/* Subtle top edge gradient rim */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

              {/* Vehicle Class Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-white/[0.08] scrollbar-none relative">
                {VEHICLES.map((v) => {
                  const Icon = v.icon
                  const isSelected = selectedVehicle === v.id
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicle(v.id)}
                      className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-colors z-10 cursor-pointer ${
                        isSelected ? 'text-zinc-950 font-extrabold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {/* Fluid sliding pill background */}
                      {isSelected && (
                        <motion.div
                          layoutId="activeVehiclePill"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          className="absolute inset-0 bg-white rounded-2xl shadow-md -z-10"
                        />
                      )}
                      <Icon size={16} className={isSelected ? 'text-zinc-950' : 'text-zinc-400'} />
                      <span>{v.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isSelected ? 'bg-zinc-950/10 text-zinc-900' : 'bg-white/5 text-zinc-500'
                      }`}>
                        {v.time}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Connected Route Inputs */}
              <div className="mt-5 space-y-3">
                {/* Pickup Field */}
                <div className="flex items-center bg-zinc-950/90 rounded-2xl px-4 py-3.5 border border-white/10 focus-within:border-emerald-400/80 transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mr-3.5 ring-4 ring-emerald-400/20" />
                  <input
                    type="text"
                    placeholder="Enter pickup location"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-medium"
                  />
                  <button 
                    type="button"
                    onClick={() => setPickup('Current Location')}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 ml-2 shrink-0 cursor-pointer bg-emerald-950/40 hover:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-all"
                  >
                    Locate
                  </button>
                </div>

                {/* Dropoff Field */}
                <div className="flex items-center bg-zinc-950/90 rounded-2xl px-4 py-3.5 border border-white/10 focus-within:border-cyan-400/80 transition-all">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 mr-3.5 ring-4 ring-cyan-400/20" />
                  <input
                    type="text"
                    placeholder="Where to? (Destination)"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!userData) {
                        onAuthRequired()
                      } else {
                        const params = new URLSearchParams()
                        params.set('mode', 'drop_map')
                        if (pickup && pickup !== 'Current Location') params.set('pickup', pickup)
                        if (dropoff) params.set('drop', dropoff)
                        if (selectedVehicle) params.set('vehicle', selectedVehicle)
                        router.push(`/user/book?${params.toString()}`)
                      }
                    }}
                    title="Choose destination on interactive map"
                    className="flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200 ml-2 shrink-0 cursor-pointer bg-cyan-950/50 hover:bg-cyan-900/60 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-all"
                  >
                    <Map size={13} />
                    <span>Map</span>
                  </button>
                </div>
              </div>

              {/* Action & Rate Footer Strip */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-zinc-400">Est. {currentVehicle.label}:</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentVehicle.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="text-white font-black text-base"
                    >
                      {currentVehicle.fare}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-zinc-600">•</span>
                  <span className="text-emerald-400 font-semibold">{currentVehicle.desc}</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartBooking}
                  className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <span>Request Ride</span>
                  <ArrowRight size={16} />
                </motion.button>
              </div>

            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-5 sm:gap-8 text-xs text-zinc-400 font-medium"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>100% Video KYC Drivers</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-cyan-400" />
                <span>Instant OTP Verification</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-teal-400" />
                <span>Zero Hidden Fares</span>
              </div>
            </motion.div>

          </div>

          {/* RIGHT COLUMN: Interactive Live Radar & Chauffeur Cockpit Card */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2 }}
              className="relative rounded-3xl bg-zinc-900/70 border border-white/10 p-6 shadow-2xl backdrop-blur-2xl overflow-hidden space-y-5"
            >
              {/* Radar Simulation Background */}
              <div className="relative h-44 rounded-2xl bg-zinc-950/80 border border-white/10 overflow-hidden flex items-center justify-center">
                {/* Concentric Radar Rings */}
                <div className="absolute w-64 h-64 rounded-full border border-emerald-500/10 animate-ping duration-1000" />
                <div className="absolute w-48 h-48 rounded-full border border-emerald-500/15" />
                <div className="absolute w-32 h-32 rounded-full border border-cyan-500/20" />
                <div className="absolute w-16 h-16 rounded-full border border-emerald-400/30" />
                
                {/* Center User Beacon */}
                <div className="relative z-10 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-emerald-400/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                </div>

                {/* Floating Driver Dots */}
                <motion.div 
                  animate={{ x: [0, 10, 0], y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-10 right-14 flex items-center gap-1.5 bg-zinc-900/90 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md"
                >
                  <Car size={12} className="text-emerald-400" />
                  <span>2 min</span>
                </motion.div>

                <motion.div 
                  animate={{ x: [0, -8, 0], y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="absolute bottom-8 left-12 flex items-center gap-1.5 bg-zinc-900/90 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md"
                >
                  <Bike size={12} className="text-cyan-400" />
                  <span>1 min</span>
                </motion.div>

                <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-[10px] font-bold text-zinc-300">
                  <Radio size={11} className="text-emerald-400 animate-pulse" />
                  <span>LIVE RADAR</span>
                </div>
              </div>

              {/* Chauffeur Preview Card */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 font-black text-base flex items-center justify-center shadow-md">
                      RK
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-zinc-950 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={10} className="text-zinc-950 stroke-[3]" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-white">Captain Rahul K.</h4>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/20">
                        <Star size={10} className="fill-amber-400" /> 4.98
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">Toyota Camry Hybrid • KA-05-MR-4412</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Pickup</span>
                  <span className="text-sm font-black text-white">~3 mins</span>
                </div>
              </div>

              {/* Fleet Metric Highlights */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Avg Speed</p>
                  <p className="text-sm font-black text-white mt-0.5">38 km/h</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">KYC Pass</p>
                  <p className="text-sm font-black text-emerald-400 mt-0.5">100%</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Surge Rate</p>
                  <p className="text-sm font-black text-cyan-400 mt-0.5">1.0x Flat</p>
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
