import connectDb from "@/lib/db";
import User from "@/models/user.model";

export async function POST(req: Request) {
    try {
        await connectDb();
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return Response.json(
                { message: "Email and OTP are both required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return Response.json(
                { message: "User account not found" },
                { status: 404 }
            );
        }

        if (user.isEmailVerified) {
            return Response.json(
                { message: "Email is already verified. Please login." },
                { status: 400 }
            );
        }

        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return Response.json(
                { message: "OTP has expired. Please click Resend Code." },
                { status: 400 }
            );
        }

        if (!user.otp || user.otp.trim() !== String(otp).trim()) {
            return Response.json(
                { message: "Invalid OTP code. Please check and try again." },
                { status: 400 }
            );
        }

        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        return Response.json(
            { success: true, message: "Email successfully verified!" },
            { status: 200 }
        );

    } catch (error) {
        return Response.json(
            { message: `Email verification failed: ${error}` },
            { status: 500 }
        );
    }
}