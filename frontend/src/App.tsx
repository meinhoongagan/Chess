import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/home'
import AuthPage from './pages/auth'
import GamePage from './pages/Game'


const App = () => {
  return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
  )
}

export default App
