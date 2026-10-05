// The address of a file opened on its own page. It carries what the page needs, so it opens the same in a new tab.
export function fileLink(file: { name: string; fileName?: string; client: string; pan: string; from?: string; moreFiles?: string[] }) {
  const q = new URLSearchParams({ name: file.name, file: file.fileName ?? file.name, client: file.client, pan: file.pan })
  if (file.from) q.set('from', file.from)
  file.moreFiles?.forEach((f) => q.append('more', f))
  return `${import.meta.env.BASE_URL}file?${q.toString()}`
}
