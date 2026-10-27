import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { email, otp, newPassword } = await req.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { message: "Email, OTP, and new password are required." },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { message: "New password must be at least 6 characters long." },
                { status: 400 }
            );
        }

        await connectDb();
        const normalizedEmail = email.toLowerCase().trim();

        // O(1) query with lean field projection (only fetch otp and expiry)
        const user = await User.findOne({ email: normalizedEmail })
            .select("_id otp otpExpiresAt")
            .lean();

        if (!user) {
            return NextResponse.json(
                { message: "No account found with this email." },
                { status: 404 }
            );
        }

        if (!user.otp || user.otp !== String(otp).trim()) {
            return NextResponse.json(
                { message: "Invalid verification code. Please check and try again." },
                { status: 400 }
            );
        }

        if (!user.otpExpiresAt || new Date(user.otpExpiresAt).getTime() < Date.now()) {
            return NextResponse.json(
                { message: "Verification code has expired. Please request a new OTP." },
                { status: 400 }
            );
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atomic update and field unsets (clears OTP from memory and disk)
        await User.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    isEmailVerified: true
                },
                $unset: {
                    otp: 1,
                    otpExpiresAt: 1
                }
            }
        );

        console.log(`[AUTH] Password successfully reset for user [${normalizedEmail}]`);

        return NextResponse.json({
            success: true,
            message: "Password reset successfully. You can now log in with your new password."
        });

    } catch (error: any) {
        console.error("Error in forgot-password/verify-reset:", error);
        return NextResponse.json(
            { message: error?.message || "Internal server error. Please try again." },
            { status: 500 }
        );
    }
}
