import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Unauthorized: Please log in first" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { targetRole } = body;

        if (!targetRole || !["user", "partner"].includes(targetRole)) {
            return NextResponse.json(
                { message: "Invalid target role specified" },
                { status: 400 }
            );
        }

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        const vehicle = await Vehicle.findOne({ owner: user._id });
        const hasCompletedOnboarding = 
            user.partnerStatus === "approved" || 
            (typeof user.partnerOnBoardingSteps === "number" && user.partnerOnBoardingSteps >= 4) ||
            !!vehicle;

        // Switch to Passenger
        if (targetRole === "user") {
            user.role = "user";
            await user.save();

            return NextResponse.json({
                success: true,
                message: "Switched to Passenger mode",
                role: "user",
                user,
                hasRiderProfile: hasCompletedOnboarding,
                redirectUrl: "/"
            }, { status: 200 });
        }

        // Switch to Rider
        if (targetRole === "partner") {
            user.role = "partner";
            await user.save();

            return NextResponse.json({
                success: true,
                message: hasCompletedOnboarding
                    ? "Welcome back to Rider mode!"
                    : "Switched to Rider mode. Please complete vehicle onboarding.",
                role: "partner",
                user,
                hasRiderProfile: hasCompletedOnboarding,
                redirectUrl: hasCompletedOnboarding ? "/" : "/partner/onboarding/vehicle"
            }, { status: 200 });
        }

    } catch (error: any) {
        console.error("switch-role route error:", error);
        return NextResponse.json(
            { message: error?.message || "Failed to switch role" },
            { status: 500 }
        );
    }
}
