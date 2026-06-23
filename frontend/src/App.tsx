import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Tests from './pages/Tests';
import TestEditor from './pages/TestEditor';
import ExamConfig from './pages/ExamConfig';
import ExamRunner from './pages/ExamRunner';
import Results from './pages/Results';
import Review from './pages/Review';
import Statistics from './pages/Statistics';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

export default function App() {
  const { loading } = useAuth();
  if (loading)
    return (
      <div className="grid h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );

  return (
    <Routes>
      {/* Açıq səhifələr — yalnız daxil olmamışlar üçün */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />

      {/* Tam ekran imtahan (sidebar olmadan) */}
      <Route
        path="/exam/:sessionId"
        element={
          <ProtectedRoute>
            <ExamRunner />
          </ProtectedRoute>
        }
      />

      {/* Layout-lu səhifələr */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/tests/:testId/edit" element={<TestEditor />} />
        <Route path="/tests/:testId/config" element={<ExamConfig />} />
        <Route path="/results/:sessionId" element={<Results />} />
        <Route path="/review/:sessionId" element={<Review />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
