import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req: request, secret });
  const isLoggedIn = !!token;
  const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isOnAuth =
    request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup";

  if (isOnDashboard && !isLoggedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
