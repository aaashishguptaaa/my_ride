import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || !email.trim() || !email.includes("@")) {
            return NextResponse.json(
                { message: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        await connectDb();
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return NextResponse.json(
                { message: "No account found with this email address." },
                { status: 404 }
            );
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpiresAt = otpExpiresAt;
        await user.save();

        console.log(`\n========================================`);
        console.log(`🔑 PASSWORD RESET OTP FOR [${normalizedEmail}]: ${otp}`);
        console.log(`========================================\n`);

        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px; }
            .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { text-align: center; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: bold; color: #111827; letter-spacing: -0.5px; }
            .otp-box { background: #fef2f2; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; border: 1px dashed #f87171; }
            .otp-code { font-size: 36px; font-family: monospace; font-weight: 800; letter-spacing: 8px; color: #b91c1c; margin: 0; }
            .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">MY RIDE</div>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Smart Vehicle Booking & Mobility</p>
            </div>
            <h2 style="color: #111827; font-size: 20px; margin-bottom: 8px;">Reset Your Password</h2>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
              Hi <strong>${user.name || "User"}</strong>, we received a request to reset your MY RIDE account password. Use the verification code below:
            </p>
            <div class="otp-box">
              <p class="otp-code">${otp}</p>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
              ⏱️ This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email or contact support.
            </p>
            <div class="footer">
              &copy; ${new Date().getFullYear()} MY RIDE. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        `;

        try {
            await sendMail(
                normalizedEmail,
                `${otp} is your MY RIDE password reset code`,
                emailHtml,
                `Your MY RIDE password reset code is: ${otp}. It is valid for 10 minutes.`
            );
        } catch (mailErr) {
            console.error("Nodemailer send error:", mailErr);
        }

        return NextResponse.json({
            success: true,
            message: "Password reset OTP sent to your email.",
            email: normalizedEmail
        }, { status: 200 });

    } catch (error) {
        console.error("Forgot password send-otp error:", error);
        return NextResponse.json(
            { message: `Failed to send password reset code: ${error}` },
            { status: 500 }
        );
    }
}
