import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Exercises from './pages/Exercises'
import Chat from './pages/Chat'
import Progress from './pages/Progress'

export default function App() {
  const [page, setPage] = useState('home')

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
    <AuthProvider>
      <div className="flex flex-col h-full max-w-md mx-auto bg-calm-50">
        <main className="flex-1 overflow-y-auto pb-20">
          {renderPage()}
        </main>
        <BottomNav current={page} onChange={setPage} />
      </div>
    </AuthProvider>
  )
}
