import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const partner = await User.findOne({ email: session.user.email }).select("_id isOnline role partnerStatus");
        if (!partner) {
            return NextResponse.json(
                { message: "Partner not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            isOnline: Boolean(partner.isOnline),
            partnerStatus: partner.partnerStatus
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/partner/status error:", error);
        return NextResponse.json(
            { message: error?.message || "Failed to get partner status" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { isOnline } = body;

        const partner = await User.findOne({ email: session.user.email });
        if (!partner) {
            return NextResponse.json(
                { message: "Partner not found" },
                { status: 404 }
            );
        }

        partner.isOnline = Boolean(isOnline);
        await partner.save();

        // Emit socket update if needed so other connected services know
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
        if (socketUrl) {
            axios.post(`${socketUrl}/emit`, {
                event: "driver-online-status",
                userId: String(partner._id),
                data: { driverId: partner._id, isOnline: partner.isOnline }
            }).catch(e => console.error("Socket emit online status error:", e.message));
        }

        return NextResponse.json({
            success: true,
            isOnline: partner.isOnline,
            message: partner.isOnline ? "You are now ONLINE and visible to passengers." : "You are now OFFLINE."
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/partner/status error:", error);
        return NextResponse.json(
            { message: error?.message || "Failed to update partner status" },
            { status: 500 }
        );
    }
}
