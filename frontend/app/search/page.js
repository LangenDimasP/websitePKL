// File: frontend/app/search/page.js
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = "websitepkl-production.up.railway.app";

export default function SearchPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim() === "") {
        setResults([]);
        return;
      }

      const searchUsers = async () => {
        setIsLoading(true);
        try {
          // DIUBAH: Siapkan header secara dinamis
          const headers = {};
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch(`${API_URL}/api/users/search?q=${query}`, {
            headers,
          });
          const data = await res.json();
          if (res.ok) {
            setResults(data);
          }
        } catch (err) {
          console.error("Gagal melakukan pencarian:", err);
        } finally {
          setIsLoading(false);
        }
      };

      searchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, token]);

  return (
    <div className="container mx-auto max-w-xl py-10 px-4">
      <button
        onClick={() => router.back()}
        className="mb-4 bg-transparent flex items-center gap-2 cursor-pointer"
        style={{ border: "none" }}
      >
        <span style={{ fontSize: "1.2em" }}>&larr;</span>
        <span>Kembali</span>
      </button>
      <h1 className="text-3xl font-bold mb-6">Cari Pengguna</h1>
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ketik nama atau username..."
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-blue-600 font-semibold">Memuat...</p>
          </div>
        )}

        {!isLoading && query && results.length === 0 && (
          <p className="p-4 text-center text-gray-500">
            Pengguna tidak ditemukan.
          </p>
        )}

        <div className="divide-y">
          {results.map((user) => (
            <Link key={user.id} href={`/profil/${user.username}`}>
              <div className="flex items-center space-x-4 p-4 hover:bg-gray-50 transition-colors">
                <img
                  src={
                    user.profile_picture_url &&
                    user.profile_picture_url !== "" &&
                    user.profile_picture_url !== "default_profile.png"
                      ? `${API_URL}${user.profile_picture_url}`
                      : "/default_profile.png"
                  }
                  alt={user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center">
                    <p className="font-bold">{user.username}</p>
                    {user.is_verified && (
                      <img
                        src="/verified-badge.webp"
                        alt="Verified"
                        className="w-4 h-4 ml-1"
                      />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{user.full_name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
