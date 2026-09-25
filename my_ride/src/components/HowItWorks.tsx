'use client'
import React from 'react'
import { motion } from 'motion/react'
import { MapPin, Navigation, ShieldCheck, CreditCard } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    title: 'Choose Vehicle & Route',
    desc: 'Select from agile bikes to roomy city cabs and heavy cargo trucks. Input pickup and destination with upfront estimated fare.',
    icon: MapPin,
    badge: 'Step 1'
  },
  {
    step: '02',
    title: 'Instant Driver Matching',
    desc: 'Our real-time Socket.io engine assigns the nearest top-rated, Video KYC verified driver to your route in seconds.',
    icon: Navigation,
    badge: 'Step 2'
  },
  {
    step: '03',
    title: 'Track & Pay Securely',
    desc: 'Watch your driver approach on the live map. Verify pickup OTP, chat with AI suggestions, and pay with Razorpay or cash.',
    icon: CreditCard,
    badge: 'Step 3'
  }
]

export default function HowItWorks() {
  return (
    <section className="w-full bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4"
          >
            Simple & Transparent
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight"
          >
            How MY_RIDE Works in 3 Steps
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-zinc-400 mt-4"
          >
            From booking to arrival, our intelligent platform keeps you informed and in control at every turn.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-emerald-500/50 transition-all hover:bg-zinc-900/80 shadow-xl"
              >
                <div className="absolute top-6 right-6 text-4xl sm:text-5xl font-black text-white/5 group-hover:text-emerald-500/10 transition-colors select-none">
                  {s.step}
                </div>

                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-all">
                  <Icon size={24} />
                </div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                  {s.badge}
                </span>

                <h3 className="text-xl font-bold text-white mt-4 mb-2">
                  {s.title}
                </h3>

                <p className="text-sm text-zinc-400 leading-relaxed font-normal">
                  {s.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
