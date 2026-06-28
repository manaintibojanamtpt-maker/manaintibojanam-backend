import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Loader2, Lock, Mail, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.webp';
import { useAuth } from '../context/AuthContext';
import { logIncident } from '../lib/monitoring';
import { EnvironmentConfig } from '../config/environment';
import SoftButton from '../components/ui/SoftButton';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  
  const isBhojanOS = EnvironmentConfig.isBhojanOSRoot();
  const displayLogo = isBhojanOS ? '/bhojan-os-icon.png' : '/logo-v20-final.png';

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading) return;

    if (currentUser && userProfile) {
      if (userProfile.role === 'admin' || userProfile.role === 'superadmin') {
        // If a superadmin explicitly visits the admin login, allow them into the admin panel 
        // because superadmins have full rights to the main store as well.
        navigate('/admin');
      } else if ((userProfile.ownedTenantIds?.length || 0) > 0 || userProfile.role === 'owner') {
        navigate('/owner/settings');
      } else {
        // If a normal user is here, they might want to login as admin
        // with a different account. We should NOT auto-redirect them 
        // away unless they specifically try to access /admin
      }
    }
  }, [currentUser, userProfile, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorDetails(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully!');
    } catch (error: any) {
      console.error('Admin login error:', error);
      logIncident('security_events', { reason: 'Admin Login Failed', email, error: error.message });
      
      if (error.code === 'auth/network-request-failed') {
        setErrorDetails("Network connection failed. This usually happens if your internet is unstable or if the Firebase Auth domain is not allowlisted in the Firebase Console.");
        toast.error("Network Error. Please check your connection.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast.error("Invalid admin credentials. Please check your email and password.");
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Please enter a valid admin email address.");
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
            className={`inline-block p-1 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl mb-6 overflow-hidden ${isBhojanOS ? '' : 'border-2 border-orange-500/10'}`}
          >
            <img src={displayLogo} alt="Logo" className="w-24 h-24 object-contain rounded-3xl shadow-inner" />
          </m.div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter" style={{ fontFamily: isBhojanOS ? "'Inter', sans-serif" : "'Playfair Display', serif" }}>
            {isBhojanOS ? "BHOJANOS" : "Admin Portal"}
          </h1>
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
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Admin Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-3xl font-bold text-sm text-gray-900 dark:text-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/50 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-3xl font-bold text-sm text-gray-900 dark:text-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/50 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <SoftButton type="submit" tone="danger" fullWidth disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <span>Enter Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </SoftButton>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-800 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-red-600 transition-colors">
              <ArrowLeft size={16} />
              <span>Back to Customer Site</span>
            </Link>
          </div>
        </m.div>
        
        <p className="text-center mt-8 text-xs text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} BhojanOS. All rights reserved.
        </p>
      </div>
      </div>
    </div>
  );
};

export default AdminLogin;
