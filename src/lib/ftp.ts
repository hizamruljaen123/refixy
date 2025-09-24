import { Client } from 'basic-ftp'

export interface FTPConfig {
  host: string
  port: number
  user: string
  password: string
}

export class FTPUploader {
  private config: FTPConfig

  constructor(config: FTPConfig) {
    this.config = config
  }

  async uploadFile(localPath: string, remotePath: string): Promise<string> {
    const client = new Client()
    client.ftp.verbose = false

    try {
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        secure: false
      })

      // Create remote directory if needed
      const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'))
      if (remoteDir) {
        await client.ensureDir(remoteDir)
      }

      // Upload file
      await client.uploadFrom(localPath, remotePath)

      // Generate public URL (assuming FTP server serves files via HTTP)
      const publicUrl = `https://assetacademy.id/files/${remotePath}`

      return publicUrl
    } catch (error) {
      console.error('FTP upload error:', error)
      throw new Error(`Failed to upload file to FTP: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        secure: false
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

// Default FTP config
export const ftpConfig: FTPConfig = {
  host: 'ftp.assetacademy.id',
  port: 21,
  user: 'admindata@assetacademy.id',
  password: 'komputer123@@'
}

export const ftpUploader = new FTPUploader(ftpConfig)
