import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session || !session.user?.email) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }

        let role = session.user.role
        if (role !== "admin") {
            const dbUser = await User.findOne({ email: session.user.email })
            if (dbUser) role = dbUser.role
        }

        if (role !== "admin") {
            return NextResponse.json({ message: "unauthorized" }, { status: 403 })
        }
        const totalPartners = await User.countDocuments({ role: "partner" })
        const totalApprovedPartners = await User.countDocuments({ role: "partner", partnerStatus: "approved" })
        const totalPendingPartners = await User.countDocuments({ role: "partner", partnerStatus: "pending" })
        const totalRejectedPartners = await User.countDocuments({ role: "partner", partnerStatus: "rejected" })

        const pendingPartnerUsers = await User.find({
            role: "partner",
            partnerStatus: "pending",
            partnerOnBoardingSteps: {$gte:3}
        })
        console.log(pendingPartnerUsers)
        const partnerIds = pendingPartnerUsers.map((p) => p._id)
        const partnerVehicles = await Vehicle.find({
            owner: { $in: partnerIds }
        })
        const vehicleTypeMap = new Map(
            partnerVehicles.map((v) => [String(v.owner), v.type])
        )

        const pendingPartnersReviews = pendingPartnerUsers.map((p) => ({
            _id: p._id,
            name: p.name,
            email: p.email,
            vehicleType: vehicleTypeMap.get(String(p._id))
        }))


        const pendingVehicles=await Vehicle.find({
            status:"pending",
            baseFare:{$exists:true},
             pricePerKM:{$exists:true}
        }).populate("owner")



        return NextResponse.json({
            pendingVehicles,
            stats:{ 
                totalPartners,
            totalApprovedPartners,
            totalPendingPartners,
            totalRejectedPartners
        },
            pendingPartnersReviews
        }, {
            status: 200
        })

    } catch (error) {
        return NextResponse.json({
            message: `admin dashboard error ${error}`
        }, {
            status: 500
        })
    }
}