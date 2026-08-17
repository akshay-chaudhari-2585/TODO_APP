import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import TaskForm from './pages/TaskForm';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import Game from './pages/Game';
import Chess from './pages/Chess';
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/task/new" element={
            <ProtectedRoute>
              <TaskForm />
            </ProtectedRoute>
          } />
          <Route path="/task/:id" element={
            <ProtectedRoute>
              <TaskForm />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/game" element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          } />
          <Route path="/chess" element={
            <ProtectedRoute>
              <Chess />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;


