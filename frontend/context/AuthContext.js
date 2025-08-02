"use client";

import { createContext, useState, useEffect, useContext } from "react";
import { jwtDecode } from "jwt-decode";

const API_URL = "websitepkl-production.up.railway.app";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      try {
        const decodedUser = jwtDecode(storedToken);
        setUser(decodedUser);
        setToken(storedToken);
        // Fetch detail user jika token valid
        fetchUserDetail(decodedUser.username, storedToken);
      } catch (error) {
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  // Fungsi untuk fetch detail user dari API
  async function fetchUserDetail(username, token) {
    if (!username || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const userDetail = await res.json();
        setUser((prev) => ({ ...prev, ...userDetail.user }));
      }
    } catch (error) {
      // Optional: handle error
    }
  }

  // Fungsi loginUser agar bisa dipanggil setelah login
  const loginUser = async (newToken) => {
    if (!newToken) return;
    localStorage.setItem("token", newToken);
    try {
      const decodedUser = jwtDecode(newToken);
      setUser(decodedUser);
      setToken(newToken);
      // Fetch detail user setelah login
      await fetchUserDetail(decodedUser.username, newToken);
    } catch (error) {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  const authValue = { user, token, loginUser, logout, loading };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
