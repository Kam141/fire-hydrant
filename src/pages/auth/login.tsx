"use client";

import Head from "next/head";
import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import { loginWithEmail, loginWithGoogle } from "@/lib/firebaseConfig";
import Link from "next/link";

type AuthMode = "idle" | "loading" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function parseFirebaseError(error: any): string {
    const code = error?.code || '';
    const message = error?.message || '';

    // Log the error for debugging
    console.error('Firebase Auth Error:', { code, message, error });

    switch (code) {
      case 'auth/user-not-found':
        return 'Email tidak terdaftar. Silakan daftar terlebih dahulu.';
      case 'auth/wrong-password':
        return 'Password salah. Silakan coba lagi.';
      case 'auth/invalid-email':
        return 'Format email tidak valid.';
      case 'auth/user-disabled':
        return 'Akun ini telah dinonaktifkan.';
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan login yang gagal. Silakan coba lagi nanti.';
      case 'auth/invalid-credential':
        return 'Email atau password salah.';
      case 'auth/operation-not-allowed':
        return 'Login dengan email dan password tidak diizinkan.';
      case 'auth/network-request-failed':
        return 'Gagal menghubungi server. Periksa koneksi internet Anda.';
      default:
        // If we have a message but no matching code, show it
        if (message && message.includes('Firebase')) {
          return 'Terjadi kesalahan saat login. Silakan coba lagi.';
        }
        return message || 'Terjadi kesalahan yang tidak diketahui.';
    }
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setMode("loading");
    try {
      await loginWithEmail(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      const errorMessage = parseFirebaseError(err);
      setErrorMsg(errorMessage);
      setMode("error");
    }
  }

  async function handleGoogleLogin() {
    setMode("loading");
    try {
      await loginWithGoogle();
      router.replace("/dashboard");
    } catch (err: any) {
      const errorMessage = parseFirebaseError(err);
      setErrorMsg(errorMessage);
      setMode("error");
    }
  }

  return (
    <>
      <Head>
        <title>Login — Hydrant Monitor</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet"/>
      </Head>

      <div className="bg">
        {/* decorative gradient circles */}
        <div className="circle top"></div>
        <div className="circle bottom"></div>

        <div className="wrapper">

          {/* LEFT IMAGE */}
          <div className="left">
            <div className="overlay">
              <div className="textCard">
                <h1>Hydrant Monitor</h1>
                <p>
                  Monitoring sistem hydrant secara real-time dengan teknologi modern dan respons cepat.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right">
            <div className="card">
              <h2>Sign In</h2>

              {mode === "error" && <div className="error">{errorMsg}</div>}

              <form onSubmit={handleEmailLogin}>
                <div className="field">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <label>Email</label>
                </div>

                <div className="field">
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <label>Password</label>
                </div>

                <button className="btn">
                  {mode === "loading" ? "Loading..." : "MASUK"}
                </button>
              </form>

              <div className="divider">atau</div>

              <button className="google" onClick={handleGoogleLogin}>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg"/>
                Login dengan Google
              </button>

              <p className="register">
                Belum punya akun?{" "}
                <Link href="/auth/register">
                  <span>Daftar</span>
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        * { font-family: 'Poppins', sans-serif; }

        .bg {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ffffff, #ffffff);
          position: relative;
          overflow: hidden;
        }

        /* gradient circles */
        .circle {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, #f87171, transparent);
          filter: blur(100px);
          opacity: 0.5;
        }

        .top {
          top: -80px;
          right: -80px;
        }

        .bottom {
          bottom: -80px;
          left: -80px;
        }

        .wrapper {
          width: 900px;
          height: 500px;
          display: flex;
          border-radius: 20px;
          overflow: hidden;
          background: white;
          box-shadow: 0 25px 60px rgba(0,0,0,0.15);
          z-index: 1;
        }

        .left {
          flex: 1;
          background: url("https://surabaya.proxsisgroup.com/wp-content/uploads/2019/01/Bahan-Bahan-Pemadam-Kebakaran-Web.jpg") center/cover no-repeat;
          position: relative;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .textCard {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 12px;
          color: white;
          text-align: left;
        }

        .textCard h1 {
          font-weight: 400;
          margin-bottom: 10px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .textCard p {
          font-size: 0.9rem;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }

        .right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
        }

        .card {
          width: 320px;
          padding: 2rem;
          border-radius: 16px;
          background: white;
          box-shadow:
            0 10px 25px rgba(0,0,0,0.1),
            inset 0 1px 0 rgba(255,255,255,0.6);
          text-align: center;
          transition: 0.3s;
        }

        .card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 20px 40px rgba(0,0,0,0.15),
            inset 0 1px 0 rgba(255,255,255,0.6);
        }

        h2 {
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        .field {
          position: relative;
          margin-bottom: 1.2rem;
        }

        .field input {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #ddd;
          outline: none;
        }

        .field label {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: white;
          padding: 0 5px;
          font-size: 0.8rem;
          color: #888;
          transition: 0.2s;
        }

        .field input:focus + label,
        .field input:valid + label {
          top: -8px;
          font-size: 0.7rem;
          color: #ef4444;
        }

        .btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          border: none;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 10px;
          transition: 0.2s;
        }

        .btn:hover {
          transform: translateY(-2px);
        }

        .google {
          width: 100%;
          margin-top: 10px;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: white;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .google img {
          width: 18px;
        }

        .divider {
          margin: 10px 0;
        }

        .register span {
          color: #ef4444;
          font-weight: 500;
        }

        .error {
          color: red;
          margin-bottom: 10px;
        }

        @media (max-width: 768px) {
          .wrapper {
            flex-direction: column;
            width: 90%;
            height: auto;
          }

          .left {
            height: 200px;
          }
        }
      `}</style>
    </>
  );
}