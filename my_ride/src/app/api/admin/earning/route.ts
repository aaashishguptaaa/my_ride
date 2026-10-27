import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDb();
         
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const bookings = await Booking.find({
            paymentStatus: "paid",
            createdAt: { $gte: sevenDaysAgo }
        }).select("adminCommission createdAt").lean();

        const earningMap: Record<string, number> = {};

        bookings.forEach(b => {
            const date = new Date(b.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short"
            });

            earningMap[date] = (earningMap[date] || 0) + (b.adminCommission || 0);
        });

        const earnings = Object.entries(earningMap).map(([date, earnings]) => ({
            date,
            earnings
        }));

        return NextResponse.json(earnings, { status: 200 });

    } catch (error) {
        return NextResponse.json(
            { message: "admin earning error" },
            { status: 500 }
        );
    }
}
