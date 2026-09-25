import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
    }
});

export const sendMail = async (to: string, subject: string, html: string, text?: string) => {
    // Generate simple plain text version if not provided
    const plainText = text || html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const info = await transporter.sendMail({
        from: `"MY RIDE" <${process.env.EMAIL}>`,
        to,
        subject,
        text: plainText,
        html,
        replyTo: process.env.EMAIL
    });

    console.log(`[SMTP] Email delivered to [${to}], MessageId: ${info.messageId}`);
    return info;
};