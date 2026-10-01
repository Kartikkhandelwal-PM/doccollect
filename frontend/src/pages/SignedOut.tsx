import { LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../lib/brand'

// Where Sign Out lands. With real login this clears the session; for now it just shows the screen.
export default function SignedOut() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-muted shadow-sm">
        <LogOut size={24} />
      </span>
      <h1 className="text-2xl font-bold tracking-tight">You have signed out</h1>
      <p className="text-sm text-muted">Thank you for using {APP_NAME}.</p>
      <Link to="/" className="h-11 rounded-xl bg-brand px-6 text-sm font-semibold leading-[44px] text-white">
        Sign in again
      </Link>
    </div>
  )
}
