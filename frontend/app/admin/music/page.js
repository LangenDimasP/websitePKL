// File: frontend/app/admin/music/page.js (Buat folder & file baru ini)
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_URL = "https://arsipklrpl4025.my.id/backend";

export default function UploadMusicPage() {
  const { user, token, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!title || !artist || !audioFile) {
      setError("Semua kolom wajib diisi.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("artist", artist);
    formData.append("audioFile", audioFile);

    try {
      const res = await fetch(`${API_URL}/api/songs/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage("Lagu berhasil diunggah!");
      // Kosongkan form
      setTitle("");
      setArtist("");
      e.target.reset();
    } catch (err) {
      setError(err.message);
    }
  };
  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto max-w-lg py-10 text-center">
        <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
        <p className="mt-2 text-gray-600">
          Halaman ini hanya dapat diakses oleh Administrator.
        </p>
      </div>
    );
  }

  // Tampilkan form hanya jika pengguna adalah admin
  return (
    <div className="container mx-auto max-w-lg py-10">
      <h1 className="text-3xl font-bold mb-6">Unggah Lagu Baru</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md space-y-4"
      >
        {message && <p className="text-green-600">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
        <div>
          <label htmlFor="title">Judul Lagu</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
        <div>
          <label htmlFor="artist">Nama Artis/Penyanyi</label>
          <input
            type="text"
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
        <div>
          <label htmlFor="audioFile">File Audio (MP3)</label>
          <input
            type="file"
            id="audioFile"
            accept="audio/mpeg"
            onChange={(e) => setAudioFile(e.target.files[0])}
            className="w-full mt-1"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded"
        >
          Unggah
        </button>
      </form>
    </div>
  );
}
