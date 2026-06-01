import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DictatePage from './pages/DictatePage'
import DocumentPage from './pages/DocumentPage'
import AjustesPage from './pages/AjustesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dictar" element={<DictatePage />} />
        <Route path="/documento" element={<DocumentPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
      </Routes>
    </BrowserRouter>
  )
}