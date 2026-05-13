import { FileText, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

function fileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext === 'png' || ext === 'jpg' || ext === 'jpeg' ? (
    <ImageIcon className="w-5 h-5 text-slate-500" />
  ) : (
    <FileText className="w-5 h-5 text-slate-500" />
  )
}

export function FileDownloadBlock({ file }: { file: { name: string; url: string } }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        {fileIcon(file.name)}
        <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{file.name}</span>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href={file.url} download={file.name}>
          Download
        </a>
      </Button>
    </div>
  )
}
