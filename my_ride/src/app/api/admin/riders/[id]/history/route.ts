import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDb();
        const session = await auth();
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 });
        }

        let role = session.user.role;
        if (role !== "admin") {
            const dbUser = await User.findOne({ email: session.user.email });
            if (dbUser) role = dbUser.role;
        }

        if (role !== "admin") {
            return NextResponse.json({ message: "unauthorized" }, { status: 403 });
        }

        const { id } = await context.params;
        const rider = await User.findById(id).select("-password").lean();
        if (!rider) {
            return NextResponse.json({ message: "Rider not found" }, { status: 404 });
        }

        // Fetch all bookings for this rider
        const bookings = await Booking.find({ user: id })
            .populate("driver", "name email mobileNumber")
            .populate("vehicle", "type model plateNumber numberPlate")
            .sort({ createdAt: -1 })
            .lean();

        // Calculate summary
        const completedRides = bookings.filter(b => b.bookingStatus === "completed").length;
        const cancelledRides = bookings.filter(b => b.bookingStatus === "cancelled").length;
        const totalSpent = bookings
            .filter(b => b.bookingStatus === "completed")
            .reduce((sum, b) => sum + (b.fare || 0), 0);

        return NextResponse.json({
            rider,
            stats: {
                totalBookings: bookings.length,
                completedRides,
                cancelledRides,
                totalSpent
            },
            bookings
        }, { status: 200 });

    } catch (error) {
        console.error("Admin rider history error:", error);
        return NextResponse.json({ message: `admin rider history error ${error}` }, { status: 500 });
    }
}
