"use client";

import Head from "next/head";
import Link from "next/link";
import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import { registerWithEmail, loginWithGoogle } from "@/lib/firebaseConfig";

type Mode = "idle" | "loading" | "error";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function parseFirebaseError(error: any): string {
    const code = error?.code || '';
    const message = error?.message || '';

    // Log the error for debugging
    console.error('Firebase Auth Error:', { code, message, error });

    switch (code) {
      case 'auth/email-already-in-use':
        return 'Email sudah terdaftar. Gunakan email lain atau coba login.';
      case 'auth/invalid-email':
        return 'Format email tidak valid.';
      case 'auth/weak-password':
        return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
      case 'auth/operation-not-allowed':
        return 'Registrasi dengan email dan password tidak diizinkan.';
      case 'auth/network-request-failed':
        return 'Gagal menghubungi server. Periksa koneksi internet Anda.';
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan registrasi. Silakan coba lagi nanti.';
      default:
        if (message && message.includes('Firebase')) {
          return 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.';
        }
        return message || 'Terjadi kesalahan yang tidak diketahui.';
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setErrorMsg("Password tidak cocok");
      setMode("error");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password minimal 6 karakter");
      setMode("error");
      return;
    }

    setMode("loading");
    try {
      await registerWithEmail(email, password, name);
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
        <title>Register — Hydrant Monitor</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="bg">
        <div className="wrapper">

          {/* LEFT */}
          <div className="left">
            <div className="overlay">
              <div className="textBox">
                <h1>Hydrant Monitor</h1>
                <p>
                  Buat akun untuk mulai monitoring sistem hydrant secara real-time
                  dengan teknologi modern.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right">
            <div className="card">

              <h2>Register</h2>

              {mode === "error" && (
                <div className="error">{errorMsg}</div>
              )}

              <form onSubmit={handleRegister}>
                <div className="field">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <label>Nama</label>
                </div>

                <div className="field">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label>Email</label>
                </div>

                <div className="field">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <label>Password</label>
                </div>

                <div className="field">
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  <label>Konfirmasi Password</label>
                </div>

                <button className="btn">
                  {mode === "loading" ? "Loading..." : "DAFTAR"}
                </button>
              </form>

              <div className="divider">atau</div>

              <button className="google" onClick={loginWithGoogle}>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" />
                Daftar dengan Google
              </button>

              <p className="login">
                Sudah punya akun?{" "}
                <Link href="/auth/login">
                  <span>Masuk</span>
                </Link>
              </p>

            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        * {
          font-family: "Poppins", sans-serif;
        }

        .bg {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ffffff, #ffffff);
        }

        .wrapper {
          width: 950px;
          height: 540px;
          display: flex;
          border-radius: 20px;
          overflow: hidden;
          background: white;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.15);
        }

        /* LEFT */
        .left {
          flex: 1;
          background: url("https://firecek.com/wp-content/uploads/2023/07/tugas-regu-pemadam-kebakaran-di-indonesia.webp")
            center/cover no-repeat;
          position: relative;
        }

        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          padding: 2rem;
        }

        .textBox {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          padding: 1.5rem;
          border-radius: 12px;
        }

        .overlay h1 {
          color: white;
          font-weight: 400;
          margin-bottom: 10px;
          text-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }

        .overlay p {
          color: white;
          font-size: 0.9rem;
          text-shadow: 0 3px 8px rgba(0,0,0,0.5);
        }

        /* RIGHT */
        .right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        /* CARD */
        .card {
          width: 340px;
          max-height: 420px;
          padding: 2rem;
          border-radius: 16px;
          background: white;
          box-shadow: 0 20px 50px rgba(0,0,0,0.12);
          text-align: center;
          overflow-y: auto;
        }

        .card::-webkit-scrollbar {
          width: 6px;
        }

        .card::-webkit-scrollbar-thumb {
          background: #fca5a5;
          border-radius: 10px;
        }

        h2 {
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        form {
          display: flex;
          flex-direction: column;
        }

        .field {
          position: relative;
          margin-bottom: 1.2rem;
        }

        .field input {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #ccc;
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
          color: #d61f1f;
        }

        .btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #d61f1f, #8f0d0d);
          border: none;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 10px;
          transition: 0.2s;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(214,31,31,0.4);
        }

        .google {
          width: 100%;
          margin-top: 10px;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ccc;
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

        .login span {
          color: #d61f1f;
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

          .card {
            max-height: none;
          }
        }
      `}</style>
    </>
  );
}