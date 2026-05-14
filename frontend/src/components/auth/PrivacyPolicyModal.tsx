import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PRIVACY_POLICY_SECTIONS } from '@/content/privacyPolicy'

interface PrivacyPolicyModalProps {
  open: boolean
  onClose: () => void
}

export function PrivacyPolicyModal({ open, onClose }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-2xl w-full mx-4 flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 space-y-6 text-sm text-slate-700 leading-relaxed">
          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3 className="font-semibold text-slate-900 mb-2">{section.heading}</h3>
              {section.blocks.map((block, i) =>
                block.type === 'list' ? (
                  <ul key={i} className="list-disc pl-5 space-y-1 mb-3">
                    {block.items!.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="mb-3 whitespace-pre-line">{block.text}</p>
                )
              )}
            </section>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
