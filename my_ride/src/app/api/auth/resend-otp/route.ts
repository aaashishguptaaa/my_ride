import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json(
                { message: "Email is required" },
                { status: 400 }
            );
        }

        await connectDb();
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return NextResponse.json(
                { message: "Account not found. Please sign up first." },
                { status: 404 }
            );
        }

        if (user.isEmailVerified) {
            return NextResponse.json(
                { message: "Email is already verified. Please login." },
                { status: 400 }
            );
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpiresAt = otpExpiresAt;
        await user.save();

        console.log(`\n========================================`);
        console.log(`🔄 RESENT EMAIL OTP FOR [${normalizedEmail}]: ${otp}`);
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
            .otp-box { background: #f3f4f6; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; border: 1px dashed #d1d5db; }
            .otp-code { font-size: 36px; font-family: monospace; font-weight: 800; letter-spacing: 8px; color: #111827; margin: 0; }
            .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">MY RIDE</div>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Smart Vehicle Booking & Mobility</p>
            </div>
            <h2 style="color: #111827; font-size: 20px; margin-bottom: 8px;">New Verification Code</h2>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
              Here is your new one-time verification code for MY RIDE:
            </p>
            <div class="otp-box">
              <p class="otp-code">${otp}</p>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
              ⏱️ This OTP is valid for <strong>10 minutes</strong>.
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
                `${otp} is your new MY RIDE verification code`,
                emailHtml,
                `Your new MY RIDE verification code is: ${otp}. It is valid for 10 minutes.`
            );
        } catch (mailErr) {
            console.error("Nodemailer resend error:", mailErr);
        }

        return NextResponse.json({
            success: true,
            message: "A new OTP has been sent to your email"
        }, { status: 200 });

    } catch (error) {
        console.error("Resend OTP error:", error);
        return NextResponse.json(
            { message: `Failed to resend OTP: ${error}` },
            { status: 500 }
        );
    }
}
