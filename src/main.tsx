import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { InboxProvider } from './data/inbox'
import { MasterProvider } from './data/masterStore'
import { RequestsProvider } from './data/requests'
import { SetupProvider } from './data/setup'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <SetupProvider>
        <RequestsProvider>
          <InboxProvider>
            <MasterProvider>
              <App />
            </MasterProvider>
          </InboxProvider>
        </RequestsProvider>
      </SetupProvider>
    </BrowserRouter>
  </StrictMode>,
)
