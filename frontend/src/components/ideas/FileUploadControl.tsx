import { useState, useRef, useEffect } from 'react'
import { FileText, Video, Presentation, Paperclip, X } from 'lucide-react'

const ACCEPTED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/quicktime',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

const ACCEPTED_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif',
  '.pdf', '.mp4', '.mov', '.pptx', '.ppt', '.docx', '.doc',
])

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/gif'])
const MAX_FILES = 5
const MAX_TOTAL_BYTES = 50 * 1024 * 1024

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('video/')) return <Video className="w-6 h-6 text-slate-400" />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return <Presentation className="w-6 h-6 text-slate-400" />
  if (mimeType === 'application/pdf' || mimeType.includes('word'))
    return <FileText className="w-6 h-6 text-slate-400" />
  return <Paperclip className="w-6 h-6 text-slate-400" />
}

type Tile = { id: string; file: File; blobUrl: string | null }

export function FileUploadControl({ onFilesChange }: { onFilesChange: (files: File[]) => void }) {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [error, setError] = useState<'count' | 'size' | 'type' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tilesRef = useRef(tiles)
  tilesRef.current = tiles

  useEffect(() => {
    return () => {
      tilesRef.current.forEach(t => { if (t.blobUrl) URL.revokeObjectURL(t.blobUrl) })
    }
  }, [])

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (!newFiles.length) return

    for (const f of newFiles) {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
      if (!ACCEPTED_MIME.has(f.type) || !ACCEPTED_EXT.has(ext)) {
        setError('type')
        return
      }
    }

    const current = tilesRef.current
    const merged = [...current.map(t => t.file), ...newFiles]

    if (merged.length > MAX_FILES) {
      setError('count')
      return
    }

    const totalBytes = merged.reduce((sum, f) => sum + f.size, 0)
    if (totalBytes > MAX_TOTAL_BYTES) {
      setError('size')
      return
    }

    setError(null)
    const newTiles: Tile[] = newFiles.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      blobUrl: IMAGE_MIME.has(f.type) ? URL.createObjectURL(f) : null,
    }))
    const updated = [...current, ...newTiles]
    setTiles(updated)
    onFilesChange(updated.map(t => t.file))
  }

  const handleRemove = (id: string) => {
    const tile = tiles.find(t => t.id === id)
    if (tile?.blobUrl) URL.revokeObjectURL(tile.blobUrl)
    const updated = tiles.filter(t => t.id !== id)
    setTiles(updated)
    onFilesChange(updated.map(t => t.file))
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.mp4,.mov,.pptx,.ppt"
        className="sr-only"
        onChange={handleSelect}
        aria-label="Attach files"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Paperclip className="w-4 h-4" />
        Attach files
      </button>

      {tiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {tiles.map(tile => (
            <div
              key={tile.id}
              className="relative w-20 h-20 border border-border rounded-lg overflow-hidden bg-slate-50 flex flex-col items-center justify-center"
            >
              {tile.blobUrl ? (
                <img
                  src={tile.blobUrl}
                  alt={tile.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 px-1 w-full">
                  {getFileIcon(tile.file.type)}
                  <span className="text-xs text-slate-600 truncate w-full text-center leading-tight">
                    {tile.file.name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(tile.id)}
                aria-label={`Remove ${tile.file.name}`}
                className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error === 'count' && (
        <p className="text-red-500 text-xs mt-1">Maximum 5 files allowed per submission.</p>
      )}
      {error === 'size' && (
        <p className="text-red-500 text-xs mt-1">Combined file size must not exceed 50 MB.</p>
      )}
      {error === 'type' && (
        <p className="text-red-500 text-xs mt-1">
          File type not accepted. Allowed: PDF, DOCX, DOC, PNG, JPG, GIF, MP4, MOV, PPTX, PPT.
        </p>
      )}
    </div>
  )
}
