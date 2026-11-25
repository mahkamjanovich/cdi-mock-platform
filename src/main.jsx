import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './themes/index.css'
import { initCursor } from './cursor.js'
import { initDesign } from './design.js'

initDesign()
createRoot(document.getElementById('root')).render(<App />)
initCursor()
