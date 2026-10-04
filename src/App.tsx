/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Ingestion from './pages/Ingestion';
import Conformite from './pages/Conformite';
import Factures from './pages/Factures';
import Allocation from './pages/Allocation';
import Reconciliation from './pages/Reconciliation';
import Journal from './pages/Journal';
import Social from './pages/Social';
import Analytics from './pages/Analytics';
import Audit from './pages/Audit';
import Admin from './pages/Admin';
import TVA from './pages/TVA';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-neutral-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );
  
  if (!user) return <Login />;
  
  return <>{children}</>;
}

function Login() {
  const { login } = useAuth();
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-neutral-200 text-center">
        <h1 className="text-4xl font-bold tracking-tighter text-emerald-600 mb-2">Xfactur</h1>
        <p className="text-neutral-500 mb-8">Traitement intelligent de facturation française</p>
        
        <button 
          onClick={login}
          className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-300 py-3 px-4 rounded-xl font-medium hover:bg-neutral-50 transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Se connecter avec Google
        </button>
        
        <p className="mt-8 text-xs text-neutral-400">
          En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="ingestion" element={<Ingestion />} />
            <Route path="factures" element={<Factures />} />
            <Route path="conformite" element={<Conformite />} />
            <Route path="tva" element={<TVA />} />
            <Route path="allocation" element={<Allocation />} />
            <Route path="reconciliation" element={<Reconciliation />} />
            <Route path="journal" element={<Journal />} />
            <Route path="social" element={<Social />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="audit" element={<Audit />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

