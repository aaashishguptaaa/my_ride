import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest) {
    try {
        await connectDb()
        const {latitude,longitude,vehicleType}=await req.json()
        if(!latitude||!longitude){
            return NextResponse.json(
                {message:"coordinates not found"},
                {status:400}
            )
        }

        // 1. Try finding nearby online partners within 15km
        let partners = await User.find({
            role: "partner",
            partnerStatus: "approved",
            isOnline: true,
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: 15000
                }
            }
        }).lean();

        let partnerIds = partners.map(p => p._id);

        // 2. If no partners within 15km, check active approved partners who are currently online
        if (partnerIds.length === 0) {
            const fallbackPartners = await User.find({
                role: "partner",
                partnerStatus: "approved",
                isOnline: true
            }).limit(10).lean();
            partnerIds = fallbackPartners.map(p => p._id);
        }

        // If no partners are online, return empty list (driver is offline, vehicle cannot be seen)
        if (partnerIds.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        const vehicles = await Vehicle.find({
            owner: { $in: partnerIds },
            type: vehicleType,
            status: "approved",
            isActive: true
        }).lean();

        return NextResponse.json(vehicles, { status: 200 });


    } catch (error) {
        return NextResponse.json(
                {message:`near by vehicles error ${error}`},
                {status:500}
            )
    }
}
