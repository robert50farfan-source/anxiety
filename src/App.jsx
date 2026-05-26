import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './context/AuthContext'
import { ParticipanteProvider, useParticipante } from './context/ParticipanteContext'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Exercises from './pages/Exercises'
import Chat from './pages/Chat'
import Progress from './pages/Progress'
import CodigoParticipanteGate from './components/CodigoParticipanteGate'
import ParticipanteBadge from './components/ParticipanteBadge'
import PantallaConsentimiento from './components/PantallaConsentimiento'
import BasalBloqueada from './components/BasalBloqueada'

import { AdminSessionProvider } from './admin/hooks/useAdminSession'
import AdminBanner from './admin/components/AdminBanner'
import RequiereAdmin from './admin/components/RequiereAdmin'
import AdminLayout from './admin/components/AdminLayout'

import AdminLogin from './admin/pages/AdminLogin'
import Dashboard from './admin/pages/Dashboard'
import Participantes from './admin/pages/Participantes'
import Profesionales from './admin/pages/Profesionales'
import Mediciones from './admin/pages/Mediciones'
import Episodios from './admin/pages/Episodios'
import CrisisEventos from './admin/pages/CrisisEventos'
import Configuracion from './admin/pages/configuracion/Configuracion'
import Administradores from './admin/pages/configuracion/Administradores'
import Auditoria from './admin/pages/configuracion/Auditoria'

function PantallaRetirado() {
  const { motivoRetiro } = useParticipante()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-calm-50 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-calm-800 mb-3">Has sido retirado del estudio</h2>
      <p className="text-sm text-calm-600 leading-relaxed max-w-xs">
        Tus datos se conservan según lo acordado en el consentimiento informado.
        Contacta al investigador para más información.
      </p>
    </div>
  )
}

function PantallaInactivoSinBasal() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-calm-50 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-calm-800 mb-3">Participación inactiva</h2>
      <p className="text-sm text-calm-600 leading-relaxed max-w-xs">
        El BAI inicial no fue completado en el tiempo esperado. Tus datos no podrán ser analizados en este ciclo del estudio. Contacta al investigador para más información.
      </p>
      <p className="mt-4 text-sm font-medium text-calm-700">robert50.farfan@gmail.com — 77894423</p>
    </div>
  )
}

function ParticipantShell() {
  const [page, setPage] = useState('home')
  const { isReady } = useAuth()
  const { cargando, codigo, estaRetirado, tieneConsentimientoVigente, basalRequerida, estaInactivoSinBasal } = useParticipante()

  if (!isReady || cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-calm-50">
        <div className="w-8 h-8 border-2 border-calm-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!codigo) return <CodigoParticipanteGate />

  if (estaRetirado) return <PantallaRetirado />

  if (!tieneConsentimientoVigente) return <PantallaConsentimiento />

  if (estaInactivoSinBasal) return <PantallaInactivoSinBasal />

  if (basalRequerida) return <BasalBloqueada />

  const renderPage = () => {
    switch (page) {
      case 'home':      return <Home />
      case 'exercises': return <Exercises />
      case 'chat':      return <Chat />
      case 'progress':  return <Progress />
      default:          return <Home />
    }
  }

  return (
    <>
      <AdminBanner />
      <div className="relative flex flex-col h-full max-w-md mx-auto bg-calm-50">
        <ParticipanteBadge />
        <main className="flex-1 overflow-y-auto pb-20">
          {renderPage()}
        </main>
        <BottomNav current={page} onChange={setPage} />
      </div>
    </>
  )
}

function ParticipantApp() {
  return (
    <AuthProvider>
      <ParticipanteProvider>
        <ParticipantShell />
      </ParticipanteProvider>
    </AuthProvider>
  )
}

function AdminRoot() {
  return (
    <AdminSessionProvider>
      <Outlet />
    </AdminSessionProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminRoot />}>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<RequiereAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<Dashboard />} />
              <Route path="participantes" element={<Participantes />} />
              <Route path="profesionales" element={<Profesionales />} />
              <Route path="mediciones"    element={<Mediciones />} />
              <Route path="episodios"     element={<Episodios />} />
              <Route path="crisis"        element={<CrisisEventos />} />
              <Route path="configuracion" element={<Configuracion />}>
                <Route index element={<Navigate to="administradores" replace />} />
                <Route path="administradores" element={<Administradores />} />
                <Route path="auditoria"       element={<Auditoria />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="/*" element={<ParticipantApp />} />
      </Routes>
    </BrowserRouter>
  )
}
