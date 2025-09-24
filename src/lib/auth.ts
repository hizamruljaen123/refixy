import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  trustHost: true, // Required for Vercel deployment
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('Missing credentials')
            return null
          }

          console.log('Attempting login for:', credentials.email)

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

          if (!user) {
            console.log('User not found:', credentials.email)
            return null
          }

          if (!user.is_active) {
            console.log('User is not active:', credentials.email)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          )

          if (!isPasswordValid) {
            console.log('Invalid password for:', credentials.email)
            return null
          }

          // Extract roles and permissions
          const roles = user.user_roles.map(ur => ur.role.name)
          const permissions = user.user_roles.flatMap(ur => 
            ur.role.role_permissions.map(rp => rp.permission.code)
          )
          const units = user.user_roles.map(ur => ur.unit).filter(Boolean)

          console.log('Login successful for:', credentials.email)
          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            roles,
            permissions,
            units
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
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
    signOut: "/auth/signout",
    error: "/auth/error"
  }
}