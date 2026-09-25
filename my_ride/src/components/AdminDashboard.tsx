'use client'
import axios from 'axios'
import { CheckCircle2, Clock, LogOut, Settings, Truck, User, Users, Video, XCircle } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Logo from './Logo'
import React, { useEffect, useState } from 'react'
import Kpi from './Kpi'
import TabButton from './TabButton'
import { AnimatePresence } from 'motion/react'
import { motion } from "motion/react"
import ContentList from './ContentList'
import AdminEarning from './AdminEarning'
import AdminRidersDirectory from './AdminRidersDirectory'
type Stats = {
  totalApprovedPartners: number
  totalPartners: number
  totalPendingPartners: number
  totalRejectedPartners: number
}

type Tab = "partner" | "kyc" | "vehicle" | "riders"
function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("partner")
  const [partnerReviews, setPartnerReviews] = useState<any>()
  const [pendingkyc, setPendingkyc] = useState<any>()
  const [vehicleReviews, setVehicleReviews] = useState<any>()
  const handleGetData = async () => {
    try {
      const { data } = await axios.get("/api/admin/dashboard")
      setStats(data.stats)
      setPartnerReviews(data.pendingPartnersReviews)
      setVehicleReviews(data.pendingVehicles)
    } catch (error) {
      console.log(error)
    }
  }
  const handleGetPendingKYC = async () => {
    try {
      const { data } = await axios.get("/api/admin/video-kyc/pending")
      setPendingkyc(data)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    handleGetPendingKYC()
    handleGetData()
  }, [])
  return (
    <div className='min-h-screen bg-linear-to-br from-gray-100 to-gray-200 pt-24 pb-16'>
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12'>
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <div>
            <h1 className='text-3xl font-extrabold text-gray-900 tracking-tight'>Admin Command Center</h1>
            <p className='text-sm text-gray-500 mt-1'>Review driver partner applications, verify KYC, and monitor fleet earnings.</p>
          </div>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-4 gap-6'>
          <Kpi label="Total Partners" value={stats?.totalPartners} icon={<Users />} variant={"totalPartners"} />
          <Kpi label="Approved Partners" value={stats?.totalApprovedPartners} icon={<CheckCircle2 />} variant={"approved"} />
          <Kpi label="Pending Partners" value={stats?.totalPendingPartners} icon={<Clock />} variant={"pending"} />
          <Kpi label="Rejected Partners" value={stats?.totalRejectedPartners} icon={<XCircle />} variant={"rejected"} />
        </div>

        <div id="partner-reviews" className='bg-white rounded-2xl p-2 shadow-lg border border-gray-100 flex flex-wrap gap-2'>
          <TabButton
            active={activeTab == "partner"}
            count={partnerReviews?.length ?? 0}
            icon={<Users size={15} />}
            onClick={() => setActiveTab("partner")}
          >
            Pending Partner Reviews
          </TabButton>

          <TabButton
            active={activeTab == "kyc"}
            count={pendingkyc?.length ?? 0}
            icon={<Video size={15} />}
            onClick={() => setActiveTab("kyc")}
          >
            Pending Video KYC
          </TabButton>

          <TabButton
            active={activeTab == "vehicle"}
            count={vehicleReviews?.length ?? 0}
            icon={<Truck size={15} />}
            onClick={() => setActiveTab("vehicle")}
          >
            Pending Vehicle Reviews
          </TabButton>

          <TabButton
            active={activeTab == "riders"}
            icon={<Users size={15} />}
            onClick={() => setActiveTab("riders")}
          >
            Riders & Ride History
          </TabButton>
        </div>
        <AnimatePresence mode='wait'>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-3"
          >
{activeTab=="partner"&& <ContentList data={partnerReviews ?? []} type={"partner"}/>}
{activeTab=="kyc"&& <ContentList data={pendingkyc ?? []} type={"kyc"}/>}
{activeTab=="vehicle"&& <ContentList data={vehicleReviews ?? []} type={"vehicle"}/>}
{activeTab=="riders"&& <AdminRidersDirectory/>}
          </motion.div>
        </AnimatePresence>

      <AdminEarning/>

      </main>


    </div>
  )
}

export default AdminDashboard
