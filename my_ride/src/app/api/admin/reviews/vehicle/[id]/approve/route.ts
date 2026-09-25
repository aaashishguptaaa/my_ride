import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
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
        const vehicleId=(await context.params).id
        const vehicle=await Vehicle.findById(vehicleId)

        if(!vehicle){
            return Response.json(
                {message:"vehicle not found"},
                {status:400}
            )
        }

        vehicle.status="approved"
        vehicle.rejectionReason=undefined
        await vehicle.save()

        const partner=await User.findById(vehicle.owner)
        if(!partner){
             return Response.json(
                {message:"partner not found"},
                {status:400}
            )
        }
        partner.partnerOnBoardingSteps=7
        await partner.save()
         return Response.json(
                vehicle,
                {status:200}
            )
    } catch (error) {
         return Response.json(
                {message:`vehicle approve error ${error}`},
                {status:500}
            )
    }
    
}