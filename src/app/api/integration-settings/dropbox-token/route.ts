import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  DROPBOX_TOKEN_KEY,
  getIntegrationSettingWithMeta,
  maskToken,
  resolveDropboxAccessToken,
  upsertIntegrationSetting
} from '@/lib/integration-settings'
import { DropboxUploader } from '@/lib/ftp'

async function ensureAdmin(session: any) {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPermissions: string[] = session.user.permissions || []
  const userRoles: string[] = session.user.roles || []

  if (!userPermissions.includes('ADMIN') && !userRoles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const permissionError = await ensureAdmin(session)
    if (permissionError) return permissionError

    const includeRaw = request.nextUrl.searchParams.get('raw') === 'true'

    const setting = await getIntegrationSettingWithMeta(DROPBOX_TOKEN_KEY)
    const maskedToken = setting?.value ? maskToken(setting.value) : null

    return NextResponse.json({
      token: includeRaw ? setting?.value ?? null : null,
      maskedToken,
      hasToken: !!setting?.value,
      description: setting?.description ?? null,
      updatedAt: setting?.updated_at ?? null,
      updatedBy: setting?.updatedBy ?? null
    })
  } catch (error) {
    console.error('Error fetching Dropbox token setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const permissionError = await ensureAdmin(session)
    if (permissionError) return permissionError

    const body = await request.json().catch(() => ({}))
    const { token, description } = body as { token?: string | null; description?: string | null }

    const normalizedToken = token ? String(token).trim() : null
    const normalizedDescription = description ? String(description).trim() : null

    const updatedSetting = await upsertIntegrationSetting(DROPBOX_TOKEN_KEY, normalizedToken, {
      description: normalizedDescription,
      updatedBy: session?.user?.id || null
    })

    return NextResponse.json({
      message: normalizedToken ? 'Dropbox token updated' : 'Dropbox token cleared',
      maskedToken: normalizedToken ? maskToken(normalizedToken) : null,
      updatedAt: updatedSetting.updated_at,
      updatedBy: session?.user ? { id: session.user.id, full_name: session.user.name, email: session.user.email } : null
    })
  } catch (error) {
    console.error('Error updating Dropbox token setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const permissionError = await ensureAdmin(session)
    if (permissionError) return permissionError

    const body = await request.json().catch(() => ({}))
    const { token } = body as { token?: string | null }

    const tokenToTest = token && token.trim().length > 0 ? token.trim() : await resolveDropboxAccessToken()

    if (!tokenToTest) {
      return NextResponse.json({
        ok: false,
        message: 'No Dropbox token configured. Provide a token to test or configure one first.'
      }, { status: 400 })
    }

    const uploader = new DropboxUploader(tokenToTest)
    const ok = await uploader.testConnection()

    if (!ok) {
      return NextResponse.json({ ok: false, message: 'Failed to connect to Dropbox with the provided token.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Successfully connected to Dropbox.' })
  } catch (error) {
    console.error('Error testing Dropbox token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
