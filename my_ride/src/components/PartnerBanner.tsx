'use client'
import React from 'react'
import { motion } from 'motion/react'
import { ArrowRight, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

interface PartnerBannerProps {
  onAuthRequired: () => void
}

export default function PartnerBanner({ onAuthRequired }: PartnerBannerProps) {
  const router = useRouter()
  const { userData } = useSelector((state: RootState) => state.user)

  const handleJoinPartner = () => {
    if (!userData) {
      onAuthRequired()
    } else {
      router.push('/partner/onboarding/vehicle')
    }
  }

  return (
    <section className="w-full bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-950 border border-emerald-500/20 p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <TrendingUp size={14} />
                Become a Rider with MY_RIDE
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Turn Your Vehicle into Daily Earnings
              </h2>
              <p className="mt-4 text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
                Whether you drive a bike, auto, personal car, luxury SUV, or cargo truck, earn with India's lowest platform commission and instant weekly payouts.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm font-semibold text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Lowest Platform Fee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Daily & Weekly Payouts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Quick Video KYC Setup</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleJoinPartner}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-black text-base flex items-center justify-center gap-3 shadow-2xl transition-all cursor-pointer"
              >
                <span>Register As Rider</span>
                <ArrowRight size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
