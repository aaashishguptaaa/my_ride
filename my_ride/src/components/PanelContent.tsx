'use client'
import { Banknote, Bike, Car, CheckCircle2, Clock, CreditCard, IndianRupee, Loader2, MessageCircle, Phone, Truck, User, Wallet } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { button } from 'motion/react-client'
import RideChat from './RideChat'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import Vehicle from '@/models/vehicle.model'
import axios from 'axios'

const getVehicleIcon = (vehicleType?: string) => {
    switch (vehicleType?.toLowerCase()) {
        case 'bike':
            return <Bike size={18} className=" text-white" />;
        case 'auto':
            return <Car size={18} className=" text-white" />; // You can add Auto icon if available
        case 'truck':
            return <Truck size={18} className=" text-white" />;
        case 'loading':
        case 'car':
        default:
            return <Car size={18} className=" text-white" />;
    }
};

function PanelContent({ isActive, displayDistance, displayEta, cfg, status, booking, paymentStatus, canChat, chatOpen, onChatToggle, currentRole }: any) {
    const [paying, setPaying] = useState(false);
    const [paidSuccess, setPaidSuccess] = useState(false);

    const isPaid = booking?.paymentStatus === "paid" || paidSuccess;

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (typeof window === "undefined") {
                resolve(false);
                return;
            }
            if ((window as any).Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayOnline = async () => {
        if (!booking?._id || paying) return;
        setPaying(true);
        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                alert("Failed to load Razorpay payment gateway. Please check your connection.");
                setPaying(false);
                return;
            }

            const { data } = await axios.post("/api/payment/create", {
                bookingId: booking._id
            });

            const paymentObject = new (window as any).Razorpay({
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: data.amount,
                currency: "INR",
                name: "MY RIDE",
                description: `Payment for Ride #${String(booking._id).slice(-6).toUpperCase()}`,
                order_id: data.orderId,
                prefill: {
                    name: booking?.user?.name || "",
                    email: booking?.user?.email || "",
                    contact: booking?.userMobileNumber || ""
                },
                theme: {
                    color: "#18181b"
                },
                handler: async function (response: any) {
                    try {
                        const verifyRes = await axios.post("/api/payment/verify", {
                            bookingId: booking._id,
                            ...response
                        });
                        if (verifyRes.data.success) {
                            setPaidSuccess(true);
                            if (booking) {
                                booking.paymentStatus = "paid";
                            }
                        }
                    } catch (vErr) {
                        console.error("Payment verify failed:", vErr);
                    } finally {
                        setPaying(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setPaying(false);
                    }
                }
            });

            paymentObject.open();
        } catch (err: any) {
            console.error("Payment initiation failed:", err);
            setPaying(false);
            alert(err.response?.data?.message || "Failed to initiate payment");
        }
    };


    return (
        <div className='flex flex-col pt-5 pb-4 gap-3'>
            {isActive && (
                <div className='mx-5 lg:mx-6 grid grid-cols-2 gap-2'>
                    <div className='bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3'>
                        <div className='w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0'>
                            <Clock size={16} className="text-zinc-600" />
                        </div>
                        <div>
                            <p className='text-[10px] text-zinc-400 uppercase tracking-wider font-semibold'>ETA</p>
                            <p className='text-lg font-black text-zinc-900 leading-none mt-0.5'>{Math.round(displayEta)} <span className='text-xs font-normal text-zinc-400 ml-0.5'>min</span></p>
                        </div>
                    </div>

                    <div className='bg-zinc-950 rounded-2xl p-4 flex items-center gap-3'>
                        <div className='w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0'>
                            <IndianRupee size={16} className="text-white" />
                        </div>
                        <div >
                            <p className='text-[10px] text-zinc-500 uppercase tracking-wider font-semibold'>Fare</p>
                            <p className='text-lg font-black text-white leading-none mt-0.5'>{booking.fare || "-"}</p>
                        </div>
                    </div>

                </div>
            )}

            {/* Rider OTP Display Card */}
            {currentRole === "user" && booking?.pickUpOtp && status === "confirmed" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mx-5 lg:mx-6 rounded-2xl p-5 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20 border border-amber-300"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-950/80">Start Ride PIN</span>
                            <div className="flex items-baseline gap-3 mt-1">
                                <span className="text-4xl font-black font-mono tracking-[0.25em] text-zinc-950">
                                    {booking.pickUpOtp}
                                </span>
                            </div>
                        </div>
                        <div className="bg-zinc-950 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm">
                            Share with Rider
                        </div>
                    </div>
                    <p className="text-xs text-amber-950/90 font-medium mt-2.5">
                        Tell this 4-digit OTP to your Rider when they arrive to start the ride safely.
                    </p>
                </motion.div>
            )}

            {/* In-Ride Payment & Fare Settlement Card */}
            {booking && (
                <div className="mx-5 lg:mx-6">
                    {currentRole === "user" ? (
                        isPaid ? (
                            <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 shadow-xs flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-950">Trip Paid Online • ₹{booking.fare}</p>
                                        <p className="text-[11px] text-emerald-700 font-medium">Payment verified via Razorpay. No cash needed at destination.</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Paid
                                </span>
                            </div>
                        ) : (
                            <div className="rounded-2xl p-4 bg-zinc-50 border border-zinc-200 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center flex-shrink-0">
                                            <CreditCard size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900">Ride Fare: ₹{booking.fare}</p>
                                            <p className="text-[10px] text-zinc-500 font-medium">
                                                {status === "confirmed" 
                                                    ? "Pay now, at pickup, or after reaching destination" 
                                                    : status === "started" 
                                                        ? "Pay online anytime or pay cash at destination" 
                                                        : "Complete payment to finish ride"}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        Pay Later / Cash
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-zinc-200/70 flex flex-col sm:flex-row gap-2">
                                    <button
                                        type="button"
                                        onClick={handlePayOnline}
                                        disabled={paying}
                                        className="flex-1 py-3 px-4 bg-zinc-950 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
                                    >
                                        {paying ? (
                                            <Loader2 size={14} className="animate-spin text-emerald-400" />
                                        ) : (
                                            <Wallet size={14} className="text-emerald-400" />
                                        )}
                                        <span>{paying ? "Opening Razorpay..." : `Pay ₹${booking.fare} Online (UPI / Card)`}</span>
                                    </button>
                                </div>

                                <p className="text-[10px] text-zinc-500 text-center font-medium">
                                    💡 You can also hand <strong>₹{booking.fare} in cash</strong> to your driver after reaching your destination.
                                </p>
                            </div>
                        )
                    ) : (
                        /* Driver View */
                        isPaid ? (
                            <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 shadow-xs flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-emerald-950">✓ Paid Online (₹{booking.fare})</p>
                                        <p className="text-[11px] text-emerald-700">Payment received via online UPI/Card. Do not collect cash.</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Paid
                                </span>
                            </div>
                        ) : (
                            <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 shadow-xs flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <Banknote size={18} className="text-amber-700 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-amber-950">💵 Collect Cash: ₹{booking.fare}</p>
                                        <p className="text-[11px] text-amber-700">Collect at destination, or passenger can tap 'Pay Online' anytime.</p>
                                    </div>
                                </div>
                                <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Cash / Unpaid
                                </span>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Passenger / Driver Profile Card */}
            {(booking?.user || booking?.driver) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mx-5 lg:mx-6"
                >
                    {(() => {
                        const isDriverRole = currentRole === "driver"
                        const displayName = isDriverRole
                            ? (booking?.user?.name || "Passenger")
                            : (booking?.driver?.name || "Rider Partner")
                        const displaySubtitle = isDriverRole
                            ? "Passenger"
                            : (booking?.vehicle ? `Rider • ${booking.vehicle.vehicleModel} (${booking.vehicle.number})` : "Verified Rider")
                        const contactPhone = isDriverRole
                            ? (booking?.userMobileNumber || booking?.user?.phone)
                            : (booking?.driverMobileNumber || booking?.driver?.phone)

                        return (
                            <>
                                <div className='bg-zinc-950 rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-white/[0.06]'>
                                    <div className='relative flex-shrink-0'>
                                        <div className='w-14 h-14 rounded-2xl bg-zinc-800/90 border border-white/10 flex items-center justify-center font-bold text-lg text-white'>
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className='absolute -bottom-1 -right-1 bg-emerald-400 w-4 h-4 rounded-full border-2 border-zinc-950 shadow-sm' />
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center justify-between gap-2'>
                                            <p className='text-white font-bold text-base truncate'>{displayName}</p>
                                            <div className='flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full flex-shrink-0'>
                                                <IndianRupee size={10} className="text-amber-400" />
                                                <span className='text-white text-xs font-semibold'>{booking.fare}</span>
                                            </div>
                                        </div>

                                        <p className="text-xs text-zinc-400 truncate mt-0.5">{displaySubtitle}</p>

                                        {booking.paymentStatus && (
                                            <div className='flex items-center gap-2 mt-2'>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${paymentStatus.cls ?? "bg-zinc-700 text-zinc-300"}`}>
                                                    {paymentStatus.label}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isActive && (
                                    <div className='flex gap-2 mt-2.5'>
                                        {contactPhone ? (
                                            <a
                                                href={`tel:${contactPhone}`}
                                                className={`flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 active:scale-[0.97] transition-all text-zinc-900 py-3 rounded-xl text-sm font-semibold cursor-pointer ${canChat ? "flex-1" : "w-full"}`}
                                            >
                                                <Phone size={15} /> Call
                                            </a>
                                        ) : null}

                                        {canChat && (
                                            <button
                                                onClick={onChatToggle}
                                                className={`flex-1 flex items-center justify-center gap-2 active:scale-[0.97] transition-all py-3 rounded-xl text-sm font-semibold cursor-pointer shadow-sm ${
                                                    chatOpen 
                                                        ? "bg-emerald-500 text-zinc-950 font-bold shadow-md ring-2 ring-emerald-400/40" 
                                                        : "bg-zinc-900 hover:bg-zinc-800 text-white"
                                                }`}
                                            >
                                                <MessageCircle size={15} className={chatOpen ? "text-zinc-950" : "text-emerald-400"} />
                                                <span>{chatOpen ? "Hide Chat" : "Message"}</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )
                    })()}
                </motion.div>
            )}

            <AnimatePresence>
                {chatOpen && canChat && (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="mx-5 lg:mx-6 overflow-hidden"
                    >
                        <div className='rounded-2xl overflow-hidden border border-zinc-100 h-[460px] shadow-sm'>
                            <RideChat 
                                currentRole={currentRole} 
                                bookingId={booking._id} 
                                userName={booking?.user?.name || "Passenger"} 
                                driverName={booking?.driver?.name || "Driver Partner"} 
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {booking?.vehicle && (
                <div className='mx-5 lg:mx-6'>
                    <div className='bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3'>
                        <div className='w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0'>
                            {getVehicleIcon(booking.vehicle.type)}
                        </div>
                        <div className='flex-1 min-w-0'>
                            <p className='text-[10px] text-zinc-400 uppercase tracking-wider font-semibold'>Your Vehicle</p>
                            <p className='text-sm font-bold text-zinc-900 truncate'>{booking.vehicle.vehicleModel ?? "vehicle"}</p>
                        </div>
                        <div className='flex-shrink-0 bg-zinc-900 px-3 py-1.5 rounded-lg'>
                            <p className='text-white text-xs font-black tracking-widest font-mono'>{booking.vehicle.number ?? "number"}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className='mx-5 lg:mx-6'>
                <div className='bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden'>
                    <div className='flex gap-3 p-4 border-b border-zinc-100'>
                        <div className='flex flex-col items-center flex-shrink-0 pt-1'>
                            <div className='w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow-sm' />
                            <div className='w-px bg-zinc-200 mt-1" style={{ height: 20 }} ' />
                        </div>
                        <div className='flex-1 min-w-0'>
                           <p className='text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5'>PickUp</p>
                           <p className='text-sm text-zinc-800 leading-snug'>{booking?.pickUpAddress}</p>
                        </div>
                    </div>
                     <div className='flex gap-3 p-4 border-b border-zinc-100'>
                        <div className='flex flex-col items-center flex-shrink-0 pt-1'>
                            <div className='w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow-sm' />
                            <div className='w-px bg-zinc-200 mt-1" style={{ height: 20 }} ' />
                        </div>
                        <div className='flex-1 min-w-0'>
                           <p className='text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5'>Drop</p>
                           <p className='text-sm text-zinc-800 leading-snug'>{booking?.dropAddress}</p>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    )
}

export default PanelContent
