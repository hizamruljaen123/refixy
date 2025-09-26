import { promises as fs } from 'fs'
import { resolveDropboxAccessToken } from '@/lib/integration-settings'

export class DropboxUploader {
  private accessToken: string | null

  constructor(accessToken?: string | null) {
    this.accessToken = accessToken ?? null
  }

  setAccessToken(token: string | null) {
    this.accessToken = token ?? null
  }

  private requireAccessToken() {
    if (!this.accessToken || this.accessToken.trim().length === 0) {
      throw new Error('Dropbox access token is not configured. Please set it via the integration settings.')
    }
    return this.accessToken
  }

  private async uploadContent(fileContent: Buffer, remotePath: string): Promise<string> {
    const token = this.requireAccessToken()

    // Prepare Dropbox API request
    const dropboxArg = {
      path: remotePath,
      mode: { '.tag': 'add' },
      autorename: true
    }

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(dropboxArg)
      },
      body: fileContent
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Dropbox upload failed: ${response.status} ${errorText}`

      if (response.status === 401) {
        errorMessage = 'Dropbox access token is invalid or expired. Please update the access token in the configuration.'
      }

      throw new Error(errorMessage)
    }

    const result = await response.json()

    // Create shared link for public access
    const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: result.path_display,
        settings: {
          requested_visibility: 'public'
        }
      })
    })

    if (shareResponse.ok) {
      const shareResult = await shareResponse.json()
      // Convert to direct access link suitable for embeds
      return shareResult.url
        .replace('?dl=0', '?raw=1')
        .replace('?dl=1', '?raw=1')
    } else {
      // Fallback: construct sharing URL manually
      console.warn('Failed to create shared link, using fallback URL')
      return `https://www.dropbox.com/s/${result.id.split(':')[1]}${result.name}?raw=1`
    }
  }

  async uploadFile(localPath: string, remotePath: string): Promise<string> {
    try {
      // Read file content
      const fileContent = await fs.readFile(localPath)
      return await this.uploadContent(fileContent, remotePath)
    } catch (error) {
      console.error('Dropbox upload failed:', error)
      throw error
    }
  }

  async uploadBuffer(buffer: Buffer, remotePath: string): Promise<string> {
    return this.uploadContent(buffer, remotePath)
  }

  async testConnection(): Promise<boolean> {
    try {
      const token = this.requireAccessToken()
      const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      return response.ok
    } catch (error) {
      console.error('Dropbox connection test failed:', error)
      return false
    }
  }
}

const dropboxUploader = new DropboxUploader(null)

export async function getDropboxUploader() {
  const token = await resolveDropboxAccessToken()
  dropboxUploader.setAccessToken(token)
  return dropboxUploader
}
