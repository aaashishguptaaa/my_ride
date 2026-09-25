import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
     req: NextRequest,
    context: { params: Promise<{ id: string }>}
) {
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
        const partnerId=(await context.params).id
        const partner=await User.findById(partnerId)

        if(!partner || partner.role!=="partner"){
            return Response.json(
                {message:"partner not found"},
                {status:400}
            )
        } 
        
       const roomId=`kyc-${partner._id}-${Date.now()}` 
       partner.videoKycRoomId=roomId
       partner.videoKycStatus="in_progress"
       partner.partnerOnBoardingSteps=4

       await partner.save()

       return NextResponse.json({roomId})
    } catch (error) {
         return NextResponse.json({message:"video kyc start error"},{status:500})
    }
}