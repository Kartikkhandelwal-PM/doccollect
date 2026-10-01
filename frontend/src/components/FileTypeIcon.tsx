import { FileIcon, defaultStyles } from 'react-file-icon'
import type { DefaultExtensionType } from 'react-file-icon'

// Accepts a file name ("Form 16.pdf") or a bare extension ("xlsx") and shows the matching file-type icon.
export default function FileTypeIcon({ file, size = 32 }: { file: string; size?: number }) {
  const ext = (file.includes('.') ? file.split('.').pop()! : file).toLowerCase()
  const known = ext in defaultStyles ? (ext as DefaultExtensionType) : undefined
  return (
    <span className="inline-block shrink-0" style={{ width: size * 0.8, height: size }} aria-hidden="true">
      <FileIcon extension={ext} {...(known ? defaultStyles[known] : {})} />
    </span>
  )
}
