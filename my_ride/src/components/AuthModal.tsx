'use client'
import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { CircleDashed, Lock, Mail, User, X, ArrowLeft, RotateCw, Edit3, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Logo from './Logo'
import axios from 'axios'
import { signIn } from 'next-auth/react'

type propType = {
    open: boolean,
    onClose: () => void
}
type stepType = "login" | "signup" | "otp"

function AuthModal({ open, onClose }: propType) {
    const [step, setStep] = useState<stepType>("login")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [err, setErr] = useState("")
    const [successMsg, setSuccessMsg] = useState("")
    const [otp, setOtp] = useState(["", "", "", "", "", ""])
    const [countdown, setCountdown] = useState(0)

    // Countdown timer for Resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    const handleSignUp = async () => {
        if (!name.trim()) {
            setErr("Please enter your full name")
            return
        }
        if (!email.trim() || !email.includes("@")) {
            setErr("Please enter a valid email address")
            return
        }
        if (password.length < 6) {
            setErr("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        setErr("")
        try {
            await axios.post("/api/auth/register", {
                name, email, password
            })
            setErr("")
            setCountdown(30)
            setStep("otp")
            setLoading(false)
        } catch (error: any) {
            setLoading(false)
            setErr(error.response?.data?.message ?? "Something went wrong. Please try again.")
        }
    }

    const handleResendOtp = async () => {
        if (countdown > 0 || resending) return
        setResending(true)
        setErr("")
        setSuccessMsg("")
        try {
            await axios.post("/api/auth/resend-otp", { email })
            setSuccessMsg("A new 6-digit OTP has been sent to your email!")
            setCountdown(30)
            setResending(false)
        } catch (error: any) {
            setResending(false)
            setErr(error.response?.data?.message ?? "Failed to resend OTP.")
        }
    }

    const handleVerifyEmail = async () => {
        const fullOtp = otp.join("").trim()
        if (fullOtp.length < 6) {
            setErr("Please enter the complete 6-digit verification code.")
            return
        }

        setLoading(true)
        setErr("")
        try {
            await axios.post("/api/auth/verify-email", {
                email,
                otp: fullOtp
            })

            // Automatically sign in the user upon verification
            const loginRes = await signIn("credentials", {
                email,
                password,
                redirect: false
            })

            setLoading(false)

            if (loginRes?.ok) {
                onClose()
                window.location.reload()
            } else {
                setStep("login")
                setSuccessMsg("Email verified! You can now log in.")
            }
        } catch (error: any) {
            setLoading(false)
            setErr(error.response?.data?.message ?? "Invalid OTP code. Please check and try again.")
        }
    }

    const handleLogin = async () => {
        setLoading(true)
        setErr("")
        const res = await signIn("credentials", {
            email, password, redirect: false
        })
        setLoading(false)
        if (res?.error) {
            setErr("Invalid email or password.")
        } else if (res?.ok) {
            onClose()
            window.location.reload()
        }
    }

    const handleGoogleLogin = async () => {
        await signIn("google", {
            callbackUrl: "/"
        })
    }

    const handleChangeOtp = (index: number, value: string) => {
        if (!/^[0-9]?$/.test(value)) return
        const updated = [...otp]
        updated[index] = value
        setOtp(updated)

        if (value && index < otp.length - 1) {
            document.getElementById(`otp-${index + 1}`)?.focus()
        }
        if (!value && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus()
        }
    }

    const handlePasteOtp = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("text").trim()
        if (/^\d{6}$/.test(pasted)) {
            const digits = pasted.split("")
            setOtp(digits)
            document.getElementById(`otp-5`)?.focus()
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            exit={{ opacity: 0, scale: 0.95, y: 40 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                        >
                            <div className='relative w-full max-w-md rounded-3xl bg-white border border-black/10 shadow-[0_40px_100px_rgba(0,0,0,0.35)] p-6 sm:p-8 text-black'>
                                <div className='absolute right-4 top-4 text-gray-500 hover:text-black transition cursor-pointer p-1 rounded-full' onClick={onClose}>
                                    <X size={20} />
                                </div>
                                <div className='mb-6 flex flex-col items-center justify-center text-center'>
                                    <Logo size="lg" lightMode={true} />
                                    <p className='mt-2 text-xs text-gray-500 font-medium'>Smart Vehicle Booking & Mobility</p>
                                </div>

                                {/* Only show Google OAuth on Login / Signup steps */}
                                {step !== "otp" && (
                                    <>
                                        <button
                                            className='w-full h-11 rounded-xl border border-black/20 flex items-center justify-center gap-3 text-sm font-semibold hover:bg-black hover:text-white transition cursor-pointer'
                                            onClick={handleGoogleLogin}
                                        >
                                            <Image src="/google.png" alt='Google' width={20} height={20} />
                                            <span>Continue with Google</span>
                                        </button>

                                        <div className='flex items-center my-5'>
                                            <div className='flex-1 border-t border-black/10'></div>
                                            <span className='px-3 text-xs text-gray-400 font-semibold uppercase tracking-wider'>OR</span>
                                            <div className='flex-1 border-t border-black/10'></div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    {step === "login" && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <h1 className='text-xl font-semibold'>Welcome Back</h1>
                                            {successMsg && (
                                                <p className="mt-2 text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                                                    {successMsg}
                                                </p>
                                            )}
                                            <div className='mt-5 space-y-4'>
                                                <div className='flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3'>
                                                    <Mail size={18} className='text-gray-500' />
                                                    <input
                                                        type="email"
                                                        placeholder='Email'
                                                        className='w-full bg-transparent outline-none text-sm'
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        value={email}
                                                    />
                                                </div>
                                                <div className='flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3 focus-within:border-black transition'>
                                                    <Lock size={18} className='text-gray-500 flex-shrink-0' />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder='Password'
                                                        className='w-full bg-transparent outline-none text-sm'
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        value={password}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(p => !p)}
                                                        className="text-gray-400 hover:text-black transition cursor-pointer p-0.5 flex-shrink-0"
                                                        title={showPassword ? "Hide password" : "Show password"}
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>

                                                {err && <p className='text-xs text-red-500 font-medium'>*{err}</p>}

                                                <button
                                                    className='w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center cursor-pointer disabled:opacity-50'
                                                    disabled={loading}
                                                    onClick={handleLogin}
                                                >
                                                    {!loading ? "Login" : <CircleDashed size={18} color='white' className='animate-spin' />}
                                                </button>
                                            </div>
                                            <p className='mt-6 text-center text-sm text-gray-500'>
                                                Don’t have an account?{" "}
                                                <span onClick={() => { setStep("signup"); setErr(""); setSuccessMsg("") }} className='text-black font-semibold hover:underline cursor-pointer ml-1'>
                                                    Sign Up
                                                </span>
                                            </p>
                                        </motion.div>
                                    )}

                                    {step === "signup" && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <h1 className='text-xl font-semibold'>Create Account</h1>
                                            <div className='mt-5 space-y-4'>
                                                <div className='flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3'>
                                                    <User size={18} className='text-gray-500' />
                                                    <input
                                                        type="text"
                                                        placeholder='Full Name'
                                                        className='w-full bg-transparent outline-none text-sm'
                                                        onChange={(e) => setName(e.target.value)}
                                                        value={name}
                                                    />
                                                </div>
                                                <div className='flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3'>
                                                    <Mail size={18} className='text-gray-500' />
                                                    <input
                                                        type="email"
                                                        placeholder='Email Address'
                                                        className='w-full bg-transparent outline-none text-sm'
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        value={email}
                                                    />
                                                </div>
                                                <div className='flex items-center gap-3 border border-black/20 rounded-xl px-4 py-3 focus-within:border-black transition'>
                                                    <Lock size={18} className='text-gray-500 flex-shrink-0' />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder='Password (min. 6 characters)'
                                                        className='w-full bg-transparent outline-none text-sm'
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        value={password}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(p => !p)}
                                                        className="text-gray-400 hover:text-black transition cursor-pointer p-0.5 flex-shrink-0"
                                                        title={showPassword ? "Hide password" : "Show password"}
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>

                                                {err && <p className='text-xs text-red-500 font-medium'>*{err}</p>}

                                                <button
                                                    className='w-full h-11 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition flex justify-center items-center cursor-pointer disabled:opacity-50'
                                                    disabled={loading}
                                                    onClick={handleSignUp}
                                                >
                                                    {!loading ? "Send Verification OTP" : <CircleDashed size={18} color='white' className='animate-spin' />}
                                                </button>
                                            </div>
                                            <p className='mt-6 text-center text-sm text-gray-500'>
                                                Already have an account?{" "}
                                                <span onClick={() => { setStep("login"); setErr(""); setSuccessMsg("") }} className='text-black font-semibold hover:underline cursor-pointer ml-1'>
                                                    Login
                                                </span>
                                            </p>
                                        </motion.div>
                                    )}

                                    {step === "otp" && (
                                        <motion.div
                                            key="otp"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => { setStep("signup"); setErr(""); setSuccessMsg("") }}
                                                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-black font-bold cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    <ArrowLeft size={14} /> Back
                                                </button>
                                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                                                    Step 2 of 2
                                                </span>
                                            </div>

                                            <h2 className='text-xl font-bold mt-4 text-gray-900'>Verify Your Email</h2>
                                            
                                            {/* Prominent Email Address badge with Change/Correct button */}
                                            <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200">
                                                <div className="min-w-0 flex-1 mr-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sent code to</p>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate" title={email}>
                                                        {email}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => { setStep("signup"); setErr(""); setSuccessMsg("") }}
                                                    className="flex-shrink-0 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 border border-gray-200 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                                    title="Correct email address"
                                                >
                                                    <Edit3 size={12} />
                                                    <span>Change</span>
                                                </button>
                                            </div>

                                            {successMsg && (
                                                <p className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                                                    <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-600" />
                                                    <span>{successMsg}</span>
                                                </p>
                                            )}

                                            <div className='mt-5 flex justify-between gap-2' onPaste={handlePasteOtp}>
                                                {otp.map((digit, i) => (
                                                    <input
                                                        key={i}
                                                        id={`otp-${i}`}
                                                        value={digit}
                                                        maxLength={1}
                                                        className='w-10 h-12 sm:w-12 text-center text-xl font-mono font-black rounded-xl bg-gray-50 border-2 border-gray-200 outline-none focus:border-black focus:bg-white transition'
                                                        onChange={(e) => handleChangeOtp(i, e.target.value)}
                                                    />
                                                ))}
                                            </div>

                                            {err && <p className='mt-3 text-xs text-red-500 font-semibold'>*{err}</p>}

                                            <button
                                                className='mt-5 w-full h-11 rounded-xl bg-black text-white font-bold hover:bg-gray-900 flex justify-center items-center transition cursor-pointer disabled:opacity-50 shadow-md'
                                                disabled={loading}
                                                onClick={handleVerifyEmail}
                                            >
                                                {!loading ? "Verify OTP and Create Account" : <CircleDashed size={18} color='white' className='animate-spin' />}
                                            </button>

                                            {/* Resend OTP Bar */}
                                            <div className="mt-4 flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                                                <span className="text-gray-500">Didn't receive code?</span>
                                                <button
                                                    onClick={handleResendOtp}
                                                    disabled={countdown > 0 || resending}
                                                    className="font-bold text-black hover:text-blue-600 disabled:opacity-40 disabled:hover:text-black cursor-pointer flex items-center gap-1.5 transition"
                                                >
                                                    {resending ? (
                                                        <CircleDashed size={13} className="animate-spin text-blue-600" />
                                                    ) : (
                                                        <RotateCw size={13} />
                                                    )}
                                                    <span>{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}</span>
                                                </button>
                                            </div>

                                            <p className="mt-3 text-[11px] text-gray-400 text-center">
                                                💡 Please check your <strong>Spam</strong> or <strong>Junk</strong> folder if you don't see it in your inbox.
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default AuthModal
