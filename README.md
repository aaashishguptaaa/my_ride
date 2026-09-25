# 🚗 MY_RIDE - Smart Vehicle & Ride Booking Platform

MY_RIDE is a modern, full-stack vehicle and ride booking platform built with Next.js 16, React 19, Socket.IO, Tailwind CSS, and MongoDB.

---

## 🌟 Key Features
- **Seamless Ride Booking:** Instant nearby vehicle lookup with interactive Leaflet map routing.
- **Rider / Partner Ecosystem:** Multi-step driver onboarding with documents, pricing review, and ZEGOCLOUD Video KYC verification.
- **Live Online / Offline Mode:** Drivers can toggle active status with real-time vehicle visibility control.
- **Real-Time Dispatch & WebSockets:** Sub-second notifications when rides are requested, accepted, or completed.
- **Atomic Concurrency Protection:** High-speed MongoDB transactional locking to prevent duplicate acceptances across drivers.
- **Secure Authentication:** NextAuth v5 with email OTP verification and Google OAuth.
- **Integrated Payments:** Razorpay integration with flexible payment timing (advance or upon destination drop-off).
- **Responsive Design:** Optimized for both mobile devices and desktop screens.

---

## 🛠️ Project Structure
```
MY_ride/
├── my_ride/         # Next.js 16 Full-Stack Web Application (Frontend & API Routes)
├── socketServer/    # Node.js + Express + Socket.IO Persistent WebSocket Server
└── README.md
```

---

## 🚀 Getting Started

### 1. Web Application (`my_ride`)
```bash
cd my_ride
npm install
npm run dev
```

### 2. Socket Server (`socketServer`)
```bash
cd socketServer
npm install
npm start
```
