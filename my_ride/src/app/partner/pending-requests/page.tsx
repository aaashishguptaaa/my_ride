'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import axios from 'axios'
import { BookingStatus, PaymentStatus } from '@/models/booking.model'
import { ArrowLeft, Clock, IndianRupee, Loader2, MapPin, Navigation, CheckCircle2, AlertCircle, ArrowRight, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSocket } from '@/lib/socket'

interface IBooking {
    _id: string
    user: any
    driver: any
    vehicle: any
    pickUpAddress: string
    dropAddress: string
    fare: number
    userMobileNumber: string
    driverMobileNumber: string
    bookingStatus: BookingStatus
    paymentStatus: PaymentStatus
    paymentDeadline?: Date
    adminCommission?: number
    partnerAmount?: number
    createdAt?: Date
    updatedAt?: Date
}

export default function PendingRequestsPage() {
    const [requestedBookings, setRequestedBookings] = useState<IBooking[]>([])
    const [awaitingBookings, setAwaitingBookings] = useState<IBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [acceptingId, setAcceptingId] = useState<string | null>(null)
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [acceptedNotification, setAcceptedNotification] = useState<string | null>(null)
    const [conflictNotification, setConflictNotification] = useState<string | null>(null)
    const [isOnline, setIsOnline] = useState<boolean>(true)
    const [togglingOnline, setTogglingOnline] = useState<boolean>(false)
    const router = useRouter()

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

    const fetchPendingRequests = async () => {
        try {
            const { data } = await axios.get("/api/partner/bookings/pending")
            if (data && typeof data === "object" && !Array.isArray(data)) {
                setRequestedBookings(data.requested || [])
                setAwaitingBookings(data.awaitingPayment || [])
            } else if (Array.isArray(data)) {
                setRequestedBookings(data.filter((b: any) => b.bookingStatus === "requested"))
                setAwaitingBookings(data.filter((b: any) => b.bookingStatus === "awaiting_payment"))
            }
            setLoading(false)
        } catch (error) {
            console.error("Error fetching pending requests:", error)
            setLoading(false)
        }
    }

    const handleAccept = async (id: string) => {
        try {
            setAcceptingId(id)
            setConflictNotification(null)
            const { data } = await axios.get(`/api/partner/bookings/${id}/accept`)
            
            // Immediately remove from requested state
            setRequestedBookings(prev => prev.filter(b => b._id !== id))
            
            // Dispatch event to instantly clear or update badge in Nav
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("refresh-partner-pending"))
            }

            setAcceptedNotification("Ride accepted! Awaiting passenger payment.")
            
            // Re-fetch to populate awaiting payment section cleanly
            await fetchPendingRequests()
            setAcceptingId(null)
        } catch (error: any) {
            console.error("Accept error:", error)
            setAcceptingId(null)
            if (error.response?.status === 409 || error.response?.data?.alreadyTaken) {
                // Another rider accepted it first in a race condition
                setRequestedBookings(prev => prev.filter(b => b._id !== id))
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("refresh-partner-pending"))
                }
                setConflictNotification(
                    error.response?.data?.message || 
                    "Another rider has already accepted this ride request. It has been removed from your list."
                )
                setTimeout(() => setConflictNotification(null), 8000)
            }
        }
    }

    const handleReject = async (id: string) => {
        try {
            setRejectingId(id)
            await axios.get(`/api/partner/bookings/${id}/reject`)
            
            // Immediately remove from state
            setRequestedBookings(prev => prev.filter(b => b._id !== id))

            // Dispatch event to update navbar badge
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("refresh-partner-pending"))
            }

            await fetchPendingRequests()
            setRejectingId(null)
        } catch (error) {
            console.error("Reject error:", error)
            setRejectingId(null)
        }
    }

    useEffect(() => {
        fetchPartnerStatus()
        fetchPendingRequests()
        // Poll every 4 seconds as resilient fallback
        const pollInterval = setInterval(() => {
            fetchPendingRequests()
        }, 4000)
        return () => clearInterval(pollInterval)
    }, [])

    useEffect(() => {
        const handleStatusChanged = (e: any) => {
            if (typeof e.detail?.isOnline === "boolean") {
                setIsOnline(e.detail.isOnline)
            }
        }
        window.addEventListener("partner-status-changed", handleStatusChanged)
        return () => window.removeEventListener("partner-status-changed", handleStatusChanged)
    }, [])

    useEffect(() => {
        const socket = getSocket()
        const handleNewBooking = (data: any) => {
            if (!data?._id) return
            setRequestedBookings(prev => {
                if (prev.some(b => String(b._id) === String(data._id))) return prev
                return [data, ...prev]
            })
        }

        const handleBookingTaken = (data: any) => {
            const bookingId = data?.bookingId || data?._id
            if (!bookingId) return
            setRequestedBookings(prev => prev.filter(b => String(b._id) !== String(bookingId)))
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("refresh-partner-pending"))
            }
        }

        const handleStatusUpdate = () => {
            fetchPendingRequests()
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("refresh-partner-pending"))
            }
        }

        socket.on("new-booking", handleNewBooking)
        socket.on("new-booking-request", handleNewBooking)
        socket.on("booking-taken", handleBookingTaken)
        socket.on("booking-accepted", handleStatusUpdate)
        socket.on("booking-rejected", handleStatusUpdate)
        socket.on("ride-confirmed", handleStatusUpdate)
        socket.on("ride-status-update", handleStatusUpdate)

        return () => {
            socket.off("new-booking", handleNewBooking)
            socket.off("new-booking-request", handleNewBooking)
            socket.off("booking-taken", handleBookingTaken)
            socket.off("booking-accepted", handleStatusUpdate)
            socket.off("booking-rejected", handleStatusUpdate)
            socket.off("ride-confirmed", handleStatusUpdate)
            socket.off("ride-status-update", handleStatusUpdate)
        }
    }, [])

    return (
        <div className='min-h-screen bg-[#f8f9fa] pt-20 sm:pt-24'>
            {/* Header */}
            <div className='bg-white border-b border-gray-200'>
                <div className='max-w-6xl mx-auto px-6 py-10 flex items-center justify-between gap-5'>
                    <div className='flex items-center gap-5'>
                        <button
                            onClick={() => router.push('/')}
                            className="w-11 h-11 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer flex-shrink-0"
                            title="Back to Home"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Ride Requests</h1>
                                {requestedBookings.length > 0 && (
                                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                                        {requestedBookings.length} New
                                    </span>
                                )}
                            </div>
                            <p className='mt-1 text-gray-500 text-sm'>
                                Manage incoming passenger ride requests and respond in real time.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Online / Offline switch */}
                        <button
                            onClick={handleToggleOnline}
                            disabled={togglingOnline}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border ${
                                isOnline 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" 
                                    : "bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200"
                            }`}
                            title="Toggle Online / Offline status"
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                            <span>{isOnline ? "Online" : "Offline"}</span>
                        </button>

                        <div className="hidden sm:flex items-center gap-3">
                            <button
                                onClick={() => router.push("/partner/bookings")}
                                className="text-xs font-semibold px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                            >
                                All Bookings
                            </button>
                            <button
                                onClick={() => router.push("/partner/active-ride")}
                                className="text-xs font-semibold px-4 py-2 rounded-xl bg-black text-white hover:bg-zinc-800 transition"
                            >
                                Active Ride
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className='max-w-6xl mx-auto px-6 py-10 space-y-8'>
                {/* Conflict Notification: Another Rider Accepted It First */}
                <AnimatePresence>
                    {conflictNotification && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-amber-950">Ride Already Taken!</p>
                                    <p className="text-xs text-amber-800 mt-0.5">{conflictNotification}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConflictNotification(null)}
                                className="text-xs text-amber-800 hover:text-amber-950 font-bold px-2 py-1 rounded cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Offline Warning Banner */}
                {!isOnline && (
                    <div className="p-4 rounded-2xl bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg border border-zinc-800">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-zinc-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold">You are currently OFFLINE</p>
                                <p className="text-xs text-zinc-400">
                                    Passengers searching for rides cannot see your vehicle. Switch to Online to start receiving requests.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleOnline}
                            disabled={togglingOnline}
                            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-black text-xs transition cursor-pointer"
                        >
                            Go Online Now
                        </button>
                    </div>
                )}
                {/* Accepted Notification Alert */}
                <AnimatePresence>
                    {acceptedNotification && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                <span className="text-sm font-semibold">{acceptedNotification}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push("/partner/active-ride")}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                                >
                                    Go to Active Ride →
                                </button>
                                <button
                                    onClick={() => setAcceptedNotification(null)}
                                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 rounded"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading ? (
                    <div className='flex flex-col items-center justify-center py-24 gap-3'>
                        <Loader2 className="animate-spin w-9 h-9 text-gray-600" />
                        <p className="text-sm text-gray-500 font-medium">Checking live ride requests...</p>
                    </div>
                ) : (
                    <>
                        {/* Section 1: Pending Ride Requests requiring action */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <span>Pending Requests</span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                        {requestedBookings.length}
                                    </span>
                                </h2>
                            </div>

                            {requestedBookings.length === 0 ? (
                                <div className='bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm'>
                                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <h3 className='text-gray-800 font-semibold text-base'>No pending ride requests</h3>
                                    <p className='text-gray-500 text-sm mt-1 max-w-md mx-auto'>
                                        When nearby passengers request a ride matching your vehicle, they will appear here in real time.
                                    </p>
                                </div>
                            ) : (
                                <div className='space-y-5'>
                                    {requestedBookings.map((b) => (
                                        <motion.div
                                            key={b._id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm hover:shadow-md transition"
                                        >
                                            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6'>
                                                <div className="flex-1 space-y-4">
                                                    <div className='flex items-start gap-3.5'>
                                                        <div className='bg-emerald-50 text-emerald-600 p-2.5 rounded-xl flex items-center justify-center mt-0.5'>
                                                            <MapPin size={18} />
                                                        </div>
                                                        <div>
                                                            <p className='text-[11px] uppercase tracking-wider font-bold text-gray-400'>Pickup Location</p>
                                                            <p className='text-gray-900 font-semibold text-sm sm:text-base mt-0.5'>{b.pickUpAddress}</p>
                                                        </div>
                                                    </div>

                                                    <div className='flex items-start gap-3.5'>
                                                        <div className='bg-rose-50 text-rose-600 p-2.5 rounded-xl flex items-center justify-center mt-0.5'>
                                                            <Navigation size={18} />
                                                        </div>
                                                        <div>
                                                            <p className='text-[11px] uppercase tracking-wider font-bold text-gray-400'>Drop Location</p>
                                                            <p className='text-gray-900 font-semibold text-sm sm:text-base mt-0.5'>{b.dropAddress}</p>
                                                        </div>
                                                    </div>

                                                    <div className='flex items-center gap-4 text-xs text-gray-500 pt-1'>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={13} className="opacity-70" />
                                                            <span>
                                                                {new Date(b?.createdAt!).toLocaleString("en-IN", {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    day: "numeric",
                                                                    month: "short"
                                                                })}
                                                            </span>
                                                        </div>
                                                        {b.userMobileNumber && (
                                                            <div className="text-gray-600 font-medium">
                                                                📞 {b.userMobileNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className='flex flex-col justify-between lg:items-end gap-5 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0'>
                                                    <div className='text-left lg:text-right'>
                                                        <p className='text-[11px] tracking-wider text-gray-400 uppercase font-bold mb-0.5'>Estimated Fare</p>
                                                        <div className='flex items-center gap-1 text-2xl sm:text-3xl font-black text-gray-900 lg:justify-end'>
                                                            <IndianRupee size={22} />
                                                            {b.fare}
                                                        </div>
                                                    </div>

                                                    <div className='flex gap-3 w-full lg:w-auto'>
                                                        <button
                                                            onClick={() => handleReject(b._id)}
                                                            disabled={rejectingId === b._id || acceptingId === b._id}
                                                            className='flex-1 lg:flex-none px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer'
                                                        >
                                                            {rejectingId === b._id ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                                                    <span>Rejecting...</span>
                                                                </>
                                                            ) : (
                                                                "Reject"
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAccept(b._id)}
                                                            disabled={acceptingId === b._id || rejectingId === b._id}
                                                            className='flex-1 lg:flex-none px-7 py-2.5 rounded-xl bg-black text-white text-sm font-bold shadow-md hover:bg-gray-900 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer'
                                                        >
                                                            {acceptingId === b._id ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                                    <span>Accepting...</span>
                                                                </>
                                                            ) : (
                                                                "Accept Ride"
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 2: Accepted Rides Awaiting Passenger Payment */}
                        {awaitingBookings.length > 0 && (
                            <div className="pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <span>Accepted Rides</span>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                {awaitingBookings.length} Awaiting Payment
                                            </span>
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            You accepted these rides. Waiting for passenger to complete payment (5-minute window).
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {awaitingBookings.map((b) => (
                                        <div
                                            key={b._id}
                                            className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-sm hover:shadow-md transition"
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                                            Accepted • Awaiting Passenger Payment
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(b?.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase text-gray-400">Pickup</p>
                                                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{b.pickUpAddress}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase text-gray-400">Drop</p>
                                                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{b.dropAddress}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:border-l lg:pl-6 border-gray-100">
                                                    <div className="text-left sm:text-right">
                                                        <p className="text-[10px] uppercase font-bold text-gray-400">Fare</p>
                                                        <p className="text-xl font-black text-gray-900">₹{b.fare}</p>
                                                    </div>

                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => router.push("/partner/bookings")}
                                                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                                                        >
                                                            View in Bookings
                                                        </button>
                                                        <button
                                                            onClick={() => router.push("/partner/active-ride")}
                                                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1 justify-center"
                                                        >
                                                            <span>Active Ride</span>
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
