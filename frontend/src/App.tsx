import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Splash from './components/Splash'
import ClientDetail from './pages/ClientDetail'
import ClientUpload from './pages/ClientUpload'
import Clients from './pages/Clients'
import Dashboard from './pages/Dashboard'
import FileView from './pages/FileView'
import Inbox from './pages/Inbox'
import Compliances from './pages/Compliances'
import Documents from './pages/Documents'
import Master from './pages/Master'
import NewRequest from './pages/NewRequest'
import Placeholder from './pages/Placeholder'
import RequestDetail from './pages/RequestDetail'
import Requests from './pages/Requests'
import Settings from './pages/Settings'
import SignedOut from './pages/SignedOut'
import Templates from './pages/Templates'

// The splash plays once when the app opens. Not on a client's upload page, and not after signing out.
// It plays once per page load, not again when the demo is reset from the logo.
let splashPlayed = false
const wantsSplash = () => {
  if (splashPlayed) return false
  try {
    if (localStorage.getItem('skip-splash') === '1') return false
  } catch {
    /* no storage, play it */
  }
  const path = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1)
  return !/^\/(u\/|signed-out|file)/.test(path)
}

export default function App() {
  const [splash, setSplash] = useState(wantsSplash)
  return (
    <>
    {splash && <Splash onDone={() => {
      splashPlayed = true
      setSplash(false)
    }} />}
    <Routes>
      {/* What a client sees from the WhatsApp link. No sidebar, no login. */}
      <Route path="u/:requestId/:clientId" element={<ClientUpload />} />
      <Route path="u/:token" element={<ClientUpload />} />
      <Route path="signed-out" element={<SignedOut />} />
      <Route path="file" element={<FileView />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/new" element={<NewRequest />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="master" element={<Master />} />
        <Route path="compliances" element={<Compliances />} />
        <Route path="documents" element={<Documents />} />
        <Route path="templates" element={<Templates />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Route>
    </Routes>
    </>
  )
}
