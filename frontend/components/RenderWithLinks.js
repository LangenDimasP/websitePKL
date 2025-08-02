// File: frontend/components/RenderWithLinks.js
import Link from 'next/link';

export default function RenderWithLinks({ text }) {
    if (!text) return null;
    
    // Regex untuk menemukan @username
    const mentionRegex = /@(\w+)/g;
    // Pisahkan teks menjadi bagian-bagian: teks biasa dan username
    const parts = text.split(mentionRegex);

    // DIUBAH: Gunakan React Fragment (<>) agar tidak membuat tag <p> baru.
    // Ini membuatnya menjadi komponen fleksibel yang bisa diletakkan di dalam teks lain.
    return (
        <>
            {parts.map((part, index) => {
                // Cek jika 'part' adalah username yang ditangkap oleh regex (selalu di indeks ganjil)
                if (index % 2 === 1) { 
                    return (
                        <Link key={index} href={`/profil/${part}`} className="text-blue-500 hover:underline">
                            @{part}
                        </Link>
                    );
                }
                // Jika bukan, kembalikan sebagai teks biasa
                return part;
            })}
        </>
    );
}
