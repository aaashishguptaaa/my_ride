'use client'
import { BookingStatus, IBooking, PaymentStatus } from '@/models/booking.model'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { AlertCircle, ArrowLeft, ArrowRight, Banknote, Car, CheckCircle2, ChevronUp, IndianRupee, KeyRound, MapPin, Navigation, Zap } from 'lucide-react'

import dynamic from 'next/dynamic'
const LiveRideMap=dynamic(() => import("@/components/LiveRideMap"), { ssr: false })

import PanelContent from '@/components/PanelContent'
import { getSocket } from '@/lib/socket'
import CompletedScreen from '@/components/CompletedScreen'
import { useRouter } from 'next/navigation'


const MAP_STATUS: Record<BookingStatus, "arriving" | "ongoing" | "completed"> = {
    idle: "arriving",
    requested: "arriving",
    awaiting_payment: "arriving",
    confirmed: "arriving",
    started: "ongoing",
    completed: "completed",
    cancelled: "completed",
    rejected: "completed",
    expired: "completed",
};

const STATUS_LABEL: Record<BookingStatus, { label: string; sublabel: string; dot: string }> = {
    idle: { label: "Awaiting Confirmation", sublabel: "Booking is being processed", dot: "bg-amber-400" },
    requested: { label: "Awaiting Confirmation", sublabel: "Booking is being processed", dot: "bg-amber-400" },
    awaiting_payment: { label: "Payment Pending", sublabel: "Customer payment is pending", dot: "bg-purple-400" },
    confirmed: { label: "Heading to Pickup", sublabel: "Drive to the pickup location", dot: "bg-amber-400" },
    started: { label: "Ride in Progress", sublabel: "Heading to drop location", dot: "bg-emerald-400" },
    completed: { label: "Ride Completed", sublabel: "Trip has ended successfully", dot: "bg-zinc-400" },
    cancelled: { label: "Ride Cancelled", sublabel: "This ride was cancelled", dot: "bg-red-400" },
    rejected: { label: "Ride Rejected", sublabel: "Ride was rejected", dot: "bg-red-400" },
    expired: { label: "Request Expired", sublabel: "Booking timed out", dot: "bg-orange-400" },
};


const PAYMENT_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-700" },
    cash: { label: "Cash", cls: "bg-zinc-100 text-zinc-700" },
    failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
};

