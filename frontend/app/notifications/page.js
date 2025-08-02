"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = "https://websitepkl-production.up.railway.app";

// Helper function untuk membuat pesan notifikasi
const generateNotificationMessage = (notif) => {
  switch (notif.type) {
    case "like":
      return <>menyukai postingan Anda.</>;
    case "comment":
      return <>mengomentari postingan Anda.</>;
    case "follow":
      return <>mulai mengikuti Anda.</>;
    default:
      return <>berinteraksi dengan Anda.</>;
  }
};

export default function NotificationsPage() {
  const { token, loading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setNotifications(data);
      } catch (err) {
        console.error("Gagal memuat notifikasi:", err);
      }
    };

    const markAsRead = async () => {
      try {
        await fetch(`${API_URL}/api/notifications/mark-read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Gagal menandai notifikasi:", err);
      }
    };

    fetchNotifications();
    markAsRead(); // Tandai terbaca saat halaman dibuka
  }, [token]);

  // --- FILTER NOTIFIKASI LIKE AGAR HANYA SATU PER USER PER POST (YANG TERBARU) ---
  const filteredNotifications = [];
  const likeMap = new Map();

  notifications.forEach((notif) => {
    if (notif.type === "like") {
      const key = `${notif.actor_username}_${notif.post_id}`;
      // Simpan hanya yang terbaru
      if (
        !likeMap.has(key) ||
        new Date(notif.created_at) > new Date(likeMap.get(key).created_at)
      ) {
        likeMap.set(key, notif);
      }
    } else {
      filteredNotifications.push(notif);
    }
  });

  // Gabungkan notifikasi "like" yang sudah difilter
  filteredNotifications.push(...Array.from(likeMap.values()));

  // Urutkan berdasarkan waktu terbaru
  filteredNotifications.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
        <p className="text-blue-600 font-semibold">Memuat...</p>
      </div>
    );

  return (
    <div className="container mx-auto max-w-2xl py-10 px-4">
      <button
        onClick={() => router.back()}
        className="mb-4 bg-transparent flex items-center gap-2 cursor-pointer"
        style={{ border: "none" }}
      >
        <span style={{ fontSize: "1.2em" }}>&larr;</span>
        <span>Kembali</span>
      </button>
      <h1 className="text-3xl font-bold mb-6">Notifikasi</h1>
      <div className="bg-white p-4 rounded-lg shadow-md space-y-2">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <Link
              key={notif.id}
              href={
                (notif.type === "like" || notif.type === "comment") &&
                notif.post_slug
                  ? `/p/${notif.post_slug}`
                  : `/profil/${notif.actor_username}`
              }
              className="block"
            >
              <div
                className={`p-3 rounded-md flex items-center justify-between space-x-4 ${
                  !notif.is_read ? "bg-blue-50" : ""
                } hover:bg-gray-50 transition`}
              >
                {/* Kiri: Avatar user yang berinteraksi */}
                <div className="flex items-center space-x-4">
                  <img
                    src={`${API_URL}${notif.actor_avatar}`}
                    alt={notif.actor_username}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/profil/${notif.actor_username}`;
                    }}
                  />
                  <p className="text-sm">
                    <span
                      className="font-bold cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/profil/${notif.actor_username}`;
                      }}
                    >
                      {notif.actor_username}
                    </span>{" "}
                    {generateNotificationMessage(notif)}
                    <span className="text-xs text-gray-500 block mt-1">
                      {new Date(notif.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                </div>
                {/* Kanan: Gambar postingan jika ada */}
                {(notif.type === "like" || notif.type === "comment") &&
                  notif.post_image_url && (
                    <img
                      src={`${API_URL}${notif.post_image_url}`}
                      alt="Gambar Postingan"
                      className="w-14 h-14 rounded-md object-cover ml-2"
                    />
                  )}
              </div>
            </Link>
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">
            Tidak ada notifikasi.
          </p>
        )}
      </div>
    </div>
  );
}
