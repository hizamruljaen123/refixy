import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            user_roles: {
              include: {
                role: {
                  include: {
                    role_permissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                },
                unit: true
              }
            }
          }
        })

        if (!user || !user.is_active) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )

        if (!isPasswordValid) {
          return null
        }

        // Extract roles and permissions
        const roles = user.user_roles.map(ur => ur.role.name)
        const permissions = user.user_roles.flatMap(ur => 
          ur.role.role_permissions.map(rp => rp.permission.code)
        )
        const units = user.user_roles.map(ur => ur.unit).filter(Boolean)

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          roles,
          permissions,
          units
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles
        token.permissions = user.permissions
        token.units = user.units
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.roles = token.roles as string[]
        session.user.permissions = token.permissions as string[]
        session.user.units = token.units as any[]
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout"
  }
}