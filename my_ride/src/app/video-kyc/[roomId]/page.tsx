'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import Image from 'next/image';
import { CheckCircle, Mic, MicOff, PhoneOff, Video, VideoOff, X, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import { getSocket } from '@/lib/socket';

function page() {
  const { userData } = useSelector((state: RootState) => state.user)
  const containerRef = useRef<HTMLDivElement>(null)
  const [joined, setJoined] = useState(false)
  const previewRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const zpRef = useRef<any>(null)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const { roomId } = useParams()
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")
  const [aLoading, setALoading] = useState(false)
  const [rLoading, setRLoading] = useState(false)
  const [showApprovalModal, setShowApprovalModel] = useState(false)
  const [showRejectionModal, setShowRejectionModel] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<{
    action: "approved" | "rejected" | "ended";
    reason?: string;
  } | null>(null)
  const router = useRouter()

  // Hardware media stream and Zego cleanup helper
  const stopMediaTracks = () => {
    // 1. Stop local preview stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
      } catch (e) {}
      streamRef.current = null
    }

    // 2. Stop HTML video element stream
    if (previewRef.current && previewRef.current.srcObject) {
      try {
        const s = previewRef.current.srcObject as MediaStream
        s.getTracks().forEach((t) => {
          t.stop()
          t.enabled = false
        })
      } catch (e) {}
      previewRef.current.srcObject = null
    }

    // 3. Destroy Zego UIKit instance
    if (zpRef.current) {
      try {
        zpRef.current.leaveRoom?.()
        zpRef.current.destroy?.()
      } catch (e) {}
      zpRef.current = null
    }
  }

  // Initial local preview setup
  useEffect(() => {
    if (joined) return
    let localstream: MediaStream
    const init = async () => {
      try {
        localstream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        setStream(localstream)
        streamRef.current = localstream
        if (previewRef.current) {
          previewRef.current.srcObject = localstream
        }
      } catch (error) {
        console.log(error)
      }
    }

    init()

    return () => {
      stopMediaTracks()
    }
  }, [joined])

  // Socket listener for room events and completion
  useEffect(() => {
    if (!roomId) return
    const socket = getSocket()
    socket.emit("join-kyc", roomId.toString())

    const handleKycEnded = (data: { action: "approved" | "rejected" | "ended"; reason?: string }) => {
      console.log("KYC ended event received:", data)
      stopMediaTracks()
      setJoined(false)
      setCompletionStatus(data)

      // Auto redirect after feedback notification
      setTimeout(() => {
        router.push("/")
      }, 2500)
    }

    socket.on("kyc-ended", handleKycEnded)

    const handleBeforeUnload = () => {
      stopMediaTracks()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      socket.off("kyc-ended", handleKycEnded)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      stopMediaTracks()
    }
  }, [roomId, router])

  const toggleCamera = () => {
    if (!streamRef.current) return
    streamRef.current.getVideoTracks().forEach((track) => track.enabled = !isCameraOn);
    setIsCameraOn(!isCameraOn)
  }

  const toggleMic = () => {
    if (!streamRef.current) return
    streamRef.current.getAudioTracks().forEach((track) => track.enabled = !isMicOn);
    setIsMicOn(!isMicOn)
  }

  const handleApprove = async () => {
    setALoading(true)
    try {
      // 1. Immediately turn off admin camera & mic hardware
      stopMediaTracks()

      // 2. Broadcast socket termination to driver
      const socket = getSocket()
      socket.emit("end-kyc", {
        roomId: roomId?.toString(),
        action: "approved"
      })

      // 3. Mark partner approved in database
      await axios.post("/api/admin/video-kyc/complete", { roomId, action: "approved" })

      setALoading(false)
      router.push("/")
    } catch (error: any) {
      console.log(error.response?.data?.message ?? error)
      setALoading(false)
    }
  }

  const handleReject = async () => {
    setRLoading(true)
    try {
      // 1. Stop admin hardware
      stopMediaTracks()

      // 2. Broadcast socket termination to driver
      const socket = getSocket()
      socket.emit("end-kyc", {
        roomId: roomId?.toString(),
        action: "rejected",
        reason
      })

      // 3. Mark partner rejected in database
      await axios.post("/api/admin/video-kyc/complete", { roomId, action: "rejected", reason })

      setRLoading(false)
      router.push("/")
    } catch (error: any) {
      console.log(error.response?.data?.message ?? error)
      setRLoading(false)
    }
  }

  const handleEndCall = () => {
    stopMediaTracks()
    const socket = getSocket()
    socket.emit("end-kyc", {
      roomId: roomId?.toString(),
      action: "ended"
    })
    router.push("/")
  }

  const startCall = async () => {
    if (!containerRef.current) {
      return null
    }
    setLoading(true)

    // Stop preview stream before Zego takes over hardware
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStream(null)
    }

    const displayName = userData?.role === "admin" ? "Admin" : `${userData?.name || "Driver"} (${userData?.email || ""})`
    try {
      const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')
      const appId = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID)
      const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET
      const userId = userData?._id ? String(userData._id) : "user_" + Math.floor(Math.random() * 10000)
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret!,
        roomId?.toString()!,
        userId,
        displayName
      )

      const zp = ZegoUIKitPrebuilt.create(kitToken)
      zpRef.current = zp
      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        showPreJoinView: false,
        onLeaveRoom: () => {
          handleEndCall()
        },
      });
      setJoined(true)
      setLoading(false)
    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-black text-white flex flex-col'>
      {/* Top Header */}
      <div className='px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-20 bg-black/80 backdrop-blur-md'>
        <div>
          <Image src={"/logo.png"} alt='logo' width={44} height={44} priority />
          <p className='text-xs text-gray-400'>{userData?.role === "admin" ? "Admin Verification Portal" : "Partner Video KYC Session"}</p>
        </div>

        {joined && (
          <div className='flex flex-wrap gap-3'>
            {userData?.role === "admin" && (
              <>
                <button
                  className='bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-green-600/30'
                  onClick={() => setShowApprovalModel(true)}
                >
                  <CheckCircle size={16} /> Approve Partner
                </button>
                <button
                  className='bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-red-600/30'
                  onClick={() => setShowRejectionModel(true)}
                >
                  <XCircle size={16} /> Reject
                </button>
              </>
            )}
            <button
              className='bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition cursor-pointer'
              onClick={handleEndCall}
            >
              <PhoneOff size={16} /> End Call
            </button>
          </div>
        )}
      </div>

      {/* Main Video View */}
      <div className='flex-1 relative overflow-hidden'>
        <div
          ref={containerRef}
          className={`absolute inset-0 ${joined ? "block" : "hidden"}`}
        />

        {!joined && (
          <div className='h-full flex items-center justify-center px-4 py-10'>
            <div className='w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
              <div className='relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl'>
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  playsInline
                  className='w-full h-[300px] sm:h-[400px] object-cover'
                />

                {!isCameraOn && (
                  <div className='absolute inset-0 bg-black flex items-center justify-center'>
                    <VideoOff size={40} className="text-zinc-500" />
                  </div>
                )}
              </div>

              <div className='space-y-8 text-center lg:text-left'>
                <div>
                  <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-3 border border-emerald-500/20">
                    Live WebRTC Ready
                  </span>
                  <h1 className='text-3xl sm:text-4xl font-extrabold text-white tracking-tight'>
                    Secure Video KYC
                  </h1>
                  <p className='text-sm text-zinc-400 mt-2'>
                    {userData?.role === "admin"
                      ? "Conduct real-time identity & document verification with the driver partner."
                      : "Please ensure you are in a well-lit area and have your physical documents ready."}
                  </p>
                </div>

                <div className='flex justify-center lg:justify-start gap-4'>
                  <button
                    onClick={toggleCamera}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                      isCameraOn
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "bg-white/10 border border-white/20 text-white"
                    }`}
                  >
                    {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>

                  <button
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                      isMicOn
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "bg-white/10 border border-white/20 text-white"
                    }`}
                  >
                    {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                  </button>
                </div>

                <button
                  onClick={startCall}
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold text-base hover:bg-zinc-200 transition cursor-pointer shadow-xl"
                  disabled={loading}
                >
                  {loading ? "Connecting to Room..." : "Join Secure Video Call"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Approval Confirmation Modal */}
      <AnimatePresence>
        {showApprovalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="relative bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <button className='absolute top-5 right-5 text-gray-400 hover:text-white' onClick={() => setShowApprovalModel(false)}>
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle size={26} />
              </div>

              <div>
                <h2 className='text-lg font-bold text-white'>Approve Video KYC?</h2>
                <p className='text-xs text-zinc-400 mt-1'>
                  This will verify the partner's identity, securely terminate the video call for both participants, and advance the partner to vehicle pricing.
                </p>
              </div>

              <div className='flex gap-3 pt-2'>
                <button
                  onClick={() => setShowApprovalModel(false)}
                  className='flex-1 border border-white/10 hover:bg-white/5 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer'
                >
                  Cancel
                </button>
                <button
                  className='flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-bold transition cursor-pointer disabled:opacity-50'
                  disabled={aLoading}
                  onClick={handleApprove}
                >
                  {aLoading ? "Approving..." : "Approve & Finish"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Rejection Modal */}
      <AnimatePresence>
        {showRejectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="relative bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <button className='absolute top-5 right-5 text-gray-400 hover:text-white' onClick={() => setShowRejectionModel(false)}>
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <XCircle size={26} />
              </div>

              <div>
                <h2 className='text-lg font-bold text-white'>Reject Video KYC</h2>
                <p className='text-xs text-zinc-400 mt-1'>
                  State the reason for rejection so the partner can rectify their submission.
                </p>
              </div>

              <textarea
                placeholder='e.g., Physical document did not match uploaded copy'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className='w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition resize-none h-24'
              />

              <div className='flex gap-3 pt-2'>
                <button
                  onClick={() => setShowRejectionModel(false)}
                  className='flex-1 border border-white/10 hover:bg-white/5 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer'
                >
                  Cancel
                </button>
                <button
                  className='flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl py-2.5 text-sm font-bold transition cursor-pointer disabled:opacity-50'
                  disabled={rLoading || !reason.trim()}
                  onClick={handleReject}
                >
                  {rLoading ? "Rejecting..." : "Reject & Finish"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time End & Approval Feedback Overlay for Driver/Admin */}
      <AnimatePresence>
        {completionStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl"
            >
              {completionStatus.action === "approved" ? (
                <>
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                    <CheckCircle size={36} />
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">Video KYC Approved!</h2>
                  <p className="text-sm text-zinc-300">
                    Your identity has been verified by the administrator. Call ended securely.
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold animate-pulse">
                    Redirecting to Vehicle Pricing...
                  </p>
                </>
              ) : completionStatus.action === "rejected" ? (
                <>
                  <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30 shadow-lg shadow-rose-500/20">
                    <XCircle size={36} />
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">Video KYC Rejected</h2>
                  <p className="text-sm text-zinc-300">
                    {completionStatus.reason || "Requirements could not be verified."}
                  </p>
                  <p className="text-xs text-zinc-500">Redirecting to dashboard...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-3xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto border border-white/10">
                    <PhoneOff size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-white">Call Ended Securely</h2>
                  <p className="text-sm text-zinc-400">Media streams closed. Redirecting...</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default page
