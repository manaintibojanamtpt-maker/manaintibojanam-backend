import { useState, useEffect, useCallback } from 'react';
import { BiometricService } from '../services/biometric.service';
import { BiometryType } from 'capacitor-native-biometric';
import { useAuth } from '../context/AuthContext';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

export const useBiometrics = () => {
  const { currentUser, login } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType | string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const supported = await BiometricService.isAvailable();
      const enabled = await BiometricService.isEnabled();
      const type = await BiometricService.getBiometryType();
      
      setIsSupported(supported);
      setIsEnabled(enabled);
      setBiometryType(type);
      
      return { supported, enabled, type };
    } catch (e) {
      console.error("Error checking biometric status:", e);
      return { supported: false, enabled: false, type: null };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  /**
   * Enroll the current user for biometrics
   */
  const enroll = async () => {
    if (!currentUser) {
      toast.error('Please log in first to enable biometrics.');
      return false;
    }
    
    setEnrollLoading(true);
    try {
      const success = await BiometricService.enroll(currentUser.uid, currentUser.email || undefined);
      if (success) {
        setIsEnabled(true);
        toast.success('Biometrics enabled successfully!');
      }
      return success;
    } catch (e: any) {
      console.error('Enrollment error:', e);
      toast.error(e.message || 'Could not enable biometrics.');
      return false;
    } finally {
      setEnrollLoading(false);
    }
  };

  /**
   * Authenticate using biometrics and sign in to Firebase
   */
  const authenticate = async () => {
    setLoading(true);
    try {
      const result = await BiometricService.authenticate();
      if (result) {
        const userCredential = await signInWithCustomToken(auth, result.token);
        if (userCredential.user) {
          login(userCredential.user);
          return true;
        }
      }
    } catch (e) {
      console.error("Biometric auth error:", e);
      toast.error('Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
    return false;
  };

  /**
   * Disable biometrics and clear credentials
   */
  const disable = async () => {
    setDisableLoading(true);
    try {
      await BiometricService.clearCredentials();
      setIsEnabled(false);
      toast.success('Biometric authentication disabled.');
      return true;
    } catch (e) {
      toast.error('Failed to disable biometrics.');
      return false;
    } finally {
      setDisableLoading(false);
    }
  };

  return {
    isSupported,
    isEnabled,
    biometryType,
    loading,
    enrollLoading,
    disableLoading,
    enroll,
    authenticate,
    disable,
    refreshStatus: checkStatus
  };
};
