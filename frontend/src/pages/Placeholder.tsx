export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-[24px] font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">This page comes in the next step.</p>
    </div>
  )
}
