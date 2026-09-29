import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/geist'
import RestScreen from './components/RestScreen'
import Markers from './components/Markers'
import './styles/global.css'

// Rest screen for a monitor without an app window: only this, not the whole app (less memory).
const params = new URLSearchParams(window.location.search)
const index = Number(params.get('rest') ?? 0)
const markers = params.get('markers') === '1'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {markers ? <Markers /> : <RestScreen index={index} />}
  </React.StrictMode>
)
