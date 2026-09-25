import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await context.params).id
        await connectDb()
        const booking = await Booking.findById(id)

        if (!booking || booking.bookingStatus !== "requested") {
            return NextResponse.json(
                { message: "invalid" },
                { status: 400 }
            )
        }

        booking.bookingStatus = "rejected"
        await booking.save()

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
        if (socketUrl) {
            Promise.allSettled([
                axios.post(`${socketUrl}/emit`, {
                    event: "reject-booking",
                    userId: String(booking.user),
                    data: booking.bookingStatus
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "pending-count-update",
                    userId: String(booking.driver),
                    data: { count: 0, bookingId: booking._id, status: "rejected" }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "booking-rejected",
                    userId: String(booking.driver),
                    data: { bookingId: booking._id, status: "rejected" }
                })
            ]).catch((socketErr) => {
                console.error("Socket emit reject-booking error:", socketErr);
            });
        }

        return NextResponse.json(
            { success: "true" },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            { message: `reject booking error ${error}` },
            { status: 500 }
        )
    }
}