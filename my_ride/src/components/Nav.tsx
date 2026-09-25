'use client'
import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import Logo from './Logo'
import { usePathname, useRouter } from 'next/navigation'
import AuthModal from './AuthModal'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import {
  Bike,
  Car,
  Check,
  ChevronRight,
  ArrowRight,
  ArrowRightLeft,
  Copy,
  Crown,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  Shield,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { setUserData } from '@/redux/userSlice'
import axios from 'axios'
import { getSocket } from '@/lib/socket'

function Nav() {
  const [authOpen, setAuthOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const { userData } = useSelector((state: RootState) => state.user)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [adminStats, setAdminStats] = useState<{ pendingPartners: number; pendingKyc: number } | null>(null)
  const [activeRideUrl, setActiveRideUrl] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch<AppDispatch>()
  const [switchingRole, setSwitchingRole] = useState(false)
  const [partnerOnline, setPartnerOnline] = useState<boolean>(true)
  const [togglingOnline, setTogglingOnline] = useState<boolean>(false)

  const isRegisteredRider = Boolean(
    userData?.partnerStatus === "approved" ||
    (typeof userData?.partnerOnBoardingSteps === "number" && userData.partnerOnBoardingSteps >= 1)
  )

  const fetchPartnerOnlineStatus = async () => {
    if (userData?.role !== "partner") return
    try {
      const { data } = await axios.get("/api/partner/status")
      if (typeof data?.isOnline === "boolean") {
        setPartnerOnline(data.isOnline)
      }
    } catch (e) {
      // ignore
    }
  }

  const handleTogglePartnerOnline = async () => {
    if (togglingOnline || userData?.role !== "partner") return
    setTogglingOnline(true)
    const nextStatus = !partnerOnline
    try {
      const { data } = await axios.post("/api/partner/status", { isOnline: nextStatus })
      if (typeof data?.isOnline === "boolean") {
        setPartnerOnline(data.isOnline)
      } else {
        setPartnerOnline(nextStatus)
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("partner-status-changed", { detail: { isOnline: nextStatus } }))
      }
    } catch (err: any) {
      console.error("Toggle online status error:", err)
      alert(err.response?.data?.message || "Failed to update online status")
    } finally {
      setTogglingOnline(false)
    }
  }

  useEffect(() => {
    if (userData?.role === "partner") {
      fetchPartnerOnlineStatus()
    }
  }, [userData?.role])

  useEffect(() => {
    const handleStatusChanged = (e: any) => {
      if (typeof e.detail?.isOnline === "boolean") {
        setPartnerOnline(e.detail.isOnline)
      }
    }
    window.addEventListener("partner-status-changed", handleStatusChanged)
    return () => window.removeEventListener("partner-status-changed", handleStatusChanged)
  }, [])

  const handleSwitchRole = async (targetRole: "user" | "partner") => {
    if (switchingRole || !userData) return
    setSwitchingRole(true)
    try {
      const { data } = await axios.post("/api/user/switch-role", { targetRole })
      if (data?.user) {
        dispatch(setUserData(data.user))
      }
      setProfileOpen(false)
      setMobileMenuOpen(false)

      const targetPath = data?.redirectUrl || "/"
      router.push(targetPath)
      router.refresh()

      setTimeout(() => {
        window.location.href = targetPath
      }, 120)
    } catch (err: any) {
      console.error("Failed to switch role:", err)
      alert(err.response?.data?.message || "Failed to switch role")
      setSwitchingRole(false)
    }
  }

  // Check active ride status for Driver & Rider to allow jumping back in anytime
  useEffect(() => {
    if (!userData?._id) {
      setActiveRideUrl(null)
      return
    }

    const checkActiveRide = async () => {
      try {
        if (userData.role === "partner") {
          const { data } = await axios.get("/api/partner/my-active")
          if (data?._id && ["confirmed", "started"].includes(data.bookingStatus)) {
            setActiveRideUrl("/partner/active-ride")
          } else {
            setActiveRideUrl(null)
          }
        } else if (userData.role === "user") {
          const { data } = await axios.get("/api/user/bookings")
          if (Array.isArray(data)) {
            const active = data.find((b: any) => ["confirmed", "started"].includes(b.bookingStatus))
            if (active?._id) {
              setActiveRideUrl(`/user/ride/${active._id}`)
            } else {
              setActiveRideUrl(null)
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    checkActiveRide()
    const interval = setInterval(checkActiveRide, 8000)

    const socket = getSocket()
    const handleRideUpdate = () => checkActiveRide()
    socket.on("ride-status-update", handleRideUpdate)
    socket.on("booking-confirmed", handleRideUpdate)
    socket.on("ride-completed", handleRideUpdate)

    return () => {
      clearInterval(interval)
      socket.off("ride-status-update", handleRideUpdate)
      socket.off("booking-confirmed", handleRideUpdate)
      socket.off("ride-completed", handleRideUpdate)
    }
  }, [userData, pathname])

  const handleLogOut = async () => {
    try {
      await signOut({ redirect: false })
      dispatch(setUserData(null))
      setProfileOpen(false)
      setMobileMenuOpen(false)
      router.push("/")
      window.location.reload()
    } catch (error) {
      console.log(error)
    }
  }

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Global socket identity registration for all logged-in users (Partner, Rider, Admin)
  useEffect(() => {
    if (!userData?._id) return
    const socket = getSocket()
    socket.emit("identity", userData._id)

    const handleConnect = () => {
      socket.emit("identity", userData._id)
    }
    socket.on("connect", handleConnect)

    return () => {
      socket.off("connect", handleConnect)
    }
  }, [userData?._id])

  // Real-time synchronization for Partner ride requests count
  useEffect(() => {
    let isMounted = true

    const fetchPendingCount = async () => {
      try {
        const { data } = await axios.get("/api/partner/bookings/pending-requests-count")
        if (isMounted) {
          setPendingCount(typeof data.count === "number" ? data.count : 0)
        }
      } catch (error) {
        // ignore
      }
    }

    if (userData?.role === "partner") {
      fetchPendingCount()
      const socket = getSocket()
      const handleCountUpdate = () => fetchPendingCount()

      // Listen to all booking lifecycle updates
      socket.on("new-booking", handleCountUpdate)
      socket.on("new-booking-request", handleCountUpdate)
      socket.on("accept-booking", handleCountUpdate)
      socket.on("booking-accepted", handleCountUpdate)
      socket.on("reject-booking", handleCountUpdate)
      socket.on("booking-rejected", handleCountUpdate)
      socket.on("pending-count-update", handleCountUpdate)
      socket.on("ride-status-update", handleCountUpdate)
      socket.on("ride-confirmed", handleCountUpdate)

      // Listen to local window events triggered when accepting/rejecting in-tab
      window.addEventListener("refresh-partner-pending", handleCountUpdate)

      // Resilient background polling every 5 seconds to ensure badge is never stale
      const interval = setInterval(fetchPendingCount, 5000)

      return () => {
        isMounted = false
        socket.off("new-booking", handleCountUpdate)
        socket.off("new-booking-request", handleCountUpdate)
        socket.off("accept-booking", handleCountUpdate)
        socket.off("booking-accepted", handleCountUpdate)
        socket.off("reject-booking", handleCountUpdate)
        socket.off("booking-rejected", handleCountUpdate)
        socket.off("pending-count-update", handleCountUpdate)
        socket.off("ride-status-update", handleCountUpdate)
        socket.off("ride-confirmed", handleCountUpdate)
        window.removeEventListener("refresh-partner-pending", handleCountUpdate)
        clearInterval(interval)
      }
    }
  }, [userData, pathname])

  // Stats listener for Admin
  useEffect(() => {
    if (userData?.role === "admin") {
      const fetchAdminStats = async () => {
        try {
          const [dashRes, kycRes] = await Promise.all([
            axios.get("/api/admin/dashboard"),
            axios.get("/api/admin/video-kyc/pending")
          ])
          setAdminStats({
            pendingPartners: dashRes.data?.pendingPartnersReviews?.length ?? 0,
            pendingKyc: kycRes.data?.length ?? 0
          })
        } catch (e) {
          // ignore
        }
      }
      fetchAdminStats()
    }
  }, [userData])

  // Hide Nav only on full-screen WebRTC video kyc
  if (pathname?.startsWith("/video-kyc/")) {
    return null
  }

  const isRole = userData?.role || "user"

  const roleConfig = {
    admin: {
      roleName: "Admin",
      badge: "👑 Administrator",
      pillBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      btnBorder: "bg-purple-950/40 border-purple-500/30 hover:border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.2)]",
      avatarBg: "bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 ring-2 ring-purple-400/50",
      cardGradient: "from-purple-950/70 via-zinc-900 to-zinc-950 border-purple-500/30",
      icon: <Crown size={12} className="text-amber-400" />,
    },
    partner: {
      roleName: "Rider",
      badge: "🚗 Verified Rider Partner",
      pillBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      btnBorder: "bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
      avatarBg: "bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 ring-2 ring-emerald-400/50",
      cardGradient: "from-emerald-950/70 via-zinc-900 to-zinc-950 border-emerald-500/30",
      icon: <Car size={12} className="text-emerald-400" />,
    },
    user: {
      roleName: "Passenger",
      badge: "🎒 Verified Passenger",
      pillBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      btnBorder: "bg-blue-950/40 border-blue-500/30 hover:border-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.2)]",
      avatarBg: "bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-500 ring-2 ring-blue-400/50",
      cardGradient: "from-blue-950/70 via-zinc-900 to-zinc-950 border-blue-500/30",
      icon: <User size={12} className="text-blue-400" />,
    },
  }[isRole === "admin" ? "admin" : isRole === "partner" ? "partner" : "user"]

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Logo size="md" />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-7">
              {userData?.role === "admin" ? (
                <>
                  <Link className={`text-sm font-semibold transition ${pathname === '/' ? 'text-white' : 'text-zinc-400 hover:text-white'}`} href="/">
                    Dashboard
                  </Link>
                  <Link className="relative text-sm font-medium text-zinc-400 hover:text-white transition flex items-center gap-1.5" href="/#partner-reviews">
                    <span>Partner Reviews</span>
                    {adminStats && adminStats.pendingPartners > 0 ? (
                      <span className="w-5 h-5 bg-purple-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold">
                        {adminStats.pendingPartners}
                      </span>
                    ) : null}
                  </Link>
                  <Link className="relative text-sm font-medium text-zinc-400 hover:text-white transition flex items-center gap-1.5" href="/#kyc-queue">
                    <span>Video KYC</span>
                    {adminStats && adminStats.pendingKyc > 0 ? (
                      <span className="w-5 h-5 bg-amber-500 text-zinc-950 text-[11px] rounded-full flex items-center justify-center font-bold">
                        {adminStats.pendingKyc}
                      </span>
                    ) : null}
                  </Link>
                  <Link className="text-sm font-medium text-zinc-400 hover:text-white transition" href="/user/book">
                    Test Passenger Ride
                  </Link>
                </>
              ) : userData?.role === "partner" ? (
                <>
                  <Link className={`text-sm font-semibold transition ${pathname === '/' ? 'text-white' : 'text-zinc-400 hover:text-white'}`} href="/">
                    Home
                  </Link>
                  <Link className="relative text-sm font-medium text-zinc-400 hover:text-white transition flex items-center gap-1.5" href="/partner/pending-requests">
                    <span>Requests</span>
                    {typeof pendingCount === "number" && pendingCount > 0 ? (
                      <span className="w-5 h-5 bg-emerald-500 text-zinc-950 text-[11px] rounded-full flex items-center justify-center font-bold animate-pulse">
                        {pendingCount}
                      </span>
                    ) : null}
                  </Link>
                  <Link className={`text-sm font-medium transition ${pathname === '/partner/bookings' ? 'text-white' : 'text-zinc-400 hover:text-white'}`} href="/partner/bookings">
                    Bookings
                  </Link>
                  <Link className={`text-sm font-medium transition ${pathname === '/partner/active-ride' ? 'text-white' : 'text-zinc-400 hover:text-white'}`} href="/partner/active-ride">
                    Active Ride
                  </Link>
                </>
              ) : (
                <>
                  <Link className={`text-sm font-semibold transition ${pathname === '/user/book' ? 'text-white' : 'text-zinc-300 hover:text-white'}`} href="/user/book">
                    Ride
                  </Link>
                  {isRegisteredRider ? (
                    <button
                      onClick={() => handleSwitchRole("partner")}
                      disabled={switchingRole}
                      className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRightLeft size={13} className="text-emerald-400" />
                      <span>Switch to Rider</span>
                    </button>
                  ) : (
                    <Link className="text-sm font-medium text-zinc-300 hover:text-white transition" href="/partner/onboarding/vehicle">
                      Become a Rider
                    </Link>
                  )}
                  {userData && (
                    <Link className={`text-sm font-medium transition ${pathname === '/user/bookings' ? 'text-white' : 'text-zinc-300 hover:text-white'}`} href="/user/bookings">
                      My Bookings
                    </Link>
                  )}
                  <a className="text-sm font-medium text-zinc-300 hover:text-white transition" href="#fleet">
                    Fleet
                  </a>
                  <a className="text-sm font-medium text-zinc-300 hover:text-white transition" href="#safety">
                    Safety
                  </a>
                </>
              )}
            </nav>
          </div>

          {/* Right Action Buttons & Role Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Online/Offline Toggle (when in Rider mode) */}
            {userData?.role === "partner" && (
              <button
                onClick={handleTogglePartnerOnline}
                disabled={togglingOnline}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer border ${
                  partnerOnline
                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700"
                }`}
                title={partnerOnline ? "You are Online (Click to go Offline)" : "You are Offline (Click to go Online)"}
              >
                <span className={`w-2 h-2 rounded-full ${partnerOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                <span className="hidden sm:inline">{partnerOnline ? "Online" : "Offline"}</span>
              </button>
            )}

            {/* Quick Switch to Passenger (when in Rider mode) */}
            {userData?.role === "partner" && (
              <button
                onClick={() => handleSwitchRole("user")}
                disabled={switchingRole}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold transition shadow-xs cursor-pointer"
                title="Switch to Passenger Mode"
              >
                {switchingRole ? (
                  <span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                ) : (
                  <ArrowRightLeft size={13} className="text-blue-400" />
                )}
                <span>Passenger Mode</span>
              </button>
            )}

            {/* Quick Switch to Rider (when in Passenger mode and already verified/registered) */}
            {userData?.role === "user" && isRegisteredRider && (
              <button
                onClick={() => handleSwitchRole("partner")}
                disabled={switchingRole}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shadow-xs cursor-pointer"
                title="Switch back to Rider Mode"
              >
                {switchingRole ? (
                  <span className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                ) : (
                  <ArrowRightLeft size={13} className="text-emerald-400" />
                )}
                <span>Rider Mode</span>
              </button>
            )}

            {/* Live Active Ride Quick Button */}
            {activeRideUrl && (
              <Link
                href={activeRideUrl}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  pathname === activeRideUrl
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)] animate-pulse"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="hidden sm:inline">Active Ride</span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-zinc-950/20">Live</span>
              </Link>
            )}

            {!userData ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Log in
                </button>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  Sign up
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Visual Avatar Button */}
                <button
                  onClick={() => setProfileOpen(p => !p)}
                  className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border transition-all cursor-pointer ${roleConfig.btnBorder}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleConfig.pillBg}`}>
                      {roleConfig.icon}
                      {roleConfig.roleName}
                    </span>
                    <span className="text-xs font-semibold text-zinc-200 hidden sm:inline">
                      {userData.name.split(' ')[0]}
                    </span>
                  </div>

                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs text-white shadow-sm ${roleConfig.avatarBg}`}>
                      {userData.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Live notification ping */}
                    {userData.role === "partner" && pendingCount && pendingCount > 0 ? (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-zinc-950 rounded-full animate-ping" />
                    ) : null}
                  </div>
                </button>

                {/* Dropdown Menu Panel */}
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-3 w-80 sm:w-88 bg-zinc-950/95 backdrop-blur-2xl border border-white/[0.12] text-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-3.5 z-50 overflow-hidden"
                    >
                      {/* User Info Header Card */}
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${roleConfig.cardGradient} border mb-3`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-2xl font-bold flex items-center justify-center text-lg text-white shadow-lg shrink-0 ${roleConfig.avatarBg}`}>
                            {userData.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <p className="font-bold text-sm text-white truncate">{userData.name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleConfig.pillBg}`}>
                                {roleConfig.badge}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 truncate">{userData.email}</p>
                          </div>
                        </div>

                        {/* Quick One-Click Copy User ID Pill */}
                        {userData._id && (
                          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              ID: {String(userData._id).slice(0, 8)}...{String(userData._id).slice(-4)}
                            </span>
                            <button
                              onClick={(e) => handleCopyId(String(userData._id), e)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold transition cursor-pointer"
                            >
                              {copiedId ? (
                                <>
                                  <Check size={11} className="text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy ID</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Role Specific Shortcuts */}
                      <div className="space-y-1">
                        {userData.role === "admin" ? (
                          <>
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Admin Controls
                            </div>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">📊 Admin Command Center</span>
                              <ChevronRight size={14} className="text-zinc-500" />
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/#partner-reviews") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">👥 Pending Partner Reviews</span>
                              {adminStats && adminStats.pendingPartners > 0 ? (
                                <span className="bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  {adminStats.pendingPartners}
                                </span>
                              ) : <ChevronRight size={14} className="text-zinc-500" />}
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/#kyc-queue") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">📹 Video KYC Verification</span>
                              {adminStats && adminStats.pendingKyc > 0 ? (
                                <span className="bg-amber-500 text-zinc-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  {adminStats.pendingKyc}
                                </span>
                              ) : <ChevronRight size={14} className="text-zinc-500" />}
                            </button>

                            <div className="my-1.5 border-t border-white/10" />
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Testing Switcher
                            </div>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/user/book") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/10 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">🚖 Test Passenger Booking</span>
                              <ChevronRight size={14} className="text-blue-500" />
                            </button>
                          </>
                        ) : userData.role === "partner" ? (
                          <>
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Driver Hub
                            </div>
                            <button
                              onClick={handleTogglePartnerOnline}
                              disabled={togglingOnline}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                                partnerOnline ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-400 hover:bg-zinc-800"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${partnerOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                                <span>{partnerOnline ? "Online (Accepting Rides)" : "Offline (Hidden)"}</span>
                              </span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                {partnerOnline ? "Turn Off" : "Turn On"}
                              </span>
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/partner/pending-requests") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">⚡ Incoming Ride Requests</span>
                              {pendingCount && pendingCount > 0 ? (
                                <span className="bg-emerald-500 text-zinc-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                  {pendingCount}
                                </span>
                              ) : <ChevronRight size={14} className="text-zinc-500" />}
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/partner/active-ride") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">🚘 Active Ride & Radar</span>
                              <ChevronRight size={14} className="text-zinc-500" />
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/partner/bookings") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">📅 Completed Bookings</span>
                              <ChevronRight size={14} className="text-zinc-500" />
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">📄 Onboarding Status</span>
                              <ChevronRight size={14} className="text-zinc-500" />
                            </button>

                            <div className="my-1.5 border-t border-white/10" />
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Switch Mode
                            </div>
                            <button
                              onClick={() => handleSwitchRole("user")}
                              disabled={switchingRole}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/10 rounded-xl transition cursor-pointer border border-blue-500/20 bg-blue-950/20"
                            >
                              <span className="flex items-center gap-2">
                                <ArrowRightLeft size={14} className="text-blue-400" />
                                <span>Switch to Passenger Mode</span>
                              </span>
                              <ChevronRight size={14} className="text-blue-500" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Passenger Actions
                            </div>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/user/book") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">🚖 Book a Ride Now</span>
                              <ChevronRight size={14} className="text-zinc-500" />
                            </button>
                            <button
                              onClick={() => { setProfileOpen(false); router.push("/user/bookings") }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
                            >
                              <span className="flex items-center gap-2">📋 My Bookings & Rides</span>
                              <ChevronRight size={14} className="text-zinc-500" />
                            </button>
                            
                            <div className="my-1.5 border-t border-white/10" />
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              Rider Switch
                            </div>
                            {isRegisteredRider ? (
                              <button
                                onClick={() => handleSwitchRole("partner")}
                                disabled={switchingRole}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer border border-emerald-500/20 bg-emerald-950/20"
                              >
                                <span className="flex items-center gap-2">
                                  <ArrowRightLeft size={14} className="text-emerald-400" />
                                  <span>Switch to Rider Mode</span>
                                </span>
                                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                  Verified
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => { setProfileOpen(false); router.push("/partner/onboarding/vehicle") }}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer"
                              >
                                <span className="flex items-center gap-2">🚗 Become a Rider</span>
                                <ChevronRight size={14} className="text-emerald-500" />
                              </button>
                            )}
                          </>
                        )}

                        <div className="my-1.5 border-t border-white/10" />

                        {/* Logout Button */}
                        <button
                          onClick={handleLogOut}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/15 rounded-xl transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <LogOut size={14} /> Log Out
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-rose-400/80">Exit</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(p => !p)}
              className="md:hidden w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition ml-1"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

        </div>

        {/* Mobile Slide-down Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-white/10 bg-zinc-950 px-6 py-5 overflow-hidden"
            >
              <div className="flex flex-col gap-4">
                {/* Mobile Active Ride Alert banner */}
                {activeRideUrl && (
                  <Link
                    onClick={() => setMobileMenuOpen(false)}
                    href={activeRideUrl}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>{pathname === activeRideUrl ? "You are on Active Ride" : "Return to Live Ride"}</span>
                    </div>
                    <ChevronRight size={16} />
                  </Link>
                )}

                {userData?.role === "admin" ? (
                  <>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-white" href="/">
                      📊 Admin Dashboard
                    </Link>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white flex items-center justify-between" href="/#partner-reviews">
                      <span>👥 Partner Reviews</span>
                      {adminStats && adminStats.pendingPartners > 0 ? (
                        <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {adminStats.pendingPartners}
                        </span>
                      ) : null}
                    </Link>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white flex items-center justify-between" href="/#kyc-queue">
                      <span>📹 Video KYC</span>
                      {adminStats && adminStats.pendingKyc > 0 ? (
                        <span className="bg-amber-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full font-bold">
                          {adminStats.pendingKyc}
                        </span>
                      ) : null}
                    </Link>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-blue-400 hover:text-white" href="/user/book">
                      🚖 Test Passenger Ride
                    </Link>
                  </>
                ) : userData?.role === "partner" ? (
                  <>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-white" href="/">Home</Link>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white flex items-center justify-between" href="/partner/pending-requests">
                      <span>Requests</span>
                      {typeof pendingCount === "number" && pendingCount > 0 ? (
                        <span className="bg-emerald-500 text-zinc-950 text-xs px-2 py-0.5 rounded-full font-bold">{pendingCount}</span>
                      ) : null}
                    </Link>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white" href="/partner/bookings">Bookings</Link>
                    <button
                      onClick={handleTogglePartnerOnline}
                      disabled={togglingOnline}
                      className={`text-left text-sm font-semibold py-1.5 flex items-center justify-between cursor-pointer ${
                        partnerOnline ? "text-emerald-400" : "text-zinc-400"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${partnerOnline ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                        <span>Status: {partnerOnline ? "Online (Accepting)" : "Offline (Hidden)"}</span>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                        {partnerOnline ? "Go Offline" : "Go Online"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleSwitchRole("user")}
                      disabled={switchingRole}
                      className="text-left text-sm font-semibold text-blue-400 hover:text-blue-300 py-1 flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowRightLeft size={14} className="text-blue-400" />
                      <span>Switch to Passenger Mode</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-white" href="/user/book">Ride</Link>
                    {isRegisteredRider ? (
                      <button
                        onClick={() => handleSwitchRole("partner")}
                        disabled={switchingRole}
                        className="text-left text-sm font-semibold text-emerald-400 hover:text-emerald-300 py-1 flex items-center gap-2 cursor-pointer"
                      >
                        <ArrowRightLeft size={14} className="text-emerald-400" />
                        <span>Switch to Rider Mode</span>
                      </button>
                    ) : (
                      <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white" href="/partner/onboarding/vehicle">Become a Rider</Link>
                    )}
                    {userData && (
                      <Link onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white" href="/user/bookings">My Bookings</Link>
                    )}
                    <a onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white" href="#fleet">Fleet</a>
                    <a onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-zinc-300 hover:text-white" href="#safety">Safety</a>
                  </>
                )}

                {!userData ? (
                  <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                    <button
                      onClick={() => { setMobileMenuOpen(false); setAuthOpen(true) }}
                      className="w-full py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-sm"
                    >
                      Sign Up / Login
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-white/10">
                    <button
                      onClick={handleLogOut}
                      className="w-full py-2.5 rounded-xl bg-rose-500/20 text-rose-300 font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Floating Active Ride Alert Banner when user navigates away from active ride */}
      <AnimatePresence>
        {activeRideUrl && pathname !== activeRideUrl && (
          <motion.aside
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.25 }}
            aria-label="Active Ride Notification"
            className="fixed top-16 sm:top-20 inset-x-0 z-40 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-zinc-950 shadow-xl border-b border-emerald-400/40"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-zinc-950 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-950"></span>
                </span>
                <span className="truncate">
                  {userData?.role === "partner"
                    ? "Active Ride in progress! Customer is waiting on live GPS."
                    : "Your ride is currently active with your driver!"}
                </span>
              </div>
              <Link
                href={activeRideUrl}
                className="shrink-0 px-3.5 py-1.5 bg-zinc-950 text-white rounded-full font-bold text-xs hover:bg-zinc-900 transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <span>Return to Live Status</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}

export default Nav
