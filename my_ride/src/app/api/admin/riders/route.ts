import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("q") || "";

        const query: any = { role: "user" };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { mobileNumber: { $regex: search, $options: "i" } }
            ];
        }

        const riders = await User.find(query).sort({ createdAt: -1 }).lean();

        // Aggregate booking statistics for all riders
        const riderIds = riders.map(r => r._id);
        const bookingStats = await Booking.aggregate([
            { $match: { user: { $in: riderIds } } },
            {
                $group: {
                    _id: "$user",
                    totalBookings: { $sum: 1 },
                    completedRides: {
                        $sum: { $cond: [{ $eq: ["$bookingStatus", "completed"] }, 1, 0] }
                    },
                    cancelledRides: {
                        $sum: { $cond: [{ $eq: ["$bookingStatus", "cancelled"] }, 1, 0] }
                    },
                    totalSpent: {
                        $sum: {
                            $cond: [{ $eq: ["$bookingStatus", "completed"] }, "$fare", 0]
                        }
                    },
                    lastRide: { $max: "$createdAt" }
                }
            }
        ]);

        const statsMap = new Map(bookingStats.map(s => [String(s._id), s]));

        const formattedRiders = riders.map(rider => {
            const stats = statsMap.get(String(rider._id)) || {
                totalBookings: 0,
                completedRides: 0,
                cancelledRides: 0,
                totalSpent: 0,
                lastRide: null
            };

            return {
                _id: rider._id,
                name: rider.name,
                email: rider.email,
                mobileNumber: rider.mobileNumber || "N/A",
                createdAt: rider.createdAt,
                totalBookings: stats.totalBookings,
                completedRides: stats.completedRides,
                cancelledRides: stats.cancelledRides,
                totalSpent: stats.totalSpent,
                lastRide: stats.lastRide
            };
        });

        // Summary stats across all riders
        const totalRiders = riders.length;
        const totalCompletedRidesAll = bookingStats.reduce((acc, curr) => acc + (curr.completedRides || 0), 0);
        const totalRevenue = bookingStats.reduce((acc, curr) => acc + (curr.totalSpent || 0), 0);

        return NextResponse.json({
            riders: formattedRiders,
            summary: {
                totalRiders,
                totalCompletedRides: totalCompletedRidesAll,
                totalRevenue
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Admin riders API error:", error);
        return NextResponse.json({ message: `admin riders error ${error}` }, { status: 500 });
    }
}
