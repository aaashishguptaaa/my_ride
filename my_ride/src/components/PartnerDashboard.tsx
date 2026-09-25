'use client'
import { RootState } from '@/redux/store';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { motion } from "motion/react"
import { ArrowRight, ArrowRightLeft, Check, Clock, Lock, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RejectionCard from './RejectionCard';
import StatusCard from './StatusCard';
import ActionCard from './ActionCard';
import axios from 'axios';
import PricingModal from './PricingModal';
import { IVehicle } from '@/models/vehicle.model';
import PartnerEarning from './PartnerEarning';
import { setUserData } from '@/redux/userSlice';
type Step = {
    id: number,
    title: string,
    route?: string
};

/* ================= STEPS ================= */

const STEPS: Step[] = [
    { id: 1, title: "Vehicle", route: "/partner/onboarding/vehicle" },
    { id: 2, title: "Documents", route: "/partner/onboarding/documents" },
    { id: 3, title: "Bank", route: "/partner/onboarding/bank" },
    { id: 4, title: "Review" },
    { id: 5, title: "Video KYC" },
    { id: 6, title: "Pricing" },
    { id: 7, title: "Final Review" },
    { id: 8, title: "Live" },
];

const TOTAL_STEPS = STEPS.length;

function PartnerDashboard() {
    const [activeStep, setActiveStep] = useState(0)
    const { userData } = useSelector((state: RootState) => state.user)
    const router = useRouter()
    const dispatch = useDispatch()
    const [switchingRole, setSwitchingRole] = useState(false)
    const [requestLoading,setRequestLoading]=useState(false)
    const [showPricing,setShowPricing]=useState(false)
    const [vehicleData,setVehicleData]=useState<IVehicle | null>(null)
    const [isOnline, setIsOnline] = useState<boolean>(true)
    const [togglingOnline, setTogglingOnline] = useState<boolean>(false)

    const fetchPartnerStatus = async () => {
        try {
            const { data } = await axios.get("/api/partner/status")
            if (typeof data?.isOnline === "boolean") {
                setIsOnline(data.isOnline)
            }
        } catch (error) {
            console.error("Error fetching partner status:", error)
        }
    }

    const handleToggleOnline = async () => {
        if (togglingOnline) return
        setTogglingOnline(true)
        const nextStatus = !isOnline
        try {
            const { data } = await axios.post("/api/partner/status", { isOnline: nextStatus })
            if (typeof data?.isOnline === "boolean") {
                setIsOnline(data.isOnline)
            } else {
                setIsOnline(nextStatus)
            }
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("partner-status-changed", { detail: { isOnline: nextStatus } }))
            }
        } catch (error: any) {
            console.error("Toggle online status error:", error)
            alert(error.response?.data?.message || "Failed to update online status")
        } finally {
            setTogglingOnline(false)
        }
    }

    const handleSwitchToPassenger = async () => {
        if (switchingRole) return
        setSwitchingRole(true)
        try {
            const { data } = await axios.post("/api/user/switch-role", { targetRole: "user" })
            if (data?.user) {
                dispatch(setUserData(data.user))
            }
            router.push("/")
            router.refresh()
            setTimeout(() => {
                window.location.href = "/"
            }, 100)
        } catch (error: any) {
            console.error("Switch to passenger error:", error)
            alert(error.response?.data?.message || "Failed to switch to passenger mode")
            setSwitchingRole(false)
        }
    }

    useEffect(() => {
        if (userData) {
            setActiveStep(userData.partnerOnBoardingSteps + 1)
        }
    }, [userData])

    const handleGetPricing=async ()=>{
        try {
            const {data}=await axios.get("/api/partner/onboarding/pricing")
            console.log(data)
            setVehicleData(data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(()=>{
        fetchPartnerStatus()
        handleGetPricing()
    },[])

    useEffect(() => {
        const handleStatusChanged = (e: any) => {
            if (typeof e.detail?.isOnline === "boolean") {
                setIsOnline(e.detail.isOnline)
            }
        }
        window.addEventListener("partner-status-changed", handleStatusChanged)
        return () => window.removeEventListener("partner-status-changed", handleStatusChanged)
    }, [])

    const goToStep = (step: Step) => {

        if(step.id==6 && userData?.partnerStatus==="approved" && userData.videoKycStatus==="approved"){
            setShowPricing(true)
            return;
        }
        if (step.route && step.id <= activeStep) {
            router.push(step.route)
        }
    }

    const progressPercentage = ((activeStep - 1) / (TOTAL_STEPS - 1)) * 100
    return (
        <div className='min-h-screen bg-linear-to-br from-gray-100 to-gray-200 px-4 pt-28 pb-20'>
            <div className='max-w-7xl mx-auto space-y-16'>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className='text-3xl sm:text-4xl font-bold'>Partner Onboarding</h1>
                        <p className='text-gray-600 mt-2 text-sm'>
                            {activeStep >= 8 ? "You are fully verified and active as a Rider." : "Complete all steps to activate your account"}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {activeStep >= 8 && (
                            <button
                                onClick={handleToggleOnline}
                                disabled={togglingOnline}
                                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition shadow-sm cursor-pointer ${
                                    isOnline
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                        : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                                }`}
                                title="Toggle Online / Offline status"
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                                <span>{isOnline ? "Online (Accepting Rides)" : "Offline (Hidden)"}</span>
                            </button>
                        )}
                        <button
                            onClick={handleSwitchToPassenger}
                            disabled={switchingRole}
                            className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-xl transition-all cursor-pointer border border-zinc-800"
                        >
                            {switchingRole ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ArrowRightLeft size={16} className="text-blue-400" />
                            )}
                            <span>Switch to Passenger Mode</span>
                        </button>
                    </div>
                </div>

                <div className='bg-white rounded-3xl p-10 shadow-xl border overflow-x-auto'>
                    <div className='relative min-w-[800px]'>

                        <div className='absolute top-7 left-0 w-full h-[3px] bg-gray-200 rounded-full' />
                        <motion.div
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.6 }}
                            className="absolute top-7 left-0 h-[3px] bg-black rounded-full"
                        />
                        <div className='relative flex justify-between'>
                            {STEPS.map((s, index) => {
                                const completed = s.id < activeStep
                                const active = s.id == activeStep
                                const locked = s.id > activeStep

                                return (
                                    <motion.div
                                        key={s.id}
                                        whileHover={!locked ? { scale: 1.1 } : {}}
                                        onClick={() => goToStep(s)}
                                        className="flex flex-col items-center z-10 cursor-pointer"
                                    >
                                        <div
                                            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all
                                                     ${completed
                                                    ? "bg-black text-white border-black"
                                                    : active
                                                        ? "border-black bg-white"
                                                        : "border-gray-300 text-gray-400 bg-white"
                                                }`}
                                        >
                                            {
                                                completed ? (
                                                    <Check size={20} />
                                                ) : locked ? (
                                                    <Lock size={20} />
                                                ) : (
                                                    s.id
                                                )
                                            }

                                        </div>
                                        <p className='mt-3 text-sm font-semibold text-center'>{s.title}</p>

                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {
                    activeStep == 4 && userData?.partnerStatus === "rejected" && (
                        <RejectionCard
                            title="Partner Rejected"
                            reason={userData.rejectionReason}
                            actionLabel={`Review and Update`}
                            onAction={() => {
                                router.push("/partner/onboarding/vehicle")
                            }}
                        />
                    )

                }

                {
                    activeStep == 4 && userData?.partnerStatus === "pending" && (
                        <StatusCard
                            icon={<Clock size={18} />}
                            title={"Documents under review"}
                            desc={"Admin is verifying your documents."}
                        />
                    )
                }



                {
                    activeStep==5 && (
                    userData?.videoKycStatus === "approved" ? (
                        <StatusCard
                            icon={<Check size={18} />}
                            title={"video kyc approved"}
                            desc={"You can now proceed to pricing."}
                        />
                    ) :   userData?.videoKycStatus === "rejected" ? (
                        <RejectionCard
                            title="Video KYC Rejected"
                            reason={userData?.videoKycRejectionReason}
                            actionLabel={requestLoading?"Requesting...":"Request Again"}
                            onAction={async ()=>{
                                setRequestLoading(true)
                              await axios.get("/api/partner/video-kyc/request")
                              setRequestLoading(false)
                            }}
                        />
                    ):   userData?.videoKycStatus === "in_progress" && userData?.videoKycRoomId ?(
                        <ActionCard
                        icon={<Video size={18}/>}
                        title={"Admin Started Video KYC"}
                        button={"Join Call"}
                        onclick={
                            ()=>router.push(`/video-kyc/${userData.videoKycRoomId}`)
                        }
                        />
                    ):
                    <StatusCard
                     icon={<Clock size={20} />}
                     title="Waiting for Admin"
                      desc="Admin will initiate Video KYC shortly."
                    />
                )

                
            
                }

                

{activeStep==7  && vehicleData?.status=="pending" && (
    <StatusCard
     icon={<Clock size={20} />}
        title="Pricing Under Review"
        desc="Admin is reviewing your pricing."
    />
)}
{activeStep==7  && vehicleData?.status=="rejected" && (
    <RejectionCard
      title="Pricing Rejected"
        reason={vehicleData.rejectionReason}
        actionLabel="Edit & Resubmit"
        onAction={() => setShowPricing(true)}
    />
)}

{activeStep==8 && vehicleData?.status=="approved" && (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-950 text-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 relative overflow-hidden"
    >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
                <div className="mb-3">
                    {isOnline ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live & Online
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-zinc-500" /> Offline (Hidden)
                        </span>
                    )}
                </div>
                <h2 className='text-2xl sm:text-3xl font-black text-white'>
                    {isOnline ? "🚀 You're Online & Ready to Earn" : "⏸️ You are Currently Offline"}
                </h2>
                <p className="text-sm text-zinc-400 mt-2 max-w-lg">
                    {isOnline
                        ? `Vehicle ${vehicleData?.vehicleModel || ''} (${vehicleData?.number || 'Active'}) is online and visible to nearby passengers. You'll receive real-time dispatch alerts.`
                        : `Your vehicle is hidden from passenger search results. Switch to Online when you are ready to receive ride requests.`}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={handleToggleOnline}
                    disabled={togglingOnline}
                    className={`px-5 py-3.5 rounded-2xl font-bold text-sm transition-all border cursor-pointer ${
                        isOnline
                            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                            : "bg-emerald-400 hover:bg-emerald-300 text-zinc-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/20"
                    }`}
                >
                    {isOnline ? "Go Offline" : "Go Online Now"}
                </button>
                <button 
                    onClick={() => router.push("/partner/pending-requests")}
                    className='bg-emerald-400 hover:bg-emerald-300 text-zinc-950 px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer'
                >
                    View Ride Requests <ArrowRight size={16}/>
                </button>
                <button 
                    onClick={() => router.push("/partner/active-ride")}
                    className='bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-3.5 rounded-2xl font-bold text-sm transition-all border border-white/10 cursor-pointer'
                >
                    Active Ride Cockpit
                </button>
            </div>
        </div>
    </motion.div>
)}


          <PartnerEarning/>
            </div>
          
          <PricingModal
          open={showPricing}
          onClose={()=>setShowPricing(false)}
          data={vehicleData}
          />


        </div>
    )
}

export default PartnerDashboard
