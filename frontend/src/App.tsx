import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SessionSetupPage } from "./pages/SessionSetupPage";
import { LiveTutorRoomPage } from "./pages/LiveTutorRoomPage";
import { SessionSummaryPage } from "./pages/SessionSummaryPage";

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-sm text-slate-400">
        Loading LearnMate Live...
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <SessionSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:sessionId"
        element={
          <ProtectedRoute>
            <LiveTutorRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/summary/:sessionId"
        element={
          <ProtectedRoute>
            <SessionSummaryPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
