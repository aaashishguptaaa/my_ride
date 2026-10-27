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
        const user = await User.findOne({ email: normalizedEmail });

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
        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        user.isEmailVerified = true;
        await user.save();

        console.log(`[AUTH] Password successfully reset for user [${normalizedEmail}]`);

        return NextResponse.json({
            success: true,
            message: "Password reset successfully! You can now log in with your new password."
        }, { status: 200 });

    } catch (error) {
        console.error("Forgot password verify-reset error:", error);
        return NextResponse.json(
            { message: `Password reset failed: ${error}` },
            { status: 500 }
        );
    }
}
