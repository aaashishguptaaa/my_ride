import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import Booking from "@/models/booking.model";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req:NextRequest) {
    try {
        await connectDb()
        const {bookingId}=await req.json()
        const booking=await Booking.findById(bookingId).populate("user")
        if(!booking){
            return NextResponse.json(
                {message:"booking not found"},
                {status:400}
            )
        }

        const otp=Math.floor(1000+Math.random()*9000).toString()
        booking.dropOtp = otp
        booking.dropOtpExpires = new Date(Date.now() + 5 * 60 * 1000)
        await booking.save()

        // Send email in background asynchronously so UI is not blocked
        if (booking.user?.email) {
            sendMail(
                booking.user.email,
                "Your Drop OTP - MY_RIDE",
                `
        <div style="font-family:sans-serif;padding:20px">
          <h2>Ride OTP</h2>
          <p>Your drop OTP is:</p>
          <h1 style="letter-spacing:6px">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
          <p>Share this OTP with your driver to complete the ride.</p>
          <br/>
          <b>MY_RIDE</b>
        </div>
        `
            ).catch(err => console.error("Drop OTP email background error:", err))
        }

        // Notify passenger via socket in background
        if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
            axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "otp-generated",
                roomId: bookingId,
                userId: booking.user?._id || booking.user,
                data: { type: "drop", otp }
            }).catch(socketErr => console.error("Socket emit drop otp error:", socketErr))
        }

        return NextResponse.json(
            { message: "drop otp sent", otp },
            { status: 200 }
        )
    } catch (error) {
         return NextResponse.json(
            {message:"drop otp error"},
            {status:500}
        )
    }
}