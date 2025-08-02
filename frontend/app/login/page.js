"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { user, loginUser } = useAuth();

  // Redirect jika sudah login
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const res = await fetch("websitepkl-production.up.railway.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message);
    } else {
      localStorage.setItem("token", data.token);
      loginUser(data.token); // cukup ini saja
      // Hapus router.push('/') dan router.refresh()
      // Redirect otomatis oleh useEffect di atas
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-green-100">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-blue-100"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">
          Login PKL Porto
        </h2>
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-100 p-2 rounded">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="username"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
            autoComplete="username"
            placeholder="Masukkan username"
          />
        </div>
        <div className="mb-6 relative">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
            required
            autoComplete="current-password"
            placeholder="Masukkan password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-blue-500"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow focus:outline-none focus:shadow-outline transition-all"
        >
          Masuk
        </button>
      </form>
    </div>
  );
}
