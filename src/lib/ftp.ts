import { Client } from 'basic-ftp'

export interface FTPConfig {
  host: string
  port: number
  user: string
  password: string
  secure?: boolean // For SSL/TLS connections
}

export class FTPUploader {
  private config: FTPConfig

  constructor(config: FTPConfig) {
    this.config = config
  }

  async uploadFile(localPath: string, remotePath: string): Promise<string> {
    const client = new Client()
    try {
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure || false
      })

      // Create remote directory if it doesn't exist
      const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'))
      if (remoteDir) {
        try {
          await client.ensureDir(remoteDir)
        } catch (dirError) {
          console.warn('Could not create remote directory:', dirError)
        }
      }

      // Upload file
      await client.uploadFrom(localPath, remotePath)

      // Return the public URL
      const publicUrl = `https://${this.config.host}/files/${remotePath}`
      return publicUrl

    } catch (error) {
      console.error('FTP upload failed:', error)
      throw error
    } finally {
      client.close()
    }
  }

  async testConnection(): Promise<boolean> {
    const client = new Client()
    try {
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure || false
      })
      return true
    } catch (error) {
      console.error('FTP connection test failed:', error)
      return false
    } finally {
      client.close()
    }
  }
}

// Default FTP config - Now using Web Disk
export const ftpConfig: FTPConfig = {
  host: 'assetacademy.id',
  port: 2078,
  user: 'aksesdata@assetacademy.id',
  password: 'komputer123@@',
  secure: true // SSL Enabled
}

export const ftpUploader = new FTPUploader(ftpConfig)
