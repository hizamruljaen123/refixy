import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles: string[]
      permissions: string[]
      units: any[]
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    roles: string[]
    permissions: string[]
    units: any[]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    roles: string[]
    permissions: string[]
    units: any[]
  }
}