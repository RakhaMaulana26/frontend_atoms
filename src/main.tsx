import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Only use StrictMode in development to prevent double execution issues
const AppWrapper = import.meta.env.DEV ? StrictMode : ({ children }: { children: React.ReactNode }) => <>{children}</>;

createRoot(document.getElementById('root')!).render(
  <AppWrapper>
    <App />
  </AppWrapper>,
)
