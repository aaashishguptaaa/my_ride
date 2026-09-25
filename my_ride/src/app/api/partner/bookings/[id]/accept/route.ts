import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await context.params).id;
        await connectDb();

        const session = await auth();
        let currentDriver = null;
        if (session?.user?.email) {
            currentDriver = await User.findOne({ email: session.user.email });
        }

        // ATOMIC CAS (Compare-And-Swap) Update:
        // Only succeeds if bookingStatus is STILL strictly "requested"!
        // If another driver accepted 1ms earlier, bookingStatus is "confirmed", so matchedCount = 0 and returns null!
        const updateFields: any = {
            bookingStatus: "confirmed",
            paymentStatus: "pending"
        };

        if (currentDriver) {
            updateFields.driver = currentDriver._id;
            updateFields.driverMobileNumber = currentDriver.mobileNumber || "";
        }

        const booking = await Booking.findOneAndUpdate(
            {
                _id: id,
                bookingStatus: "requested"
            },
            {
                $set: updateFields
            },
            { new: true }
        ).populate("user vehicle driver");

        if (!booking) {
            // Already accepted by another rider or cancelled
            const existing = await Booking.findById(id).populate("driver");
            const takenByAnother = existing && existing.bookingStatus !== "requested";

            return NextResponse.json(
                {
                    success: false,
                    alreadyTaken: true,
                    message: takenByAnother
                        ? "Another rider has already accepted this ride request."
                        : "This ride request is no longer available."
                },
                { status: 409 }
            );
        }

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
        if (socketUrl) {
            Promise.allSettled([
                // 1. Notify all other riders to IMMEDIATELY remove this card from their screen!
                axios.post(`${socketUrl}/emit`, {
                    event: "booking-taken",
                    broadcast: true,
                    data: {
                        bookingId: String(booking._id),
                        driverId: String(booking.driver?._id || booking.driver),
                        driverName: currentDriver?.name || "Another Rider"
                    }
                }),
                // 2. Notify passenger that ride is confirmed
                axios.post(`${socketUrl}/emit`, {
                    event: "accept-booking",
                    userId: String(booking.user?._id || booking.user),
                    roomId: String(booking._id),
                    data: "confirmed"
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-confirmed",
                    userId: String(booking.user?._id || booking.user),
                    roomId: String(booking._id),
                    data: { bookingId: booking._id, status: "confirmed", booking }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "ride-status-update",
                    userId: String(booking.user?._id || booking.user),
                    roomId: String(booking._id),
                    data: { bookingId: booking._id, status: "confirmed", booking }
                }),
                // 3. Clear/decrement pending badge for this driver
                axios.post(`${socketUrl}/emit`, {
                    event: "pending-count-update",
                    userId: String(booking.driver?._id || booking.driver),
                    data: { count: 0, bookingId: booking._id, status: "confirmed" }
                }),
                axios.post(`${socketUrl}/emit`, {
                    event: "booking-accepted",
                    userId: String(booking.driver?._id || booking.driver),
                    data: { bookingId: booking._id, status: "confirmed", booking }
                })
            ]).catch((socketErr) => {
                console.error("Socket emit accept-booking error:", socketErr);
            });
        }

        return NextResponse.json(
            { success: true, booking },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Accept booking error:", error);
        return NextResponse.json(
            { message: `accept booking error ${error?.message || error}` },
            { status: 500 }
        );
    }
}