import { db } from '@/lib/db'

export const DROPBOX_TOKEN_KEY = 'DROPBOX_ACCESS_TOKEN'

export interface IntegrationSettingOptions {
  description?: string | null
  updatedBy?: string | null
}

export interface IntegrationSettingWithMeta {
  id: string
  key: string
  value: string | null
  description: string | null
  created_at: Date
  updated_at: Date
  updated_by: string | null
  updatedBy?: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

export async function getIntegrationSetting(key: string) {
  return (db as any).integrationSetting.findUnique({
    where: { key }
  })
}

export async function getIntegrationSettingWithMeta(key: string) {
  return (db as any).integrationSetting.findUnique({
    where: { key },
    include: {
      updatedBy: {
        select: {
          id: true,
          full_name: true,
          email: true
        }
      }
    }
  })
}

export async function upsertIntegrationSetting(
  key: string,
  value: string | null,
  options: IntegrationSettingOptions = {}
) {
  return (db as any).integrationSetting.upsert({
    where: { key },
    update: {
      value,
      description: options.description ?? undefined,
      updated_by: options.updatedBy ?? undefined
    },
    create: {
      key,
      value,
      description: options.description ?? undefined,
      updated_by: options.updatedBy ?? undefined
    }
  })
}

export async function getDropboxAccessTokenFromDB(): Promise<string | null> {
  const setting = await getIntegrationSetting(DROPBOX_TOKEN_KEY)
  return setting?.value ?? null
}

export function maskToken(token: string, visiblePrefix = 4, visibleSuffix = 4) {
  if (!token) return ''
  if (token.length <= visiblePrefix + visibleSuffix) return token
  return `${token.slice(0, visiblePrefix)}••••${token.slice(-visibleSuffix)}`
}

export async function resolveDropboxAccessToken(): Promise<string | null> {
  const dbToken = await getDropboxAccessTokenFromDB()
  return dbToken && dbToken.trim().length > 0 ? dbToken : null
}
