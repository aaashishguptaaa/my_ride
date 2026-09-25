import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest) {
    try {
         await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "unauthorized" }
                , { status: 400 }
            )
        }

        const partner = await User.findOne({ email: session.user.email })
        if (!partner) {
            return NextResponse.json({ message: "partner not found" }
                , { status: 400 }
            )
        } 

        const requestedBookings = await Booking.find({
            driver: partner._id,
            bookingStatus: "requested"
        }).sort({ createdAt: -1 }).populate("user vehicle").lean()

        const awaitingBookings = await Booking.find({
            driver: partner._id,
            bookingStatus: "awaiting_payment"
        }).sort({ createdAt: -1 }).populate("user vehicle").lean()

        return NextResponse.json({
            requested: requestedBookings,
            awaitingPayment: awaitingBookings,
            bookings: requestedBookings // fallback
        }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ message: `fetch pending req error ${error}` }
                , { status: 500 }
            )
    }
}