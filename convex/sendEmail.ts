// convex/sendEmail.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { WaitlistConfirmationEmail } from "./emails/WaitlistConfirmationEmail";

export const sendWelcomeEmail = action({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }

    try {
      await resend.emails.send({
        from: "ReacherX <noreply@reacherx.com>",
        to: email,
        subject: "You're on the wait-list!",
        react: WaitlistConfirmationEmail(),
      });
      console.log(`Email sent successfully to ${email}`);
    } catch (error) {
      console.error("Failed to send email:", error);
      // Optionally, log to a Convex table or notify an admin
    }
  },
});
