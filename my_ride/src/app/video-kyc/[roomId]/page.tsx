'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import Image from 'next/image';
import {
  CheckCircle,
  Copy,
  Check,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  Video,
  VideoOff,
  X,
  XCircle,
  Clock,
  User as UserIcon,
  Radio
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import { getSocket } from '@/lib/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

function VideoKycPage() {
  const { userData } = useSelector((state: RootState) => state.user)
  const { roomId } = useParams()
  const router = useRouter()

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  // Stream & PeerConnection refs
  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([])

  // States
  const [joined, setJoined] = useState(false)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [remoteCameraOn, setRemoteCameraOn] = useState(true)
  const [remoteMicOn, setRemoteMicOn] = useState(true)
  const [copied, setCopied] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  // Admin modals & action loading
  const [reason, setReason] = useState("")
  const [aLoading, setALoading] = useState(false)
  const [rLoading, setRLoading] = useState(false)
  const [showApprovalModal, setShowApprovalModel] = useState(false)
  const [showRejectionModal, setShowRejectionModel] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<{
    action: "approved" | "rejected" | "ended";
    reason?: string;
  } | null>(null)

  // Timer for active call
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (joined && remoteConnected) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [joined, remoteConnected])

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Cleanup all media streams & peer connection
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
          track.enabled = false
        })
      } catch (e) {
        console.error("Error stopping tracks", e)
      }
      streamRef.current = null
    }

    if (previewRef.current && previewRef.current.srcObject) {
      try {
        const s = previewRef.current.srcObject as MediaStream
        s.getTracks().forEach((t) => t.stop())
      } catch (e) {}
      previewRef.current.srcObject = null
    }

    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = null
    }

    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.srcObject = null
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.onicecandidate = null
        peerConnectionRef.current.ontrack = null
        peerConnectionRef.current.close()
      } catch (e) {}
      peerConnectionRef.current = null
    }

    iceCandidatesQueue.current = []
    setRemoteConnected(false)
  }, [])

  // Initial local camera preview
  useEffect(() => {
    if (joined) return
    let active = true

    const initPreview = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = mediaStream
        if (previewRef.current) {
          previewRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.warn("Unable to access camera/mic preview:", err)
      }
    }

    initPreview()

    return () => {
      active = false
      if (!joined) {
        stopMediaTracks()
      }
    }
  }, [joined, stopMediaTracks])

  // Setup WebRTC PeerConnection helper
  const createPeerConnection = useCallback((socket: any, currentRoomId: string) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    // Add local tracks to peer connection
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!)
      })
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          roomId: currentRoomId,
          candidate: event.candidate,
        })
      }
    }

    // Remote stream receiver
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0]
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
      setRemoteConnected(true)
    }

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        setRemoteConnected(false)
      }
    }

    return pc
  }, [])

  // Socket listener for WebRTC signaling and room events
  useEffect(() => {
    if (!roomId) return
    const currentRoomId = roomId.toString()
    const socket = getSocket()

    // 1. Peer joined -> We (caller) initiate the offer
    const handlePeerJoined = async () => {
      if (!joined) return
      try {
        const pc = createPeerConnection(socket, currentRoomId)
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await pc.setLocalDescription(offer)
        socket.emit("webrtc-offer", { roomId: currentRoomId, offer })
      } catch (err) {
        console.error("Error creating WebRTC offer:", err)
      }
    }

    // 2. Received offer -> We (callee) set remote desc, create and send answer
    const handleWebrtcOffer = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      if (!joined) return
      try {
        const pc = createPeerConnection(socket, currentRoomId)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))

        // Drain any queued ICE candidates
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift()
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit("webrtc-answer", { roomId: currentRoomId, answer })
      } catch (err) {
        console.error("Error responding to WebRTC offer:", err)
      }
    }

    // 3. Received answer -> Set remote description
    const handleWebrtcAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnectionRef.current
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift()
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            }
          }
        }
      } catch (err) {
        console.error("Error setting remote answer:", err)
      }
    }

    // 4. Received ICE candidate
    const handleWebrtcIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionRef.current
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } else {
          iceCandidatesQueue.current.push(candidate)
        }
      } catch (err) {
        console.error("Error adding received ICE candidate:", err)
      }
    }

    // 5. Remote peer toggled audio/video
    const handleRemoteMediaToggle = ({ type, enabled }: { type: 'video' | 'audio'; enabled: boolean }) => {
      if (type === 'video') setRemoteCameraOn(enabled)
      if (type === 'audio') setRemoteMicOn(enabled)
    }

    // 6. KYC Ended
    const handleKycEnded = (data: { action: "approved" | "rejected" | "ended"; reason?: string }) => {
      stopMediaTracks()
      setJoined(false)
      setCompletionStatus(data)
      setTimeout(() => {
        router.push("/")
      }, 2500)
    }

    socket.on("peer-joined", handlePeerJoined)
    socket.on("webrtc-offer", handleWebrtcOffer)
    socket.on("webrtc-answer", handleWebrtcAnswer)
    socket.on("webrtc-ice-candidate", handleWebrtcIceCandidate)
    socket.on("webrtc-media-toggle", handleRemoteMediaToggle)
    socket.on("kyc-ended", handleKycEnded)

    const handleBeforeUnload = () => {
      stopMediaTracks()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      socket.off("peer-joined", handlePeerJoined)
      socket.off("webrtc-offer", handleWebrtcOffer)
      socket.off("webrtc-answer", handleWebrtcAnswer)
      socket.off("webrtc-ice-candidate", handleWebrtcIceCandidate)
      socket.off("webrtc-media-toggle", handleRemoteMediaToggle)
      socket.off("kyc-ended", handleKycEnded)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [roomId, joined, createPeerConnection, stopMediaTracks, router])

  // Join Room & Start WebRTC
  const handleJoinCall = async () => {
    try {
      let activeStream = streamRef.current
      if (!activeStream || !activeStream.active) {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        streamRef.current = activeStream
      }

      setJoined(true)

      // Connect stream to in-call local video element
      setTimeout(() => {
        if (localVideoRef.current && activeStream) {
          localVideoRef.current.srcObject = activeStream
        }
      }, 100)

      // Join room on socket server
      const socket = getSocket()
      socket.emit("join-kyc", roomId?.toString())
    } catch (err) {
      console.error("Error accessing hardware for call:", err)
      alert("Unable to access camera or microphone. Please ensure permissions are granted.")
    }
  }

  // Toggle Camera
  const toggleCamera = () => {
    if (!streamRef.current) return
    const videoTrack = streamRef.current.getVideoTracks()[0]
    if (videoTrack) {
      const nextState = !isCameraOn
      videoTrack.enabled = nextState
      setIsCameraOn(nextState)
      if (joined && roomId) {
        getSocket().emit("webrtc-media-toggle", {
          roomId: roomId.toString(),
          type: "video",
          enabled: nextState,
        })
      }
    }
  }

  // Toggle Microphone
  const toggleMic = () => {
    if (!streamRef.current) return
    const audioTrack = streamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      const nextState = !isMicOn
      audioTrack.enabled = nextState
      setIsMicOn(nextState)
      if (joined && roomId) {
        getSocket().emit("webrtc-media-toggle", {
          roomId: roomId.toString(),
          type: "audio",
          enabled: nextState,
        })
      }
    }
  }

  // Admin Approve Action
  const handleApprove = async () => {
    setALoading(true)
    try {
      stopMediaTracks()
      const socket = getSocket()
      socket.emit("end-kyc", {
        roomId: roomId?.toString(),
        action: "approved",
      })
      await axios.post("/api/admin/video-kyc/complete", { roomId, action: "approved" })
      setALoading(false)
      router.push("/")
    } catch (error: any) {
      console.error(error.response?.data?.message ?? error)
      setALoading(false)
    }
  }

  // Admin Reject Action
  const handleReject = async () => {
    setRLoading(true)
    try {
      stopMediaTracks()
      const socket = getSocket()
      socket.emit("end-kyc", {
        roomId: roomId?.toString(),
        action: "rejected",
        reason,
      })
      await axios.post("/api/admin/video-kyc/complete", { roomId, action: "rejected", reason })
      setRLoading(false)
      router.push("/")
    } catch (error: any) {
      console.error(error.response?.data?.message ?? error)
      setRLoading(false)
    }
  }

  // End Call Action
  const handleEndCall = () => {
    stopMediaTracks()
    const socket = getSocket()
    socket.emit("end-kyc", {
      roomId: roomId?.toString(),
      action: "ended",
    })
    router.push("/")
  }

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='min-h-screen bg-zinc-950 text-white flex flex-col select-none overflow-hidden'>
      {/* Top Navigation Bar */}
      <header className='px-6 py-3.5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 z-30 bg-black/60 backdrop-blur-xl'>
        <div className='flex items-center gap-4'>
          <Image src={"/logo.png"} alt='MY RIDE' width={38} height={38} priority className='rounded-lg' />
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-sm font-bold tracking-tight text-white'>
                {userData?.role === "admin" ? "Admin KYC Verification Portal" : "Partner Identity Verification"}
              </h1>
              <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20'>
                <ShieldCheck size={11} /> Native WebRTC P2P
              </span>
            </div>
            <p className='text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5'>
              Room: <span className='font-mono text-zinc-300'>{roomId}</span>
              <button
                onClick={copyRoomLink}
                className='text-zinc-500 hover:text-white transition cursor-pointer p-0.5'
                title='Copy Room Link'
              >
                {copied ? <Check size={12} className='text-emerald-400' /> : <Copy size={12} />}
              </button>
            </p>
          </div>
        </div>

        {joined && (
          <div className='flex items-center gap-3 w-full sm:w-auto justify-end'>
            {/* Call Duration Badge */}
            {remoteConnected && (
              <div className='hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-zinc-300'>
                <Clock size={13} className='text-emerald-400' />
                <span className='font-mono font-medium'>{formatDuration(callDuration)}</span>
              </div>
            )}

            {/* Admin Verification Actions */}
            {userData?.role === "admin" && (
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setShowApprovalModel(true)}
                  className='bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95'
                >
                  <CheckCircle size={14} /> Approve Partner
                </button>
                <button
                  onClick={() => setShowRejectionModel(true)}
                  className='bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95'
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            )}

            <button
              onClick={handleEndCall}
              className='bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95'
            >
              <PhoneOff size={14} /> End Call
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className='flex-1 relative overflow-hidden flex flex-col'>
        {!joined ? (
          /* Pre-Join Screen with Camera & Mic Check */
          <div className='flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-zinc-950 via-black to-zinc-950'>
            <div className='w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center'>
              {/* Preview Window */}
              <div className='relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl flex items-center justify-center group'>
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover scale-x-[-1] ${isCameraOn ? "block" : "hidden"}`}
                />
                {!isCameraOn && (
                  <div className='flex flex-col items-center justify-center gap-2 text-zinc-500'>
                    <div className='w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center'>
                      <VideoOff size={28} />
                    </div>
                    <span className='text-xs font-medium'>Camera is disabled</span>
                  </div>
                )}

                {/* Pre-join Media Controls Overlay */}
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10'>
                  <button
                    onClick={toggleMic}
                    className={`p-2.5 rounded-full transition cursor-pointer ${
                      isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    }`}
                    title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button
                    onClick={toggleCamera}
                    className={`p-2.5 rounded-full transition cursor-pointer ${
                      isCameraOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    }`}
                    title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Pre-join Info & Connect */}
              <div className='space-y-6 text-center md:text-left'>
                <div>
                  <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-3'>
                    <Radio size={12} className='animate-pulse' /> Ready to Connect
                  </span>
                  <h2 className='text-3xl font-extrabold tracking-tight text-white'>
                    {userData?.role === "admin" ? "Driver KYC Verification" : "Live Video KYC"}
                  </h2>
                  <p className='text-sm text-zinc-400 mt-2 leading-relaxed'>
                    {userData?.role === "admin"
                      ? "Verify the driver partner's physical documents and identity in real time."
                      : "Please ensure your camera is well-lit, you have clear audio, and your official documents are accessible."}
                  </p>
                </div>

                <div className='space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs text-zinc-400'>
                  <div className='flex items-center gap-2 text-zinc-300'>
                    <ShieldCheck size={16} className='text-emerald-400' />
                    <span>Peer-to-Peer 256-bit encrypted video stream</span>
                  </div>
                  <div className='flex items-center gap-2 text-zinc-300'>
                    <CheckCircle size={16} className='text-emerald-400' />
                    <span>Direct browser connection with zero third-party storage</span>
                  </div>
                </div>

                <button
                  onClick={handleJoinCall}
                  className='w-full bg-white hover:bg-zinc-200 text-black py-3.5 rounded-2xl font-bold text-sm transition cursor-pointer shadow-xl active:scale-[0.99] flex items-center justify-center gap-2'
                >
                  <Video size={18} /> Join Secure Video KYC
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Call Interface */
          <div className='flex-1 relative bg-black flex items-center justify-center overflow-hidden'>
            {/* Main Stage: Remote Participant Video */}
            <div className='w-full h-full relative flex items-center justify-center'>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  remoteConnected && remoteCameraOn ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Waiting for Participant Overlay */}
              {!remoteConnected && (
                <div className='absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-gradient-to-b from-zinc-950/70 to-black/90 backdrop-blur-sm'>
                  <div className='relative'>
                    <div className='w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400'>
                      <Radio size={36} className='animate-pulse' />
                    </div>
                    <div className='absolute inset-0 rounded-full border border-emerald-500/20 animate-ping' />
                  </div>
                  <div>
                    <h3 className='text-xl font-bold text-white'>
                      Waiting for {userData?.role === "admin" ? "Driver Partner" : "Verification Officer"} to join...
                    </h3>
                    <p className='text-xs text-zinc-400 max-w-sm mx-auto mt-1'>
                      The video stream will establish automatically as soon as the other participant opens this session.
                    </p>
                  </div>
                  <div className='flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-zinc-300'>
                    <span>Room: {roomId}</span>
                    <button onClick={copyRoomLink} className='text-emerald-400 hover:text-emerald-300 transition cursor-pointer'>
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              )}

              {/* Remote Camera Off Placeholder */}
              {remoteConnected && !remoteCameraOn && (
                <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900'>
                  <div className='w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-zinc-400'>
                    <UserIcon size={36} />
                  </div>
                  <p className='text-sm text-zinc-400'>Participant camera is currently off</p>
                </div>
              )}

              {/* Remote Peer Indicator Badge */}
              {remoteConnected && (
                <div className='absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 text-zinc-200 z-10'>
                  <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
                  <span className='font-medium'>
                    {userData?.role === "admin" ? "Driver Partner" : "Verification Officer (Admin)"}
                  </span>
                  {!remoteMicOn && <MicOff size={13} className='text-rose-400' />}
                </div>
              )}
            </div>

            {/* Local Video Picture-in-Picture (PiP) */}
            <motion.div
              drag
              dragConstraints={{ left: -300, right: 0, top: -400, bottom: 0 }}
              className='absolute bottom-24 sm:bottom-6 right-6 w-40 sm:w-60 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 bg-zinc-900 shadow-2xl z-20 cursor-grab active:cursor-grabbing group'
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover scale-x-[-1] ${isCameraOn ? "block" : "hidden"}`}
              />
              {!isCameraOn && (
                <div className='w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-1.5 text-zinc-500'>
                  <VideoOff size={22} />
                  <span className='text-[10px] font-medium'>Camera Off</span>
                </div>
              )}
              <div className='absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-medium text-white/90 flex items-center gap-1'>
                <span>You</span>
                {!isMicOn && <MicOff size={10} className='text-rose-400' />}
              </div>
            </motion.div>

            {/* Bottom Floating Control Dock */}
            <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/90 backdrop-blur-xl px-5 py-3 rounded-full border border-white/10 shadow-2xl z-20'>
              <button
                onClick={toggleMic}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 ${
                  isMicOn
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                }`}
                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              <button
                onClick={toggleCamera}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 ${
                  isCameraOn
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                }`}
                title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>

              <div className='w-px h-6 bg-white/10' />

              <button
                onClick={handleEndCall}
                className='w-11 h-11 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95'
                title='End Call'
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        )}
      </main>

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
              <button
                className='absolute top-5 right-5 text-gray-400 hover:text-white transition'
                onClick={() => setShowApprovalModel(false)}
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle size={26} />
              </div>

              <div>
                <h2 className='text-lg font-bold text-white'>Approve Video KYC?</h2>
                <p className='text-xs text-zinc-400 mt-1 leading-relaxed'>
                  This will verify the partner&apos;s identity, terminate the video call session for both parties, and approve their partner onboarding.
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
              <button
                className='absolute top-5 right-5 text-gray-400 hover:text-white transition'
                onClick={() => setShowRejectionModel(false)}
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <XCircle size={26} />
              </div>

              <div>
                <h2 className='text-lg font-bold text-white'>Reject Video KYC</h2>
                <p className='text-xs text-zinc-400 mt-1 leading-relaxed'>
                  State the reason for rejection so the partner can rectify their submission.
                </p>
              </div>

              <textarea
                placeholder='e.g., Physical document does not match uploaded copy'
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

      {/* Completion & Feedback Overlay */}
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

export default VideoKycPage
