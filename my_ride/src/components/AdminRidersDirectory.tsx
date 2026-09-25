'use client'
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Users, 
  Search, 
  Car, 
  Calendar, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  IndianRupee, 
  Phone, 
  Mail, 
  X, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react'

interface RiderItem {
  _id: string
  name: string
  email: string
  mobileNumber: string
  createdAt: string
  totalBookings: number
  completedRides: number
  cancelledRides: number
  totalSpent: number
  lastRide: string | null
}

interface BookingRecord {
  _id: string
  pickUpAddress: string
  dropAddress: string
  fare: number
  bookingStatus: string
  paymentStatus: string
  createdAt: string
  driver?: {
    name: string
    email: string
    mobileNumber: string
  }
  vehicle?: {
    type: string
    model?: string
    vehicleModel?: string
    number?: string
    plateNumber?: string
    numberPlate?: string
  }
}

export default function AdminRidersDirectory() {
  const [riders, setRiders] = useState<RiderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState({ totalRiders: 0, totalCompletedRides: 0, totalRevenue: 0 })
  
  // Selected Rider Drawer
  const [selectedRider, setSelectedRider] = useState<RiderItem | null>(null)
  const [riderBookings, setRiderBookings] = useState<BookingRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchRiders = async (searchTerm = '') => {
    setLoading(true)
    try {
      const { data } = await axios.get(`/api/admin/riders${searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : ''}`)
      setRiders(data.riders || [])
      if (data.summary) {
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Failed to load riders', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRiders()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchRiders(search)
  }

  const handleOpenHistory = async (rider: RiderItem) => {
    setSelectedRider(rider)
    setLoadingHistory(true)
    try {
      const { data } = await axios.get(`/api/admin/riders/${rider._id}/history`)
      setRiderBookings(data.bookings || [])
    } catch (err) {
      console.error('Failed to load rider history', err)
      setRiderBookings([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 size={12} /> Completed</span>
      case 'started':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20"><Clock size={12} /> In Progress</span>
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"><Clock size={12} /> Driver Assigned</span>
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20"><XCircle size={12} /> Cancelled</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Aggregate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Registered Riders</p>
            <p className="text-2xl font-black text-zinc-900 mt-0.5">{summary.totalRiders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Car size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Rides Completed</p>
            <p className="text-2xl font-black text-zinc-900 mt-0.5">{summary.totalCompletedRides}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <IndianRupee size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Rider Spend</p>
            <p className="text-2xl font-black text-zinc-900 mt-0.5">₹{summary.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search riders by name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-24 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {search && (
          <button
            onClick={() => { setSearch(''); fetchRiders(''); }}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Riders Table / List */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Rider Accounts & Trip History</h2>
          <span className="text-xs text-zinc-500">{riders.length} riders found</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3" />
            Loading rider directories & metrics...
          </div>
        ) : riders.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            No riders match your search criteria.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {riders.map((rider) => (
              <div 
                key={rider._id}
                className="p-5 hover:bg-zinc-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-950 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                    {rider.name ? rider.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900 text-sm">{rider.name || 'Unnamed Rider'}</h3>
                      <span className="text-[11px] font-semibold text-zinc-400">
                        Joined {new Date(rider.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="text-zinc-400" />
                        {rider.email}
                      </span>
                      {rider.mobileNumber && rider.mobileNumber !== 'N/A' && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-zinc-400" />
                          {rider.mobileNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 self-end sm:self-center">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                      <Car size={13} className="text-emerald-600" />
                      <span>{rider.completedRides} Rides Done</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                      Spent ₹{rider.totalSpent.toLocaleString()} • {rider.totalBookings} total req
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenHistory(rider)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>View History</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ride History Modal / Drawer */}
      <AnimatePresence>
        {selectedRider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-zinc-200"
            >
              {/* Drawer Header */}
              <div className="p-6 bg-zinc-950 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white font-black text-lg border border-white/10">
                    {selectedRider.name ? selectedRider.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">{selectedRider.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-zinc-950">
                        Rider
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{selectedRider.email} • {selectedRider.mobileNumber}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRider(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Rider Snapshot Metrics */}
              <div className="grid grid-cols-3 bg-zinc-50 border-b border-zinc-200 p-4 text-center">
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Completed Rides</p>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{selectedRider.completedRides}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Bookings</p>
                  <p className="text-xl font-black text-zinc-900 mt-0.5">{selectedRider.totalBookings}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Lifetime Spend</p>
                  <p className="text-xl font-black text-zinc-900 mt-0.5">₹{selectedRider.totalSpent.toLocaleString()}</p>
                </div>
              </div>

              {/* Trips History Scroll Area */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                  Full Trip Log ({riderBookings.length} Trips Recorded)
                </h4>

                {loadingHistory ? (
                  <div className="p-12 text-center text-zinc-400 text-sm">
                    <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3" />
                    Fetching trip logs & driver details...
                  </div>
                ) : riderBookings.length === 0 ? (
                  <div className="p-10 text-center text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-2xl">
                    No rides booked by this user yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {riderBookings.map((trip) => (
                      <div 
                        key={trip._id}
                        className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-500">
                              {new Date(trip.createdAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="text-zinc-300">•</span>
                            <span className="text-xs font-mono font-medium text-zinc-400">
                              ID: {trip._id.slice(-6)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(trip.bookingStatus)}
                            <span className="text-sm font-black text-zinc-900">₹{trip.fare}</span>
                          </div>
                        </div>

                        {/* Route Locations */}
                        <div className="space-y-1.5 pl-1 text-xs">
                          <div className="flex items-start gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                            <div>
                              <span className="text-zinc-400 font-medium">Pickup: </span>
                              <span className="text-zinc-800 font-semibold">{trip.pickUpAddress || 'Not specified'}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0 mt-1" />
                            <div>
                              <span className="text-zinc-400 font-medium">Dropoff: </span>
                              <span className="text-zinc-800 font-semibold">{trip.dropAddress || 'Not specified'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Driver & Vehicle Details if available */}
                        {trip.driver && (
                          <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-600 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-900">Driver: {trip.driver.name}</span>
                              {trip.driver.mobileNumber && (
                                <span className="text-zinc-400">({trip.driver.mobileNumber})</span>
                              )}
                            </div>
                            {trip.vehicle && (
                              <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 text-zinc-700 text-[11px] font-semibold">
                                {trip.vehicle.type} {trip.vehicle.model ? `• ${trip.vehicle.model}` : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end">
                <button
                  onClick={() => setSelectedRider(null)}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
