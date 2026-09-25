# 🚗 MY_RIDE - Smart Vehicle & Ride Booking Platform

[![Live App](https://img.shields.io/badge/Live%20Website-myride--ten.vercel.app-brightgreen?style=for-the-badge&logo=vercel)](https://myride-ten.vercel.app)
[![Socket Server](https://img.shields.io/badge/Socket%20Server-Online%20(Render)-blue?style=for-the-badge&logo=render)](https://myride-socket.onrender.com)

> 🔗 **Live Website URL:** **[https://myride-ten.vercel.app](https://myride-ten.vercel.app)**  
> ⚡ **Live WebSocket Server:** **[https://myride-socket.onrender.com](https://myride-socket.onrender.com)**

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

## 🚀 Getting Started Locally

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
