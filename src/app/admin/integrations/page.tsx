"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ShieldAlert, RefreshCcw } from "lucide-react"

interface DropboxSettingResponse {
  token: string | null
  maskedToken: string | null
  hasToken: boolean
  description: string | null
  updatedAt: string | null
  updatedBy: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [setting, setSetting] = useState<DropboxSettingResponse | null>(null)
  const [tokenInput, setTokenInput] = useState("")
  const [descriptionInput, setDescriptionInput] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [rawToken, setRawToken] = useState<string | null>(null)

  useEffect(() => {
    fetchSetting()
  }, [])

  const fetchSetting = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/integration-settings/dropbox-token")
      if (!response.ok) {
        throw new Error("Failed to fetch settings")
      }
      const data = await response.json() as DropboxSettingResponse
      setSetting(data)
      setDescriptionInput(data.description ?? "")
      setTokenInput("")
      setShowToken(false)
      setRawToken(null)
    } catch (error) {
      console.error("Error fetching Dropbox token setting", error)
      toast.error("Gagal memuat konfigurasi Dropbox")
    } finally {
      setLoading(false)
    }
  }

  const handleRevealToken = async () => {
    if (showToken || rawToken) {
      setShowToken(false)
      return
    }
    try {
      const response = await fetch("/api/integration-settings/dropbox-token?raw=true")
      if (!response.ok) {
        throw new Error("Failed to fetch raw token")
      }
      const data = await response.json() as DropboxSettingResponse
      setRawToken(data.token)
      setShowToken(true)
    } catch (error) {
      console.error("Error revealing Dropbox token", error)
      toast.error("Gagal menampilkan token Dropbox")
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/integration-settings/dropbox-token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenInput.trim().length > 0 ? tokenInput : null,
          description: descriptionInput.trim().length > 0 ? descriptionInput : null
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Gagal menyimpan pengaturan" }))
        throw new Error(error.error || "Gagal menyimpan pengaturan")
      }

      toast.success(tokenInput.trim() ? "Token Dropbox berhasil diperbarui" : "Token Dropbox dikosongkan")
      await fetchSetting()
    } catch (error: any) {
      console.error("Error updating Dropbox token", error)
      toast.error(error?.message || "Gagal menyimpan pengaturan Dropbox")
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/integration-settings/dropbox-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim() || rawToken || setting?.token || null })
      })

      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Koneksi Dropbox gagal")
      }

      toast.success(data.message || "Koneksi Dropbox berhasil")
    } catch (error: any) {
      console.error("Error testing Dropbox token", error)
      toast.error(error?.message || "Gagal menguji koneksi Dropbox")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Integrasi Sistem</h2>
        <p className="text-muted-foreground">
          Kelola kredensial integrasi pihak ketiga. Token disimpan di database sehingga dapat diperbarui tanpa deploy ulang.
        </p>
      </div>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Dropbox Document Storage
          </CardTitle>
          <CardDescription>
            Token akses digunakan untuk mengunggah dokumen dan lampiran ke Dropbox. Pastikan token memiliki izin tulis pada folder tujuan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {setting?.hasToken ? (
            <Alert>
              <AlertTitle>Token saat ini aktif</AlertTitle>
              <AlertDescription className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Token:</span>{" "}
                  {showToken ? (
                    <code className="px-1 py-0.5 text-xs bg-muted rounded">{rawToken || setting.maskedToken}</code>
                  ) : (
                    <code className="px-1 py-0.5 text-xs bg-muted rounded">{setting.maskedToken ?? "(tidak tersedia)"}</code>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Terakhir diperbarui: {setting.updatedAt ? new Date(setting.updatedAt).toLocaleString("id-ID") : "-"}</Badge>
                  {setting.updatedBy?.full_name && (
                    <Badge variant="outline">Oleh: {setting.updatedBy.full_name}</Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Token belum dikonfigurasi</AlertTitle>
              <AlertDescription>
                Sistem belum memiliki token Dropbox yang aktif. Masukkan token baru untuk mengaktifkan integrasi.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Token Dropbox *</label>
            <Input
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              type="password"
              placeholder="Masukkan token baru atau biarkan kosong untuk mempertahankan"
            />
            <p className="text-xs text-muted-foreground">
              Token baru akan menggantikan token eksisting. Biarkan kosong untuk mempertahankan token yang ada, atau klik tombol hapus.
            </p>
            <Button variant="link" className="px-0" onClick={handleRevealToken}>
              {showToken ? "Sembunyikan token saat ini" : "Tampilkan token saat ini"}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi (opsional)</label>
            <Textarea
              value={descriptionInput}
              onChange={(event) => setDescriptionInput(event.target.value)}
              placeholder="Catatan untuk token ini, misalnya siapa yang membuat atau tanggal kedaluwarsa"
              rows={3}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RefreshCcw className="mr-2 h-4 w-4" />
              Uji Koneksi
            </Button>
            <Button variant="ghost" onClick={fetchSetting}>
              Muat Ulang
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setTokenInput("")
                toast.info("Token akan dikosongkan setelah menekan Simpan Pengaturan")
              }}
            >
              Kosongkan Token
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
