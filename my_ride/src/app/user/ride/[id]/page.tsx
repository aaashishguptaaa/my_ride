'use client'
import { BookingStatus, IBooking, PaymentStatus } from '@/models/booking.model'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { motion } from "motion/react"
import { ArrowLeft, ArrowRight, Car, ChevronUp, MapPin, Zap } from 'lucide-react'
import dynamic from 'next/dynamic'
const LiveRideMap=dynamic(() => import("@/components/LiveRideMap"), { ssr: false })
import PanelContent from '@/components/PanelContent'
import { useParams, useRouter } from 'next/navigation'
import { getSocket } from '@/lib/socket'
import CompletedScreen from '@/components/CompletedScreen'


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

    const [viewMode, setViewMode] = useState<"split" | "map" | "panel">("split")
    const { id } = useParams()
    const router = useRouter()

    useEffect(() => {
        async function fetchRide() {
            try {
                const { data } = await axios.post("/api/user/active-ride", {
                    bookingId: id
                })
                setBooking(data)
                setStatus(data.bookingStatus)
                setPickUpPos([data.pickUpLocation.coordinates[1], data.pickUpLocation.coordinates[0]])
                setDropPos([data.dropLocation.coordinates[1], data.dropLocation.coordinates[0]])
            } catch (error: any) {
                console.log(error.response?.data?.message)
            } finally {
                setLoading(false)
            }
        }
        setLoading(true)
        fetchRide()
        // Poll every 3.5s to keep OTP and ride state synced in real time
        const syncInterval = setInterval(fetchRide, 3500)
        return () => clearInterval(syncInterval)
    }, [id])

    const onChatToggle = () => {
        setChatOpen(prev => !prev)
    }

    useEffect(() => {
        const socket = getSocket()
        socket.emit("join-ride", id)
        socket.on("driver-location", ({ latitude, longitude }) => {
            setDriverPos([latitude, longitude])
        })
        socket.on("otp-generated", ({ type, otp }) => {
            if (type === "pickup") {
                setBooking(prev => prev ? { ...prev, pickUpOtp: otp } : prev)
            }
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
            socket.off("otp-generated")
            socket.off("ride-payment-updated")
            socket.off("ride-status-update")
        }
    }, [id])

    if (loading && !booking) {
        return (
            <div className='min-h-screen w-full bg-zinc-950 flex items-center justify-center pt-20'>
                <div className='flex flex-col items-center gap-4 bg-zinc-900/60 p-8 rounded-3xl border border-white/10 backdrop-blur-xl'>
                    <div className='w-12 h-12 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin' />
                    <p className='text-zinc-400 text-xs tracking-widest uppercase font-bold'>Connecting to Live Ride...</p>
                </div>
            </div>
        )
    }

    if (!booking) {
        return (
            <div className='min-h-screen w-full bg-zinc-950 flex items-center justify-center pt-24 pb-12 px-4'>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl"
                >
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-5">
                        <Car size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Ride Not Found</h2>
                    <p className="text-sm text-zinc-400 mb-6">
                        This ride is no longer active or could not be found. Check your booking history to view your rides.
                    </p>
                    <button
                        onClick={() => router.push('/user/bookings')}
                        className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <ArrowLeft size={16} /> View My Bookings
                    </button>
                </motion.div>
            </div>
        )
    }

    if (status === "completed" && booking) {
        return (
            <CompletedScreen booking={booking} role='user' />
        )
    }

    const cfg = STATUS_LABEL[booking?.bookingStatus! ?? "confirmed"]
    const isActive = ["confirmed", "started"].includes(status)
    const canChat = ["confirmed", "started"].includes(booking?.bookingStatus || status)
    const displayEta = status === "confirmed" ? etaToPickUp : etaToDrop
    const displayDistance = status === "confirmed" ? distanceToPickUp : distanceToDrop
    const paymentStatus = PAYMENT_BADGE[booking?.paymentStatus! ?? "pending"]
    const panelProps = { isActive, displayDistance, displayEta, cfg, status, booking, paymentStatus, canChat, chatOpen, onChatToggle, currentRole: "user" }

    const activeOtp = status === "confirmed" ? booking.pickUpOtp : null

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

                    {/* Highly Visible Header OTP Badge for Passenger */}
                    {activeOtp && (
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Your Ride OTP:</span>
                            <span className="font-mono font-black text-sm text-white tracking-widest">{activeOtp}</span>
                        </div>
                    )}
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

                        {/* Floating Status & OTP Pill over Map */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                            <div className='flex items-center gap-2.5 bg-zinc-950/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-white/15'>
                                <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
                                <span className='text-xs font-bold tracking-wide text-white'>{cfg.label}</span>
                                {activeOtp && (
                                    <span className="ml-1 bg-amber-500 text-zinc-950 font-mono font-black text-xs px-2.5 py-0.5 rounded-full tracking-widest shadow-sm">
                                        OTP: {activeOtp}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Floating Action Button when in full Map View */}
                        {viewMode === "map" && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-sm px-4">
                                <button
                                    onClick={() => setViewMode("split")}
                                    className="w-full py-3 px-4 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 text-white font-bold text-xs shadow-2xl border border-white/20 backdrop-blur-md transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Show Ride Details</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop User Panel */}
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
                        <p className='text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-semibold mb-1'>User Panel</p>

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
                    </div>
                </motion.div>
            </div>

            {/* Mobile View Drawer */}
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
                                    <ChevronUp size={16} className="text-zinc-600"/>
                                </motion.div>
                            </div>
                        </div>
                        <div className='h-px bg-zinc-100 mx-5'/>
                    </div>

                    <div className='flex-1 overflow-y-auto min-h-0'>
                        <PanelContent {...panelProps}/>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default page