"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-white px-4 py-8">
      <img
        src="/404-illustration.webp"
        alt="404"
        className="w-32 h-32 sm:w-56 sm:h-56 mb-6 object-contain"
      />
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-700 mb-2 text-center">
        404 - Halaman Tidak Ditemukan
      </h1>
      <p className="text-base sm:text-lg text-gray-600 mb-6 text-center">
        Maaf, halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <button
        onClick={() => router.back()}
        className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition w-full max-w-xs"
      >
        Kembali
      </button>
    </div>
  );
}