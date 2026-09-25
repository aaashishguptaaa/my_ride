import connectDb from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto"
import Booking from "@/models/booking.model";
import axios from "axios";
export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { bookingId, razorpay_payment_id, razorpay_signature, razorpay_order_id } = await req.json()
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ success: false, message: "invalid signature" })
        }
        const booking = await Booking.findById(bookingId)
        if (!booking) {
            return NextResponse.json(
                { success: false, message: "booking is not found." }
            )
        }
        const adminCommission=booking.fare*0.10
        const partnerAmount=booking.fare-adminCommission
        booking.adminCommission=adminCommission
        booking.partnerAmount=partnerAmount
        booking.paymentStatus = "paid";
        if (booking.bookingStatus === "awaiting_payment" || booking.bookingStatus === "requested" || booking.bookingStatus === "idle") {
            booking.bookingStatus = "confirmed";
        }
        await booking.save();

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
        if (socketUrl) {
            Promise.allSettled([
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-payment-updated",
                    roomId: String(booking._id),
                    userId: String(booking.driver),
                    data: { bookingId: booking._id, paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-payment-updated",
                    roomId: String(booking._id),
                    userId: String(booking.user),
                    data: { bookingId: booking._id, paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-confirmed",
                    roomId: String(booking._id),
                    userId: String(booking.driver),
                    data: { bookingId: booking._id, status: booking.bookingStatus, paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-confirmed",
                    roomId: String(booking._id),
                    userId: String(booking.user),
                    data: { bookingId: booking._id, status: booking.bookingStatus, paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-status-update",
                    roomId: String(booking._id),
                    userId: String(booking.driver),
                    data: { bookingId: booking._id, status: booking.bookingStatus, paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-status-update",
                    roomId: String(booking._id),
                    userId: String(booking.user),
                    data: { bookingId: booking._id, status: booking.bookingStatus, paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "pending-count-update",
                    userId: String(booking.driver),
                    data: { count: 0 }
                })
            ]).catch(err => console.error("Socket emit payment error:", err));
        }

         return NextResponse.json(
                { success: true, adminCommission,partnerAmount },
                { status: 200 }
            )



    } catch (error) {
 return NextResponse.json(
                { success: false, message:`verify payment error ${error}`},
                { status: 500 }
            )
    }
}