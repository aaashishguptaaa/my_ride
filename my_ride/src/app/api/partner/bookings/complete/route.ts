import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const { bookingId, paymentConfirmed } = await req.json();

        if (!bookingId) {
            return NextResponse.json(
                { message: "Booking ID is required" },
                { status: 400 }
            );
        }

        const booking = await Booking.findById(bookingId).populate("user driver");
        if (!booking) {
            return NextResponse.json(
                { message: "Booking not found" },
                { status: 404 }
            );
        }

        if (booking.bookingStatus === "completed") {
            return NextResponse.json(
                { message: "Ride is already completed", booking },
                { status: 200 }
            );
        }

        // STRICT PAYMENT CHECK:
        // If not already paid online, rider MUST explicitly confirm cash/QR collection
        const isAlreadyPaid = booking.paymentStatus === "paid";

        if (!isAlreadyPaid && !paymentConfirmed) {
            return NextResponse.json(
                { 
                    message: "Payment confirmation required. Please confirm you received payment before ending the ride.",
                    paymentPending: true
                },
                { status: 400 }
            );
        }

        // Calculate commissions & earnings
        const adminCommission = booking.fare * 0.10;
        const partnerAmount = booking.fare - adminCommission;
        booking.adminCommission = adminCommission;
        booking.partnerAmount = partnerAmount;
        booking.paymentStatus = "paid";
        booking.bookingStatus = "completed";
        booking.dropOtp = "";
        booking.dropOtpExpires = undefined;
        await booking.save();

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
        if (socketUrl) {
            Promise.allSettled([
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-status-update",
                    roomId: String(bookingId),
                    userId: String(booking.user?._id || booking.user),
                    data: { status: "completed", paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-status-update",
                    roomId: String(bookingId),
                    userId: String(booking.driver?._id || booking.driver),
                    data: { status: "completed", paymentStatus: "paid", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-payment-updated",
                    roomId: String(bookingId),
                    userId: String(booking.user?._id || booking.user),
                    data: { bookingId, paymentStatus: "paid" }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-payment-updated",
                    roomId: String(bookingId),
                    userId: String(booking.driver?._id || booking.driver),
                    data: { bookingId, paymentStatus: "paid" }
                })
            ]).catch(err => console.error("Socket emit complete ride error:", err));
        }

        return NextResponse.json({
            success: true,
            message: "Ride completed successfully and payment settled",
            booking
        }, { status: 200 });

    } catch (error: any) {
        console.error("Complete ride error:", error);
        return NextResponse.json(
            { message: `Failed to complete ride: ${error.message || error}` },
            { status: 500 }
        );
    }
}
