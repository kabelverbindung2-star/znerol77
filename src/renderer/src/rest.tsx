import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import RestScreen from './components/RestScreen'
import './styles/global.css'

// Rest screen for a monitor without an app window: only this, not the whole app (less memory).
const index = Number(new URLSearchParams(window.location.search).get('rest') ?? 0)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RestScreen index={index} />
  </React.StrictMode>
)
