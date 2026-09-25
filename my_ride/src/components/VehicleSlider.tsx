'use client'
import { Bike, Bus, Car, CarTaxiFront, ChevronLeft, ChevronRight, Sparkles, Truck, ArrowRight } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { motion } from "motion/react"
import { useRouter } from 'next/navigation'

const VEHICLE_CATEGORIES = [
  { id: 'all', vehicleParam: '', title: "All Vehicles", desc: "Browse the full fleet & pricing", Icon: CarTaxiFront, tag: "Popular", color: "text-emerald-400" },
  { id: 'bike', vehicleParam: 'bike', title: "Sprint Bikes", desc: "Fast & affordable city rides", Icon: Bike, tag: "Quick", color: "text-cyan-400" },
  { id: 'car', vehicleParam: 'car', title: "City Cabs", desc: "Comfortable air-conditioned cars", Icon: Car, tag: "Comfort", color: "text-teal-400" },
  { id: 'suv', vehicleParam: 'car', title: "Executive SUVs", desc: "Spacious premium luxury transport", Icon: Bus, tag: "Premium", color: "text-emerald-400" },
  { id: 'van', vehicleParam: 'car', title: "Multi-seater Vans", desc: "Family & group airport transfers", Icon: Bus, tag: "Family", color: "text-cyan-400" },
  { id: 'truck', vehicleParam: 'truck', title: "Freight Trucks", desc: "Heavy commercial & cargo moving", Icon: Truck, tag: "Cargo", color: "text-amber-400" },
]

function VehicleSlider() {
  const router = useRouter()
  const [hovered, setHovered] = useState<number | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  // Smooth button scroll
  const scroll = (dir: "left" | "right") => {
    if (!sliderRef.current) return
    const scrollAmount = window.innerWidth < 640 ? 260 : 320
    sliderRef.current.scrollBy({ 
      left: dir === "left" ? -scrollAmount : scrollAmount, 
      behavior: "smooth" 
    })
  }

  // Workable card link navigation
  const handleCardClick = (vehicleParam: string) => {
    if (vehicleParam) {
      router.push(`/user/book?vehicle=${vehicleParam}`)
    } else {
      router.push('/user/book')
    }
  }

  return (
    <div id="fleet" className='w-full bg-[#0B0F19] border-t border-white/[0.08] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden'>
      <div className='max-w-7xl mx-auto'>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-8 sm:mb-10"
        >
          <div>
            <div className='flex items-center gap-2 mb-3'>
              <div className='h-px w-8 bg-emerald-400' />
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400'>Fleet Showcase</span>
            </div>
            <h2 className='text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight'>
              Explore Available <br />
              <span className='bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent'>
                Vehicle Classes
              </span>
            </h2>
            <p className='text-zinc-400 text-xs sm:text-sm mt-2 sm:mt-3 font-normal max-w-lg'>
              Tap any vehicle class to instantly configure your route or swipe to explore the entire fleet.
            </p>
          </div>

          {/* Nav arrow controls - visible on mobile & desktop for accessibility */}
          <div className='flex items-center gap-2'>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => scroll("left")}
              aria-label="Scroll Left"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border border-white/10 bg-zinc-900/80 flex items-center justify-center hover:bg-emerald-400 hover:text-zinc-950 active:bg-emerald-400 text-zinc-300 transition-all shadow-md cursor-pointer"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => scroll("right")}
              aria-label="Scroll Right"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border border-white/10 bg-zinc-900/80 flex items-center justify-center hover:bg-emerald-400 hover:text-zinc-950 active:bg-emerald-400 text-zinc-300 transition-all shadow-md cursor-pointer"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

        {/* Scrollable Container with Smooth Native Finger Swiping & Snap */}
        <div className='relative'>
          <div
            ref={sliderRef}
            tabIndex={0}
            className="flex gap-4 sm:gap-5 pt-2 overflow-x-auto scroll-smooth pb-6 px-1 touch-pan-x snap-x snap-mandatory overscroll-x-contain select-none cursor-grab active:cursor-grabbing scrollbar-none"
            style={{ 
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none", 
              msOverflowStyle: "none" 
            }}
          >
            {VEHICLE_CATEGORIES.map((c, i) => {
              const isHovered = hovered === i
              return (
                <div
                  key={c.id}
                  onClick={() => handleCardClick(c.vehicleParam)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="snap-start group relative min-w-[240px] sm:min-w-[280px] flex-shrink-0 cursor-pointer transition-transform duration-200 active:scale-[0.98]"
                >
                  <div
                    className={`relative rounded-3xl p-6 overflow-hidden h-full border transition-all duration-300 flex flex-col justify-between ${
                      isHovered 
                        ? 'bg-zinc-850/95 border-emerald-400/60 shadow-2xl shadow-emerald-500/15 -translate-y-1.5' 
                        : 'bg-zinc-900/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center gap-1.5 border text-[10px] font-black uppercase tracking-[0.16em] px-2.5 py-1 rounded-full ${
                          isHovered 
                            ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10' 
                            : 'border-white/10 text-zinc-400 bg-white/5'
                        }`}>
                          <Sparkles size={10} />
                          {c.tag}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-500 group-hover:text-emerald-400 transition-colors">
                          Tap to Book
                        </span>
                      </div>

                      <div className={`w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center mb-4 transition-all ${
                        isHovered ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40' : 'bg-zinc-950/80 text-zinc-300'
                      }`}>
                        <c.Icon size={26} strokeWidth={1.8} className={c.color} />
                      </div>

                      <h3 className="text-lg font-bold tracking-tight text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                        {c.title}
                      </h3>

                      <p className="text-xs text-zinc-400 font-normal leading-relaxed">
                        {c.desc}
                      </p>
                    </div>

                    {/* Workable Link CTA Strip */}
                    <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">
                      <span className="text-[11px] group-hover:text-emerald-400 transition-colors">Select & Ride</span>
                      <div className="w-7 h-7 rounded-xl bg-white/5 group-hover:bg-emerald-400 group-hover:text-zinc-950 flex items-center justify-center transition-all">
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Fleet Counter Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-6 sm:gap-12 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/[0.08]"
        >
          {[
            { num: "4+", label: "Dynamic Vehicle Classes" },
            { num: "2,500+", label: "Verified Active Drivers" },
            { num: "24 / 7", label: "Instant Live Availability" },
            { num: "0%", label: "Surge Price Gouging" },
          ].map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <p className='text-emerald-400 text-lg sm:text-xl font-black tracking-tight'>{d.num}</p>
              <p className='text-zinc-400 text-[11px] sm:text-xs font-medium'>{d.label}</p>
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  )
}

export default VehicleSlider
