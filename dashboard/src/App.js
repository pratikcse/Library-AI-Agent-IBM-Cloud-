import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import MyBooks from "./pages/MyBooks";
import AllBooks from "./pages/AllBooks";
import Returns from "./pages/Returns";
import LibraryAgent from "./pages/LibraryAgent";
import Login from "./pages/Login";
import "./theme.css";

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Layout with Navbar for authenticated pages
function AuthenticatedLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function AppRoutes() {
  const [theme] = useState("light");

  return (
    <div className={theme}>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />
        <Route path="/my-books" element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <MyBooks />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />
        <Route path="/books" element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <AllBooks />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />
        <Route path="/returns" element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Returns />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />
        <Route path="/library-agent" element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <LibraryAgent />
            </AuthenticatedLayout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
