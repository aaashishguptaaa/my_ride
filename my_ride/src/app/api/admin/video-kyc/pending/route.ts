import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

export async function GET() {
    try {
        await connectDb()
         const session = await auth()
         if (!session || !session.user?.email) {
             return Response.json({ message: "unauthorized" }, { status: 401 })
         }

         let role = session.user.role
         if (role !== "admin") {
             const dbUser = await User.findOne({ email: session.user.email })
             if (dbUser) role = dbUser.role
         }

         if (role !== "admin") {
             return Response.json({ message: "unauthorized" }, { status: 403 })
         }

          const partner=await User.find({
            role:"partner",
            partnerOnBoardingSteps:4,
            videoKycStatus:{$in:["pending","in_progress"]}
          })
          return Response.json(
            partner,{status:200}
          )      
    } catch (error) {
         return Response.json(
           {message:`partner kyc get error ${error}`},{status:500}
          ) 
    }
}