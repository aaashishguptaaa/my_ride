'use client'
import React from 'react'
import { motion } from 'motion/react'
import { ShieldAlert, Video, Sparkles, Navigation, DollarSign, Smartphone } from 'lucide-react'

export default function FeaturesBento() {
  return (
    <section id="safety" className="w-full bg-zinc-900 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            Advanced Technology
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Built for Safety, Speed & Comfort
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4">
            Next-generation safety protocols and real-time smart features built directly into every booking.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Video KYC (Span 2) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 bg-gradient-to-br from-zinc-950 to-zinc-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="relative z-10 max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-6">
                <Video size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                100% Video KYC Verified Drivers
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Every single partner undergoes live video verification with administrators before picking up passengers. Full document review, vehicle registration, and background verification.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300">Face Recognition</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300">Live Admin Call</span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Verified Badge</span>
            </div>
          </motion.div>

          {/* Card 2: AI Suggestions (Span 1) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Gemini AI In-Ride Chat
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Smart quick replies suggested in real-time. Communicate pick-up instructions with your driver hands-free in a single tap.
              </p>
            </div>
            <div className="mt-6 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-blue-300 italic">
              "I'm waiting near the main entrance 👋"
            </div>
          </motion.div>

          {/* Card 3: Realtime Socket (Span 1) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-6">
              <Navigation size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Sub-Second Live Tracking
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Powered by custom WebSocket engine. Track driver coordinates in real-time on interactive Leaflet maps with zero lag.
            </p>
          </motion.div>

          {/* Card 4: Transparent Pricing (Span 2) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="md:col-span-2 bg-gradient-to-br from-zinc-950 to-zinc-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-6">
                <DollarSign size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Transparent Pricing, Zero Hidden Surges
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                What you see is what you pay. Pay seamlessly using Razorpay UPI, Netbanking, Cards, or Cash directly to the driver after completing your trip.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
                💳 Razorpay Fast Checkout
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
                📱 Instant UPI & QR
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
                💵 Cash on Drop Option
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