function page() {
    const [booking, setBooking] = useState<IBooking | null>(null)
    const [loading, setLoading] = useState(false)
    const [driverPos, setDriverPos] = useState<[number, number] | null>(null)
    const [pickUpPos, setPickUpPos] = useState<[number, number] | null>(null)
    const [dropPos, setDropPos] = useState<[number, number] | null>(null)
    const [distanceToPickUp, setDistanceToPickUp] = useState(0)
    const [distanceToDrop, setDistanceToDrop] = useState(0)
    const [etaToPickUp, setEtaToPickUp] = useState(0)
    const [etaToDrop, setEtaToDrop] = useState(0)
    const [status, setStatus] = useState("")
    const [chatOpen, setChatOpen] = useState(false)
    const [expanded, setExpanded] = useState(false)
      
    /* pickup OTP - Single OTP for the entire ride */
    const [otpMode, setOtpMode] = useState(false);
    const [otp, setOtp] = useState("");
    const [loadingOtp, setLoadingOtp] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [sendingPickUpOtp, setSendingPickUpOtp] = useState(false);

    /* Ride Completion & Strict Payment Verification */
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [completingRide, setCompletingRide] = useState(false);
    const [completeError, setCompleteError] = useState("");

    const [viewMode, setViewMode] = useState<"split" | "map" | "panel">("split")
    const router = useRouter()

    const handleSendPickUpOtp = async () => {
        if (sendingPickUpOtp) return
        setSendingPickUpOtp(true)
        setOtpMode(true) // Optimistic 0ms UI response
        try {
            await axios.post("/api/partner/bookings/otp/pickup/send", { bookingId: booking?._id })
        } catch (error: any) {
            console.error(error.response?.data?.message)
        } finally {
            setSendingPickUpOtp(false)
        }
    }

    const handleVerifyPickUpOtp = async () => {
        setLoadingOtp(true)
        try {
            const { data } = await axios.post("/api/partner/bookings/otp/pickup/verify", { bookingId: booking?._id, otp })
            setOtpVerified(true)
            setLoadingOtp(false)
            setOtpMode(false)
            setStatus("started")
            setBooking(prev => prev ? { ...prev, bookingStatus: "started" } : prev)
        } catch (error: any) {
            console.log(error)
            setLoadingOtp(false)
            setOtpError(error.response?.data?.message ?? "Verification failed")
        }
    }

    const handleCompleteRide = async (paymentConfirmed: boolean = false) => {
        if (!booking?._id || completingRide) return
        setCompletingRide(true)
        setCompleteError("")
        try {
            const { data } = await axios.post("/api/partner/bookings/complete", {
                bookingId: booking._id,
                paymentConfirmed
            })
            setStatus("completed")
            setBooking(prev => prev ? { ...prev, bookingStatus: "completed", paymentStatus: "paid" } : prev)
            setCompleteModalOpen(false)
        } catch (error: any) {
            console.error("Complete ride error:", error)
            setCompleteError(error.response?.data?.message ?? "Failed to complete ride")
        } finally {
            setCompletingRide(false)
        }
    }

    useEffect(() => {
        async function fetch() {
            try {
                const { data } = await axios.get("/api/partner/my-active")

                if (!data) {
                    setLoading(false)
                    setBooking(null)
                    return
                }
                setBooking(data)
                setStatus(data.bookingStatus)
                setPickUpPos([data.pickUpLocation.coordinates[1], data.pickUpLocation.coordinates[0]])
                setDropPos([data.dropLocation.coordinates[1], data.dropLocation.coordinates[0]])
                setLoading(false)
            } catch (error: any) {
                console.log(error.response?.data?.message)
                setLoading(false)
            }
        }
        setLoading(true)
        fetch()
        const syncInterval = setInterval(fetch, 3500)
        return () => clearInterval(syncInterval)
    }, [])

    const onChatToggle = () => {
        setChatOpen(prev => !prev)
    }

    useEffect(() => {
        if (!navigator.geolocation) return;

        const socket = getSocket()
        const watchId = navigator.geolocation.watchPosition((pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            setDriverPos([lat, lon])
            socket.emit("driver-location-update", {
                bookingId: booking?._id, latitude: lat, longitude: lon, status: status
            })

        },
        (error) => { console.log("gps error", error) },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        )

        return () => { navigator.geolocation.clearWatch(watchId) }
    }, [booking?._id, status])

    useEffect(() => {
        if (!booking?._id) return;
        const socket = getSocket()
        socket.emit("join-ride", booking?._id)
        socket.on("driver-location", ({ latitude, longitude }) => {
            setDriverPos([latitude, longitude])
        })
        socket.on("ride-payment-updated", (data) => {
            setBooking(prev => prev ? { ...prev, paymentStatus: "paid" } : prev)
        })
        socket.on("ride-status-update", ({ status, paymentStatus }: any) => {
            if (status) setStatus(status)
            setBooking(prev => prev ? { 
                ...prev, 
                ...(status ? { bookingStatus: status } : {}),
                ...(paymentStatus ? { paymentStatus } : {})
            } : prev)
        })
        return () => {
            socket.off("join-ride")
            socket.off("driver-location")
            socket.off("ride-payment-updated")
            socket.off("ride-status-update")
        }
    }, [booking?._id])

    if (loading) {
        return (
            <div className='min-h-screen w-full bg-zinc-950 flex items-center justify-center pt-20'>
                <div className='flex flex-col items-center gap-4 bg-zinc-900/60 p-8 rounded-3xl border border-white/10 backdrop-blur-xl'>
                    <div className='w-12 h-12 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin' />
                    <p className='text-zinc-400 text-xs tracking-widest uppercase font-bold'>Connecting to Active Ride...</p>
                </div>
            </div>
        )
    }

    if (booking == null) {
        return (
            <div className='min-h-screen w-full bg-zinc-950 flex items-center justify-center pt-24 pb-12 px-4'>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl"
                >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5">
                        <Car size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Active Ride Found</h2>
                    <p className="text-sm text-zinc-400 mb-6">
                        You do not currently have any active ride assigned to your vehicle. You can check pending requests or view your ride history.
                    </p>
                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={() => router.push('/partner/pending-requests')}
                            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Zap size={16} /> See Pending Requests
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <ArrowLeft size={16} /> Go to Home
                        </button>
                    </div>
                </motion.div>
            </div>
        )
    }

    if(status==="completed" && booking){
        return (
            <CompletedScreen booking={booking} role='driver'/>
        )
    }

    const cfg = STATUS_LABEL[booking?.bookingStatus! ?? "confirmed"]
    const isActive = ["confirmed", "started"].includes(status)
    const canChat = ["confirmed", "started"].includes(booking?.bookingStatus || status)
    const displayEta = status === "confirmed" ? etaToPickUp : etaToDrop
    const displayDistance = status === "confirmed" ? distanceToPickUp : distanceToDrop
    const paymentStatus = PAYMENT_BADGE[booking?.paymentStatus! ?? "pending"]
    const panelProps = { isActive, displayDistance, displayEta, cfg, status, booking, paymentStatus, canChat, chatOpen, onChatToggle, currentRole: "driver" }
    return (
        <div className='pt-16 sm:pt-20 h-screen w-full bg-zinc-950 flex flex-col overflow-hidden'>
            {/* Cockpit HUD Sub-Header Bar */}
            <header className="shrink-0 bg-zinc-900/90 backdrop-blur-md border-b border-white/[0.08] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 z-30">
                {/* Left: Back button & Status */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer shrink-0"
                        title="Back to Home"
                    >
                        <ArrowLeft size={14} />
                        <span className="hidden sm:inline">Home</span>
                        <span className="sm:hidden">Home</span>
                    </button>

                    <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />

                    <div className="flex items-center gap-2 min-w-0 truncate">
                        <span className="text-xs font-mono font-bold text-zinc-300 hidden md:inline">
                            #{String(booking._id || "").slice(-6).toUpperCase()}
                        </span>
                        <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border truncate ${
                            cfg.dot === 'bg-emerald-400' 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse shrink-0`} />
                            <span className="truncate">{cfg.label}</span>
                        </span>
                    </div>
                </div>

                {/* Center Telemetry (Desktop & Tablet) */}
                <div className="hidden md:flex items-center gap-2 lg:gap-3 text-xs">
                    {isActive && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                            <Zap size={12} className="text-amber-400" />
                            <span className="text-zinc-400">ETA:</span>
                            <span className="font-bold text-white">{Math.round(displayEta)} min</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                        <MapPin size={12} className="text-blue-400" />
                        <span className="text-zinc-400">Distance:</span>
                        <span className="font-bold text-white">{(displayDistance / 1000).toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                        <span className="text-zinc-400">Fare:</span>
                        <span className="font-bold text-emerald-400">₹{booking.fare ?? 0}</span>
                    </div>
                </div>

                {/* Right: View Mode Toggle */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                        onClick={() => setViewMode("split")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            viewMode === "split" ? "bg-white/20 text-white font-bold" : "text-zinc-400 hover:text-white"
                        }`}
                        title="Cockpit View"
                    >
                        <span className="hidden sm:inline">Split</span>
                        <span className="sm:hidden">Cockpit</span>
                    </button>
                    <button
                        onClick={() => setViewMode("map")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            viewMode === "map" ? "bg-white/20 text-white font-bold" : "text-zinc-400 hover:text-white"
                        }`}
                        title="Focus Map"
                    >
                        Map
                    </button>
                    <button
                        onClick={() => setViewMode("panel")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            viewMode === "panel" ? "bg-white/20 text-white font-bold" : "text-zinc-400 hover:text-white"
                        }`}
                        title="Ride Details"
                    >
                        Info
                    </button>
                </div>
            </header>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Map View Container */}
                <div className={`relative h-full transition-all duration-300 p-2 sm:p-3 ${
                    viewMode === "split" 
                        ? "flex-1" 
                        : viewMode === "map" 
                            ? "w-full" 
                            : "hidden lg:block lg:w-1/3 xl:w-1/4"
                }`}>
                    <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
                        <LiveRideMap
                            driverLocation={driverPos}
                            pickUpLocation={pickUpPos}
                            dropLocation={dropPos}
                            mapStatus={MAP_STATUS[booking?.bookingStatus!]}
                            onStats={({ distanceToPickUp, etaToPickUp, distanceToDrop, etaToDrop }) => {
                                setDistanceToPickUp(distanceToPickUp)
                                setEtaToPickUp(etaToPickUp)
                                setDistanceToDrop(distanceToDrop)
                                setEtaToDrop(etaToDrop)
                            }}
                        />

                        {/* Floating Status Pill over Map */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                            <div className='flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-white/10'>
                                <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                                <span className='text-xs font-bold tracking-wide text-white'>{cfg.label}</span>
                            </div>
                        </div>

                        {/* Floating Action Button when in full Map View */}
                        {viewMode === "map" && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-sm px-4">
                                <button
                                    onClick={() => setViewMode("split")}
                                    className="w-full py-3 px-4 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 text-white font-bold text-xs shadow-2xl border border-white/20 backdrop-blur-md transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Open Ride Controls & OTP</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Driver Panel */}
                <motion.div
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.35 }}
                    className={`${
                        viewMode === "split" 
                            ? "hidden lg:flex w-[420px] xl:w-[460px]" 
                            : viewMode === "panel" 
                                ? "flex w-full lg:max-w-2xl mx-auto" 
                                : "hidden"
                    } bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-white/10 flex-col overflow-hidden z-10`}
                >
                    <div className='bg-zinc-950 px-6 py-5 flex-shrink-0'>
                        <p className='text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-semibold mb-1'>Driver Panel</p>

                        <div className='flex items-center justify-between'>
                            <h1 className='text-white text-xl font-bold'>Active Ride</h1>
                            {isActive && (
                                <div className='flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full'>
                                    <Zap size={12} className="text-amber-400" />
                                    <span className='text-white text-xs font-semibold'>{Math.round(displayEta)} min</span>
                                </div>
                            )}
                        </div>
                    </div>
                <div className='flex-1 flex flex-col overflow-hidden'>
                    <div className='flex-1 overflow-y-auto scrollbar-hide'>
                        <PanelContent {...panelProps} />
                    </div>

  <div className='flex-shrink-0 border-t border-zinc-100 bg-white px-5 py-4'>
                        <AnimatePresence mode='wait'>
                            {status === "confirmed" && !otpMode && !otpVerified && (
                                <motion.button
                                    key="arrived"
                                    disabled={sendingPickUpOtp}
                                    onClick={handleSendPickUpOtp}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-75 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                                >
                                    {sendingPickUpOtp ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Requesting Pickup OTP...</span>
                                        </span>
                                    ) : (
                                        <>
                                            <MapPin size={15} /> I've Arrived at Pickup <ArrowRight size={15} className="ml-1" />
                                        </>
                                    )}
                                </motion.button>
                            )}

                            {status === "confirmed" && otpMode && !otpVerified && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.3 }}
                                    className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden"
                                >
                                    <div className='bg-zinc-950 px-4 py-3 flex items-center gap-2'>
                                        <KeyRound size={14} className="text-amber-400" />
                                        <p className='text-white text-xs font-bold tracking-wide uppercase'>Enter Customer OTP</p>
                                    </div>
                                    <div className='p-4 space-y-3'>
                                        <p className='text-xs text-zinc-500'>Ask the customer for their 4-digit OTP to start the ride.</p>
                                        <div className='flex justify-center'>
                                            <input
                                                type="text"
                                                onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                                                placeholder="· · · ·"
                                                className="w-48 border-2 border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-black outline-none transition-colors"
                                            />
                                        </div>
                                        {otpError && (
                                            <motion.p
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center font-medium"
                                            >
                                                {otpError}
                                            </motion.p>

                                        )}

                                        <div className='flex gap-2'>
                                            <button
                                                onClick={() => { setOtpMode(false); setOtp(""); setOtpError(""); }}
                                                className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"
                                            >Cancel</button>

                                            <button
                                                onClick={handleVerifyPickUpOtp} disabled={loadingOtp || otp.length < 4}
                                                className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold active:scale-[0.97] transition-all"
                                            >
                                                {loadingOtp ? <span className='flex items-center justify-center gap-2'>Verifying...</span> : <span >Verify OTP</span>}
                                            </button>
                                        </div>


                                    </div>
                                </motion.div>
                            )}

                              {status === "started" && !completeModalOpen && (
                                <motion.button
                                    key="complete-trigger"
                                    disabled={completingRide}
                                    onClick={() => { setCompleteError(""); setCompleteModalOpen(true); }}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-75 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                                >
                                    <CheckCircle2 size={16} /> Complete Ride & Check Payment <ArrowRight size={15} className="ml-1" />
                                </motion.button>
                            )}

                            {status === "started" && completeModalOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                    transition={{ duration: 0.25 }}
                                    className="bg-zinc-50 border-2 border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl"
                                >
                                    <div className='bg-zinc-950 px-4 py-3 flex items-center justify-between'>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={15} className="text-emerald-400" />
                                            <p className='text-white text-xs font-bold tracking-wide uppercase'>Ride Completion & Payment</p>
                                        </div>
                                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                            ₹{booking?.fare}
                                        </span>
                                    </div>

                                    <div className='p-4 space-y-3.5'>
                                        {booking?.paymentStatus === "paid" ? (
                                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                                                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                    <span>✓ Paid Online via Razorpay (₹{booking?.fare})</span>
                                                </div>
                                                <p className="text-[11px] text-emerald-700 font-medium pl-6">
                                                    Payment is already verified online. <strong>Do NOT ask or collect cash from the passenger.</strong>
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                                                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                                                    <Banknote size={17} className="text-amber-700 shrink-0" />
                                                    <span>Payment Verification Required</span>
                                                </div>
                                                <p className="text-xs text-amber-900 font-semibold">
                                                    Did the passenger pay you <span className="underline font-bold text-black">₹{booking?.fare}</span> in Cash or QR?
                                                </p>
                                                <p className="text-[11px] text-amber-700">
                                                    ⚠️ The ride will not close without payment. If they haven't paid yet, ask them for cash or let them tap "Pay Online" on their phone.
                                                </p>
                                            </div>
                                        )}

                                        {completeError && (
                                            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-medium">
                                                <AlertCircle size={14} className="shrink-0" />
                                                <span>{completeError}</span>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => { setCompleteModalOpen(false); setCompleteError(""); }}
                                                disabled={completingRide}
                                                className="w-full sm:flex-1 border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 py-3 rounded-xl text-xs font-bold active:scale-[0.97] transition-all cursor-pointer"
                                            >
                                                Wait / Cancel
                                            </button>

                                            {booking?.paymentStatus === "paid" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCompleteRide(true)}
                                                    disabled={completingRide}
                                                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold active:scale-[0.97] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {completingRide ? (
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 size={14} />
                                                    )}
                                                    <span>{completingRide ? "Ending Ride..." : "Yes, Drop Passenger"}</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCompleteRide(true)}
                                                    disabled={completingRide}
                                                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold active:scale-[0.97] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {completingRide ? (
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Banknote size={14} />
                                                    )}
                                                    <span>{completingRide ? "Settling..." : `Yes, Received ₹${booking?.fare} (Close Ride)`}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                </div>
            </motion.div>

            {/* mobile view */}

            <div className='lg:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none'>
                <motion.div
                    className="bg-white rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col"
                    animate={{ 
                        height: viewMode === "panel" 
                            ? "calc(100vh - 130px)" 
                            : viewMode === "map" 
                                ? (expanded ? "50vh" : 88) 
                                : (expanded ? "82vh" : 142) 
                    }}
                    transition={{ type: "spring", stiffness: 320, damping: 38 }}
                >
                    <div
                        className='flex-shrink-0 cursor-pointer select-none'
                        onClick={() => setExpanded(p => !p)}

                    >
                        <div className='pt-3 pb-1'>
                            <div className='w-10 h-1 bg-zinc-200 rounded-full mx-auto' />
                        </div>

                        <div className='px-5 py-3 flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                <div>
                                    <p className='text-sm font-bold text-zinc-900 leading-tight'>{cfg.label}</p>
                                    <p className='text-xs text-zinc-400 leading-tight'>{cfg.sublabel}</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-3'>
                                {isActive && (
                                    <div className='text-right'>
                                        <p className='text-2xl font-black text-zinc-900 leading-none'>{Math.round(displayEta)}</p>
                                        <p className='text-[10px] text-zinc-400 uppercase tracking-wider'>min</p>
                                    </div>
                                )}
                                <motion.div
                                    animate={{ rotate: expanded ? 180 : 0 }}
                                    transition={{ duration: 0.28 }}
                                    className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                                >
                                    <ChevronUp size={16} className="text-zinc-600" />

                                </motion.div>
                            </div>
                        </div>
                        <div className='h-px bg-zinc-100 mx-5' />

                    </div>

                    <div className='flex-1 overflow-y-auto min-h-0'>
                        <PanelContent {...panelProps} />
                    </div>


                    <div className='flex-shrink-0 border-t border-zinc-100 bg-white px-5 py-4'>
                        <AnimatePresence mode='wait'>
                            {status === "confirmed" && !otpMode && !otpVerified && (
                                <motion.button
                                    key="arrived"
                                    disabled={sendingPickUpOtp}
                                    onClick={handleSendPickUpOtp}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-75 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                                >
                                    {sendingPickUpOtp ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Requesting Pickup OTP...</span>
                                        </span>
                                    ) : (
                                        <>
                                            <MapPin size={15} /> I've Arrived at Pickup <ArrowRight size={15} className="ml-1" />
                                        </>
                                    )}
                                </motion.button>
                            )}

                            {status === "confirmed" && otpMode && !otpVerified && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.3 }}
                                    className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden"
                                >
                                    <div className='bg-zinc-950 px-4 py-3 flex items-center gap-2'>
                                        <KeyRound size={14} className="text-amber-400" />
                                        <p className='text-white text-xs font-bold tracking-wide uppercase'>Enter Customer OTP</p>
                                    </div>
                                    <div className='p-4 space-y-3'>
                                        <p className='text-xs text-zinc-500'>Ask the customer for their 4-digit OTP to start the ride.</p>
                                        <div className='flex justify-center'>
                                            <input
                                                type="text"
                                                onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                                                placeholder="· · · ·"
                                                className="w-48 border-2 border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-black outline-none transition-colors"
                                            />
                                        </div>
                                        {otpError && (
                                            <motion.p
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center font-medium"
                                            >
                                                {otpError}
                                            </motion.p>

                                        )}

                                        <div className='flex gap-2'>
                                            <button
                                                onClick={() => { setOtpMode(false); setOtp(""); setOtpError(""); }}
                                                className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"
                                            >Cancel</button>

                                            <button
                                                onClick={handleVerifyPickUpOtp} disabled={loadingOtp || otp.length < 4}
                                                className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold active:scale-[0.97] transition-all"
                                            >
                                                {loadingOtp ? <span className='flex items-center justify-center gap-2'>Verifying...</span> : <span >Verify OTP</span>}
                                            </button>
                                        </div>


                                    </div>
                                </motion.div>
                            )}

                              {status === "started" && !completeModalOpen && (
                                <motion.button
                                    key="drop"
                                    onClick={() => {
                                        setCompleteError("");
                                        setCompleteModalOpen(true);
                                    }}
                                    disabled={completingRide}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                                >
                                    <CheckCircle2 size={16} /> Complete Ride & Check Payment <ArrowRight size={15} className="ml-1" />
                                </motion.button>
                            )}

                            {status === "started" && completeModalOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.25 }}
                                    className="bg-zinc-50 border-2 border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl"
                                >
                                    <div className='bg-zinc-950 px-4 py-3 flex items-center justify-between'>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={15} className="text-emerald-400" />
                                            <p className='text-white text-xs font-bold tracking-wide uppercase'>Ride Completion & Payment</p>
                                        </div>
                                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                            ₹{booking?.fare}
                                        </span>
                                    </div>
                                    <div className='p-4 space-y-3.5'>
                                        {booking?.paymentStatus === "paid" ? (
                                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                                                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                    <span>✓ Paid Online via Razorpay (₹{booking?.fare})</span>
                                                </div>
                                                <p className="text-[11px] text-emerald-700 font-medium pl-6">
                                                    Payment is already verified online. <strong>Do NOT ask or collect cash.</strong>
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                                                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                                                    <Banknote size={17} className="text-amber-700 shrink-0" />
                                                    <span>Payment Verification Required</span>
                                                </div>
                                                <p className="text-xs text-amber-900 font-semibold">
                                                    Did the passenger pay you <span className="underline font-bold text-black">₹{booking?.fare}</span> in Cash or QR?
                                                </p>
                                                <p className="text-[11px] text-amber-700">
                                                    ⚠️ The ride will not close without payment. If they haven't paid yet, ask them for cash or let them tap "Pay Online" on their phone.
                                                </p>
                                            </div>
                                        )}

                                        {completeError && (
                                            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-medium">
                                                <AlertCircle size={14} className="shrink-0" />
                                                <span>{completeError}</span>
                                            </div>
                                        )}

                                        <div className='flex flex-col sm:flex-row gap-2 pt-1'>
                                            <button
                                                type="button"
                                                onClick={() => { setCompleteModalOpen(false); setCompleteError(""); }}
                                                disabled={completingRide}
                                                className="w-full sm:flex-1 border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 py-3 rounded-xl text-xs font-bold active:scale-[0.97] transition-all cursor-pointer"
                                            >
                                                Wait / Cancel
                                            </button>

                                            {booking?.paymentStatus === "paid" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCompleteRide(true)}
                                                    disabled={completingRide}
                                                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold active:scale-[0.97] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {completingRide ? (
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 size={14} />
                                                    )}
                                                    <span>{completingRide ? "Ending Ride..." : "Yes, Drop Passenger"}</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCompleteRide(true)}
                                                    disabled={completingRide}
                                                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold active:scale-[0.97] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {completingRide ? (
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Banknote size={14} />
                                                    )}
                                                    <span>{completingRide ? "Settling..." : `Yes, Received ₹${booking?.fare} (Close Ride)`}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>









                </motion.div>
            </div>
            </div>
        </div>
    )
}

export default page
