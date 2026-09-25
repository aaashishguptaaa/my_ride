<div align="center">

# 🚗 MY_RIDE
### The Modern, Real-Time Vehicle & Ride-Sharing Platform

[![Live Website](https://img.shields.io/badge/Live%20Website-myride--ten.vercel.app-10b981?style=for-the-badge&logo=vercel&logoColor=white)](https://myride-ten.vercel.app)
[![Socket Server](https://img.shields.io/badge/Socket%20Server-Online%20(Render)-3b82f6?style=for-the-badge&logo=render&logoColor=white)](https://myride-socket.onrender.com)
[![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

<p align="center">
  <b>A production-ready full-stack ride booking platform engineered with Next.js 16, React 19, WebSockets, MongoDB, and live Video KYC.</b>
  <br />
  <a href="https://myride-ten.vercel.app"><strong>Explore Live Demo »</strong></a>
</p>

</div>

---

## 📌 Executive Summary

**MY_RIDE** is an end-to-end multi-vendor vehicle booking and driver dispatch system designed to solve common real-world challenges in ride-sharing:
- **Instant Concurrency Handling:** Multiple drivers can receive requests simultaneously without double-booking race conditions.
- **Dynamic Driver Availability:** Drivers control when their vehicles are visible to passengers via an instant Online/Offline status switch.
- **Two-Sided Safety:** Verification with Pickup OTP and Drop-off confirmation ensures safe passenger pickups and verified ride completion.
- **Flexible Payments:** Passengers can choose to pay upfront or pay comfortably after reaching their destination.
- **Rigorous Partner Onboarding:** Comprehensive driver validation with document uploads, pricing review, and live **ZEGOCLOUD Video KYC**.

---

## 🚀 Live Demo & Infrastructure

| Service | Platform | Status | URL |
| :--- | :--- | :--- | :--- |
| **Frontend & API Routes** | **Vercel** | 🟢 Live | [https://myride-ten.vercel.app](https://myride-ten.vercel.app) |
| **Realtime WebSocket Server** | **Render** | 🟢 Live | [https://myride-socket.onrender.com](https://myride-socket.onrender.com) |
| **Database** | **MongoDB Atlas** | 🟢 Live | *Cloud M0 Cluster* |

---

## 🔄 Complete Ride Lifecycle Workflow

```
PASSENGER                      SYSTEM / CLOUD                      DRIVER / RIDER
   │                                 │                                   │
   ├────── Search Nearby Rides ─────►│ (Filters Drivers: isOnline=true)  │
   │                                 ├────── Push Request via Socket ───►│
   │                                 │                                   ├─ Accept Ride
   │                                 │◄── Atomic findOneAndUpdate() ─────┤
   │                                 │    (First driver wins; others     │
   │                                 │     notified in real-time)        │
   │◄───── Ride Confirmed & Fare ────┤                                   │
   │                                 │                                   ├─ Arrives at Pickup
   │◄───── Pickup OTP Sent ──────────┤◄── Trigger Pickup OTP ────────────┤
   │       (Passenger shares OTP)    │                                   │
   │                                 ├────── Verify Pickup OTP ──────────┤
   │                                 │                                   │
   │◄════════════════════════ Live GPS Radar & Route Navigation ════════►│
   │                                 │                                   │
   │                                 │                                   ├─ Drop-off at Destination
   │◄───── Drop OTP / Payment ───────┤◄── Complete Ride Request ─────────┤
   │       (Advance or Drop-off)     │                                   │
   ├────── Razorpay / Cash ─────────►│◄── Confirm Payment Received ──────┤
   │                                 │                                   │
   ▼                                 ▼                                   ▼
[ Ride Completed ]            [ Commission Split ]                [ Earnings Added ]
```

---

## ✨ Standout Features & Engineering Highlights

### 1. 🏎️ Multi-Driver Real-Time Dispatch & Concurrency Protection
- **Sub-Second WebSocket Alerts:** When a passenger books a ride, all nearby online drivers instantly receive the request card via Socket.IO.
- **Zero Double-Bookings (Atomic Race Condition Prevention):**
  Uses MongoDB's atomic `findOneAndUpdate({ _id: id, bookingStatus: "requested" })`. If two drivers click **"Accept"** at the exact same millisecond, only the first driver succeeds. The second driver receives an HTTP 409 conflict and a user-friendly notice: *"Another driver has already accepted this request."*
- **Instant UI Removal:** Once accepted, the booking card automatically vanishes from all other drivers' screens in real time.

### 2. 🟢 Live Online / Offline Driver Availability
- Drivers have a 1-tap **Online / Offline** switch in the top navbar and dashboard.
- When **Offline**, the driver's vehicle is completely hidden from passenger search queries.
- When **Online**, their vehicle instantly becomes discoverable on the passenger map with real-time ETA estimates.

### 3. 🛡️ Two-Step OTP Verification & Flexible Payments
- **Pickup OTP:** The driver cannot start the trip until entering the passenger's secure pickup OTP.
- **Flexible Payment Timing:** Passengers are not forced to pay before the driver arrives. They can pay upfront or pay comfortably after reaching their destination.
- **Drop-off Confirmation:** The trip closes only when payment is verified, preventing unpaid ride completions.

### 4. 📹 8-Step Driver Onboarding & Live Video KYC
- Drivers complete an 8-step verification process:
  1. Vehicle Details (Model, Number, Category)
  2. Document Uploads (License, RC, Insurance via Cloudinary)
  3. Bank Account & Payout Info
  4. Document Review
  5. **Live Video KYC Call:** Face-to-face video verification with the admin powered by **ZEGOCLOUD**.
  6. Custom Fare & Pricing Setup
  7. Final Review
  8. **Live & Active:** Instant transition to active driver status.

### 5. 🔄 1-Click Role Switching
- Registered drivers can seamlessly switch between **Passenger Mode** (to book rides for themselves) and **Rider Mode** (to accept trips) with a single click.
- Verified drivers never have to re-verify or go through onboarding again when switching back.

### 6. 💬 In-Ride Live Chat with AI Suggestions
- Real-time chat between passenger and driver during the trip.
- Integrated with Google Gemini for intelligent quick-reply suggestions (e.g., *"I have arrived"*, *"Be there in 2 minutes"*).

### 7. 📊 Comprehensive Admin Cockpit
- Real-time dashboard with revenue metrics, admin commission earnings, and partner payouts.
- Video KYC queue with real-time video call initiation room.
- Document and vehicle approval/rejection panel with custom feedback reasons.

---

## 💻 Tech Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**, **Tailwind CSS v4**, **Framer Motion** |
| **State Management** | **Redux Toolkit** (`@reduxjs/toolkit`, `react-redux`) |
| **Realtime Engine** | **Socket.IO** (Client & Server), Express.js |
| **Database & ODM** | **MongoDB Atlas**, **Mongoose** (with indexed geospatial queries) |
| **Authentication** | **NextAuth.js v5** (JWT sessions, Email OTP via Nodemailer, Google OAuth) |
| **Video Calling** | **ZEGOCLOUD UIKit Prebuilt** (WebRTC Video KYC) |
| **Maps & Routing** | **Leaflet**, **React-Leaflet**, **Geoapify Geocoding API** |
| **Payment Gateway** | **Razorpay** (Orders API, Webhooks, Signature Verification) |
| **File Storage** | **Cloudinary** (Secure document & vehicle image hosting) |

---

## 📁 Repository Directory Structure

```
my_ride/
├── my_ride/                      # Next.js 16 Full-Stack Application
│   ├── public/                   # Static assets, branding logos
│   ├── src/
│   │   ├── app/                  # App Router (Pages & REST API Endpoints)
│   │   │   ├── admin/            # Admin review & KYC verification screens
│   │   │   ├── api/              # Secure Next.js backend API routes
│   │   │   │   ├── admin/        # Admin analytics, reviews, and KYC APIs
│   │   │   │   ├── auth/         # NextAuth, email verification & OTP handlers
│   │   │   │   ├── booking/      # Ride creation, cancellation, confirmation
│   │   │   │   ├── partner/      # Driver status, bookings, OTPs, earnings
│   │   │   │   ├── payment/      # Razorpay order generation & verification
│   │   │   │   ├── user/         # Role switching, profile, user bookings
│   │   │   │   └── vehicles/     # Geospatial vehicle lookup (online-only)
│   │   │   ├── partner/          # Driver onboarding, active cockpit, pending requests
│   │   │   ├── user/             # Passenger ride booking, radar search, checkout
│   │   │   └── video-kyc/        # ZEGOCLOUD Video KYC call room
│   │   ├── components/           # Reusable UI widgets, Nav, Maps, Modals
│   │   ├── hooks/                # Custom React hooks (useGetMe, etc.)
│   │   ├── lib/                  # Database connection, Cloudinary, Razorpay, Mailer
│   │   ├── models/               # Mongoose schemas (User, Vehicle, Booking, Docs, Bank)
│   │   └── redux/                # Global user and booking Redux store
│   └── package.json
│
├── socketServer/                 # Standalone Persistent WebSocket Server
│   ├── index.js                  # Express + Socket.IO server with /emit endpoints
│   ├── models/                   # Real-time driver location and socket state
│   └── package.json
│
├── .gitignore                    # Protects .env files and node_modules
└── README.md
```

---

## 🎯 Platform Roles & Core Capabilities

| Role | Key Capabilities & Experience |
| :--- | :--- |
| 🚖 **Passenger** | • Instant nearby vehicle lookup with interactive Leaflet map routing<br/>• Real-time driver radar and live vehicle tracking<br/>• Pickup OTP verification for passenger safety<br/>• In-ride live chat with AI smart suggestions<br/>• Flexible payment options: pay advance or comfortably upon destination drop-off |
| 🚗 **Driver / Partner** | • Instant 1-tap **Online / Offline** status switch (controls vehicle visibility on the map)<br/>• Real-time WebSocket dispatch alerts with sub-second delivery<br/>• Atomic concurrency acceptance (zero duplicate bookings)<br/>• Active ride cockpit with live radar and pickup verification<br/>• Earnings and trip history tracker<br/>• 1-click seamless switch to Passenger Mode (zero re-verification needed) |
| 🛡️ **Admin** | • Multi-vendor partner and document review dashboard<br/>• Real-time face-to-face **Video KYC** calling room via ZEGOCLOUD<br/>• Vehicle approval/rejection panel with custom feedback reasons<br/>• Financial oversight: platform commissions, partner earnings, and ride KPIs |

---

## 👤 Author & Acknowledgments

- **Developer:** [Aashish Gupta](https://github.com/aaashishguptaaa)
- **Repository:** [https://github.com/aaashishguptaaa/my_ride](https://github.com/aaashishguptaaa/my_ride)
- **Live Demo:** [https://myride-ten.vercel.app](https://myride-ten.vercel.app)

---

<div align="center">
  <sub>Built with ❤️ using Next.js 16, React 19, Socket.IO, and MongoDB Atlas.</sub>
</div>
