import { useState, useRef } from 'react'
import { Paperclip, X } from 'lucide-react'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024

function formatSize(b: number): string {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadControl({ onChange }: { onChange: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<'type' | 'size' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    if (!selected) return
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('type')
      setFile(null)
      onChange(null)
      return
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError('size')
      setFile(null)
      onChange(null)
      return
    }
    setError(null)
    setFile(selected)
    onChange(selected)
  }

  const handleClear = () => {
    setFile(null)
    setError(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.png,.jpg,.jpeg"
        className="sr-only"
        onChange={handleSelect}
        aria-label="Attach a file"
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Paperclip className="w-4 h-4" />
          Attach a file
        </button>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg bg-white">
          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-sm text-slate-700 truncate">
            {file.name} <span className="text-slate-400">({formatSize(file.size)})</span>
          </span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Remove file"
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error === 'type' && (
        <p className="text-red-500 text-xs mt-1">Only PDF, DOCX, PNG, and JPG files are accepted.</p>
      )}
      {error === 'size' && (
        <p className="text-red-500 text-xs mt-1">File must be 10 MB or smaller.</p>
      )}
    </div>
  )
}
