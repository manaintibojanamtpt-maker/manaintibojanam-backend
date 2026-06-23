import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Loader2, Lock, Mail, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';
import { useAuth } from '../context/AuthContext';

const BhojanOSSuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();

  // Redirect if already logged in as superadmin
  useEffect(() => {
    if (authLoading) return;

    if (currentUser && userProfile) {
      if (userProfile.role === 'superadmin') {
        navigate('/super-admin');
      } else if (userProfile.role === 'admin') {
        toast.error("You are an admin, redirecting to store admin portal.");
        navigate('/admin');
      } else {
        toast.error("Unauthorized role.");
        navigate('/');
      }
    }
  }, [currentUser, userProfile, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorDetails(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Super Admin logged in successfully!');
    } catch (error: any) {
      console.error('Super Admin login error:', error);
      
      if (error.code === 'auth/network-request-failed') {
        setErrorDetails("Network connection failed. This usually happens if your internet is unstable or if the Firebase Auth domain is not allowlisted in the Firebase Console.");
        toast.error("Network Error. Please check your connection.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast.error("Invalid super admin credentials. Please check your email and password.");
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Please enter a valid super admin email address.");
      } else if (error.code === 'auth/too-many-requests') {
        toast.error("Too many login attempts. Please try again after a few minutes.");
      } else {
        toast.error(error.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-dark-bg p-6 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center w-full py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <m.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-1 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl mb-6 overflow-hidden border-2 border-orange-500/10"
          >
            <img src={bhojanOsLogo} alt="BhojanOS Logo" className="w-24 h-24 object-contain rounded-3xl shadow-inner" />
          </m.div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>Super Admin Portal</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-2">Secure Gateway • Authorized Only</p>
        </div>

        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800"
        >
          {errorDetails && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-xs font-medium text-red-600 leading-relaxed">{errorDetails}</p>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Super Admin Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 border border-gray-200 dark:border-gray-800 transition-all font-medium"
                  placeholder="superadmin@bhojan.os"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 border border-gray-200 dark:border-gray-800 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl py-4 text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Enter Dashboard <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link 
              to="/admin/login" 
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Store Admin Login
            </Link>
          </div>
        </m.div>

        <p className="text-center text-xs font-medium text-gray-400 mt-8">
          © 2026 BhojanOS. All rights reserved.
        </p>
      </div>
      </div>
    </div>
  );
};

export default BhojanOSSuperAdminLogin;
