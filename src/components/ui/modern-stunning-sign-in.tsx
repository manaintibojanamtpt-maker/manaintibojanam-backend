"use client";

import * as React from "react";
import { useState } from "react";
import BhojanOSLogo from "../BhojanOSLogo";

export interface ModernStunningSignInProps {
  title?: React.ReactNode;
  subtitle?: string;
  email?: string;
  setEmail?: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  error?: string | null;
  loading?: boolean;
  onSignIn?: (e?: React.FormEvent) => void;
  onGoogleSignIn?: () => void;
  onSignUpClick?: () => void;
  signUpHref?: string;
  signUpText?: string;
  socialProofText?: React.ReactNode;
  className?: string;
}

const SignIn1 = ({
  title,
  subtitle,
  email: controlledEmail,
  setEmail: setControlledEmail,
  password: controlledPassword,
  setPassword: setControlledPassword,
  error: controlledError,
  loading = false,
  onSignIn,
  onGoogleSignIn,
  onSignUpClick,
  signUpHref = "/owner/register",
  signUpText = "Sign up, it's free!",
  socialProofText,
  className = "",
}: ModernStunningSignInProps = {}) => {
  const [internalEmail, setInternalEmail] = useState("");
  const [internalPassword, setInternalPassword] = useState("");
  const [internalError, setInternalError] = useState("");

  const email = controlledEmail !== undefined ? controlledEmail : internalEmail;
  const setEmail = setControlledEmail || setInternalEmail;
  const password = controlledPassword !== undefined ? controlledPassword : internalPassword;
  const setPassword = setControlledPassword || setInternalPassword;
  const error = controlledError !== undefined ? controlledError : internalError;

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSignIn) {
      onSignIn(e);
      return;
    }
    if (!email || !password) {
      setInternalError("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setInternalError("Please enter a valid email address.");
      return;
    }
    setInternalError("");
    alert("Sign in successful! (Demo)");
  };

  const handleGoogleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onGoogleSignIn) {
      onGoogleSignIn();
    } else {
      alert("Google sign-in clicked! (Demo)");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-[#121212] relative overflow-hidden w-full rounded-xl px-4 py-8 ${className}`}>
      {/* Ambient background glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#D97706]/10 blur-[120px] pointer-events-none -z-0" 
        aria-hidden="true" 
      />

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-gradient-to-r from-[#ffffff10] to-[#121212] backdrop-blur-md shadow-2xl p-8 flex flex-col items-center border border-white/10">
        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5 shadow-lg border border-white/15 p-2 transition-transform duration-300 hover:scale-105">
          <BhojanOSLogo size={36} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-1 text-center tracking-tight">
          {title || (
            <span>
              Bhojan<span className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] bg-clip-text text-transparent">OS</span>
            </span>
          )}
        </h2>
        {subtitle ? (
          <p className="text-xs text-zinc-400 mb-6 text-center">{subtitle}</p>
        ) : (
          <p className="text-xs text-zinc-400 mb-6 text-center">Restaurant Operations &amp; Direct Ordering</p>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Email address"
              type="email"
              required
              value={email}
              autoComplete="email"
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706] border border-white/10 transition-all font-medium"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              required
              value={password}
              autoComplete="current-password"
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706] border border-white/10 transition-all font-medium"
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <div role="alert" className="text-xs text-red-400 text-left bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                {error}
              </div>
            )}
          </div>

          <hr className="opacity-10 border-white" />

          <div>
            <button
              type="submit"
              disabled={loading}
              onClick={handleSignIn}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-3 rounded-full shadow hover:shadow-lg transition mb-3 text-sm cursor-pointer border border-white/15 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>

            {/* Google Sign In */}
            <button 
              type="button"
              disabled={loading}
              onClick={handleGoogleClick}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-b from-[#232526] to-[#2d2e30] hover:brightness-125 rounded-full px-5 py-3 font-medium text-white shadow transition mb-2 text-sm cursor-pointer border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img
                src="https://cdn.21st.dev/assets/mirror/38/38146bfd9eff6dbf0d74771f2e625c70d87d3770e0d080dbb6e50db1d5403f46.svg"
                alt="Google"
                className="w-5 h-5 shrink-0"
              />
              <span>Continue with Google</span>
            </button>

            <div className="w-full text-center mt-3">
              <span className="text-xs text-gray-400">
                Don&apos;t have an account?{" "}
                {onSignUpClick ? (
                  <button
                    type="button"
                    onClick={onSignUpClick}
                    className="underline text-white/80 hover:text-white cursor-pointer ml-1"
                  >
                    {signUpText}
                  </button>
                ) : (
                  <a
                    href={signUpHref}
                    className="underline text-white/80 hover:text-white cursor-pointer ml-1"
                  >
                    {signUpText}
                  </a>
                )}
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* User count and avatars */}
      <div className="relative z-10 mt-10 flex flex-col items-center text-center max-w-sm">
        <p className="text-gray-400 text-sm mb-3">
          {socialProofText || (
            <span>
              Join over <span className="font-semibold text-white">1,200+</span> restaurant owners &amp; cloud kitchens scaling with Bhojan<span className="text-[#F59E0B] font-bold">OS</span>.
            </span>
          )}
        </p>
        <div className="flex -space-x-2 overflow-hidden items-center justify-center py-1">
          <img
            src="https://cdn.21st.dev/assets/mirror/a6/a634d4f02fe5b77804943c1d74b8d70e35ffe26454e0e9af9717432a2c72bfde.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/d8/d8dab29a5736d5c2b0084d720d3db02c785560071609be501541922928fdf831.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/d1/d1a3e08d4e37d6ee2b7de1db8df87c1dc7acd8ffb004caaf980917de518a60c9.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
          <img
            src="https://cdn.21st.dev/assets/mirror/f0/f07b84f12ef125cbb837a7bd64da401992f5f62bd55fee10d01cd3dcc8abae80.jpg"
            alt="Restaurant owner"
            className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover ring-1 ring-white/10"
          />
        </div>
      </div>
    </div>
  );
};

export { SignIn1, SignIn1 as ModernStunningSignIn };
export default SignIn1;
