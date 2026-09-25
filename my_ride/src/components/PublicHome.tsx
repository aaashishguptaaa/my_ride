'use client'
import React, { useState } from 'react'
import HeroSection from './HeroSection'
import VehicleSlider from './VehicleSlider'
import HowItWorks from './HowItWorks'
import PartnerBanner from './PartnerBanner'
import AuthModal from './AuthModal'

function PublicHome() {
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <main className="w-full bg-zinc-950 overflow-x-hidden">
      {/* Dynamic Hero Section */}
      <HeroSection onAuthRequired={() => setAuthOpen(true)} />

      {/* Vehicle Category Slider */}
      <VehicleSlider />

      {/* How It Works in 3 Steps */}
      <HowItWorks />

      {/* Driver Partner Onboarding Banner */}
      <PartnerBanner onAuthRequired={() => setAuthOpen(true)} />

      {/* Auth Modal for Sign in / Sign up */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  )
}

export default PublicHome
