import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"

const PUBLIC_ROUTES = ["/"]


export async function proxy(req: NextRequest) {

    const { pathname } = req.nextUrl
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico")||
        /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname)
    ) {
        return NextResponse.next()
    }


    if (PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.next()
    }
    if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/vehicles/near-by")) {
        return NextResponse.next()
    }

    const session = await auth()

    if (pathname.startsWith("/api")) {
        if (!session || !session.user) {
            return NextResponse.json({
                message: "unauthorized"
            }, { status: 401 })
        }
        return NextResponse.next()
    }

    if (!session) {
        return NextResponse.redirect(new URL("/", req.url))
    }

    const role = session.user?.role

    if (pathname.startsWith("/admin")) {
        if (role != "admin") {
            return NextResponse.redirect(new URL("/", req.url))
        }
    }
    if (pathname.startsWith("/partner")) {
         if(pathname.startsWith("/partner/onboarding")){
              return NextResponse.next()
         }
        if (role != "partner") {
            return NextResponse.redirect(new URL("/", req.url))
        }
    }



    return NextResponse.next()

}


export const config={
    matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]
}