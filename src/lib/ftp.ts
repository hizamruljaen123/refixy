export interface DropboxConfig {
  accessToken: string
}

export class DropboxUploader {
  private config: DropboxConfig

  constructor(config: DropboxConfig) {
    this.config = config
  }

  async uploadFile(localPath: string, remotePath: string): Promise<string> {
    const fs = await import('fs/promises')

    try {
      // Read file content
      const fileContent = await fs.readFile(localPath)

      // Prepare Dropbox API request
      const dropboxArg = {
        path: remotePath,
        mode: { '.tag': 'add' },
        autorename: true
      }

      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
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
          'Authorization': `Bearer ${this.config.accessToken}`,
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
        // Convert to direct download link
        return shareResult.url.replace('?dl=0', '?dl=1')
      } else {
        // Fallback: construct sharing URL manually
        console.warn('Failed to create shared link, using fallback URL')
        return `https://www.dropbox.com/s/${result.id.split(':')[1]}${result.name}?dl=1`
      }

    } catch (error) {
      console.error('Dropbox upload failed:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      })
      return response.ok
    } catch (error) {
      console.error('Dropbox connection test failed:', error)
      return false
    }
  }
}

// Default Dropbox config
export const dropboxConfig: DropboxConfig = {
  accessToken: process.env.DROPBOX_ACCESS_TOKEN || ''
}

export const dropboxUploader = new DropboxUploader(dropboxConfig)
