'use client'
import React from 'react'
import { motion } from 'motion/react'
import { Users, Car, Shield, Clock } from 'lucide-react'

const STATS = [
  { label: 'Completed Rides', value: '50,000+', icon: Car, change: '+24% this month' },
  { label: 'Active Drivers', value: '2,500+', icon: Users, change: 'Video KYC verified' },
  { label: 'Average Pickup Time', value: '< 3.5 mins', icon: Clock, change: 'Ultra-fast dispatch' },
  { label: 'Customer Satisfaction', value: '99.2%', icon: Shield, change: '4.9 ★ average rating' },
]

export default function StatsSection() {
  return (
    <section className="w-full bg-zinc-900 border-y border-white/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {STATS.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center sm:items-start text-center sm:text-left p-4 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <Icon size={20} />
                </div>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  {stat.value}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-300 mt-1">
                  {stat.label}
                </span>
                <span className="text-[11px] text-zinc-500 mt-0.5 font-medium">
                  {stat.change}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
