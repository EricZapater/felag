import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginView from '@/modules/auth/views/LoginView';
import RegisterView from '@/modules/auth/views/RegisterView';
import ProfileView from '@/modules/profile/views/ProfileView';
import OriginSelectorView from '@/modules/profile/views/OriginSelectorView';
import TripsListView from '@/modules/trips/views/TripsListView';
import TripCreateView from '@/modules/trips/views/TripCreateView';
import TripDetailView from '@/modules/trips/views/TripDetailView';
import { useAuthStore } from '@/modules/auth/store';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route
          path="/trips"
          element={
            <ProtectedRoute>
              <TripsListView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/new"
          element={
            <ProtectedRoute>
              <TripCreateView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripDetailView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/origin"
          element={
            <ProtectedRoute>
              <OriginSelectorView />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/trips" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
