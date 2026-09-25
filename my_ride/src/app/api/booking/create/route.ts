import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json(
                { message: "unauthorized" },
                { status: 401 }
            );
        }

        const {
            driverId,
            vehicleId,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare,
            mobileNumber,
        } = await req.json();

        if (!driverId || !vehicleId || !pickUpLocation?.coordinates || !dropLocation?.coordinates) {
            return NextResponse.json(
                { message: "missing required details" },
                { status: 400 }
            );
        }

        // Parallel DB lookups with lean queries for maximum speed
        const [user, driver] = await Promise.all([
            User.findOne({ email: session.user.email }).select("_id email mobileNumber").lean(),
            User.findById(driverId).select("_id mobileNumber").lean()
        ]);

        if (!user) {
            return NextResponse.json(
                { message: "user not found" },
                { status: 401 }
            );
        }

        if (!driver) {
            return NextResponse.json(
                { message: "driver not found" },
                { status: 400 }
            );
        }

        // Check for existing active booking
        const existing = await Booking.findOne({
            user: user._id,
            bookingStatus: {
                $in: ["requested", "awaiting_payment", "confirmed", "started"]
            }
        }).lean();

        if (existing) {
            return NextResponse.json(existing, { status: 200 });
        }

        const booking = await Booking.create({
            user: user._id,
            driver: driver._id,
            vehicle: vehicleId,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare,
            userMobileNumber: mobileNumber || user.mobileNumber || "",
            driverMobileNumber: driver.mobileNumber || "",
            bookingStatus: "requested"
        });

        // Fire-and-forget socket emission in background (never block client response)
        const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
        if (socketServerUrl) {
            axios.post(`${socketServerUrl}/emit`, {
                event: "new-booking",
                userId: String(driverId),
                data: booking
            }).catch(socketErr => {
                console.error("Non-blocking socket emit new-booking error:", socketErr.message);
            });
        }

        return NextResponse.json(booking, { status: 200 });

    } catch (error) {
        console.error("Booking create error:", error);
        return NextResponse.json(
            { message: `create booking error ${error}` },
            { status: 500 }
        );
    }
}