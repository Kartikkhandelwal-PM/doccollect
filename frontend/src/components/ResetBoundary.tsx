import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { RESET_EVENT } from '../lib/session'

// Everything inside starts again from the sample data when the logo is clicked: saved values are cleared and the stores are rebuilt.
export default function ResetBoundary({ children }: { children: ReactNode }) {
  const [round, setRound] = useState(0)
  const navigate = useNavigate()
  useEffect(() => {
    const reset = () => {
      try {
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('doccollect:'))
          .forEach((k) => sessionStorage.removeItem(k))
      } catch {
        /* nothing saved */
      }
      setRound((n) => n + 1)
      navigate('/')
    }
    window.addEventListener(RESET_EVENT, reset)
    return () => window.removeEventListener(RESET_EVENT, reset)
  }, [navigate])
  return <div key={round} className="contents">{children}</div>
}
