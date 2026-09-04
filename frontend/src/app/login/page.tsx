"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./login.module.css";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (username.trim() === "" || password.trim() === "") {
      alert("Cannot be empty");
      return;
    }
    
    if (!auth) {
      alert("Firebase is not configured! Please add your Firebase config to .env.local");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, username, password);
      router.push("/dashboard");
    } catch (err: any) {
      alert("Login Error: " + err.message);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase is not configured! Please add your Firebase config to .env.local");
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err: any) {
      alert("Google Login Error: " + err.message);
    }
  };

  return (
    <>
      <div className={styles.pageWrapper}>
        <div className={styles.background}>
          <div className={styles.bgImage} />
          <div className={styles.orb1} />
          <div className={styles.orb2} />
        </div>

        <div className={styles.formBox}>
          <div className={styles.header}>
            <div className={styles.logo}>S</div>
            <h2>Admin Login</h2>
            <div className={styles.subtitle}>SkillX Sovereign Intelligence Platform</div>
          </div>

          <form onSubmit={handleEmailLogin}>
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="officer@dvet.gov.in"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className={styles.btn}>Sign In</button>

            <div className={styles.divider}>OR</div>

            <button type="button" onClick={handleGoogleLogin} className={styles.googleBtn}>
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

            <div className={styles.buttonGroup}>
              <button type="button" onClick={() => router.push("/forgot-password")}>
                Forgot Password?
              </button>
              <button type="button" onClick={() => router.push("/signup")}>
                Request Access
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
