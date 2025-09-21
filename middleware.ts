import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

// Only run auth middleware for /dashboard and its subroutes
export const config = {
  matcher: ["/dashboard/:path*"],
  runtime: "nodejs",
};