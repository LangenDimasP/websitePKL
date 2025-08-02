'use client';

import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
    Bars3Icon, 
    XMarkIcon, 
    BellIcon, 
    MagnifyingGlassIcon,
    HomeIcon,
    PlusCircleIcon,
    UserIcon
} from '@heroicons/react/24/outline';

const API_URL = "websitepkl-production.up.railway.app";

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, token, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showLogos, setShowLogos] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    // Notification fetch effect
    React.useEffect(() => {
        const fetchNotifCount = async () => {
            if (token) {
                try {
                    const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setNotificationCount(data.count);
                    }
                } catch (error) {
                    console.error("Gagal mengambil jumlah notifikasi:", error);
                }
            }
        };

        fetchNotifCount();
        const notifInterval = setInterval(fetchNotifCount, 30000);
        return () => clearInterval(notifInterval);
    }, [token]);

    // Logo animation effect
    React.useEffect(() => {
        const logoInterval = setInterval(() => {
            setShowLogos(prev => !prev);
        }, 3000);

        return () => clearInterval(logoInterval);
    }, []);

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        router.push('/login');
    };

    return (
        <>
            {/* Top Navbar */}
            <nav className="bg-white shadow-md sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                                <div className="flex-shrink-0 relative">
                                    <Link href="/" className="text-2xl font-bold text-blue-600 flex items-center">
                                        PKL
                                        <div className={`flex items-center transition-all duration-1000 ease-in-out overflow-hidden ${
                                            showLogos ? 'opacity-100 max-w-[200px] ml-2' : 'opacity-0 max-w-0 ml-0'
                                        }`}>
                                            <img 
                                                src="/Logo_SMK_Negeri_40_Jakarta.png"
                                                alt="SMKN 40"
                                                className="h-8 w-8 mx-1 transition-transform duration-1000"
                                            />
                                            <span className="text-gray-500 mx-1 whitespace-nowrap">×</span>
                                            <img 
                                                src="/perpusjkt_logo.png"
                                                alt="Perpusnas"
                                                className="h-7 w-auto mx-1 transition-transform duration-1000"
                                            />
                                        </div>
                                    </Link>
                                </div>

                        {/* Navigasi Desktop */}
                        <div className="hidden md:flex md:items-center md:space-x-6">
                          {user ? (
                            <>
                           <Link
  href="/create"
  className={`group relative border border-gray-300 rounded-lg transition-all duration-300
    ${pathname === "/create" ? "bg-blue-50 border-blue-600 w-45" : "bg-white w-12 hover:w-45 hover:border-blue-600"}
    h-12 overflow-hidden flex items-center`}
  style={{ minWidth: "3rem" }}
>
  <span
    className={`absolute transition-all duration-300 flex items-center justify-center h-8 w-8 rounded
      ${pathname === "/create" ? "left-2 top-2 text-blue-600" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black group-hover:text-blue-600 group-hover:left-2 group-hover:top-2 group-hover:translate-x-0 group-hover:translate-y-0"}`}
    style={{
      zIndex: 2,
      transition: "all 0.3s"
    }}
  >
    <PlusCircleIcon className="h-6 w-6" />
  </span>
  <span
    className={`ml-12 font-medium whitespace-nowrap transition-all duration-300
      ${pathname === "/create" ? "opacity-100 text-blue-600" : "opacity-0 text-black group-hover:opacity-100 group-hover:text-blue-600"}`}
    style={{
      zIndex: 1,
      transition: "all 0.3s"
    }}
  >
    Buat Postingan
  </span>
</Link>
                            <Link
                              href="/search"
                              className={`text-gray-600 hover:text-blue-500 ${pathname === "/search" ? "text-blue-600 font-bold" : ""}`}
                              title="Cari"
                            >
                              <MagnifyingGlassIcon className={`h-6 w-6 ${pathname === "/search" ? "text-blue-600" : ""}`} />
                            </Link>
                            <Link
                              href="/notifications"
                              className={`relative text-gray-600 hover:text-blue-500 ${pathname === "/notifications" ? "text-blue-600 font-bold" : ""}`}
                              title="Notifikasi"
                            >
                              <BellIcon className={`h-6 w-6 ${pathname === "/notifications" ? "text-blue-600" : ""}`} />
                              {notificationCount > 0 && (
                                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                  {notificationCount}
                                </span>
                              )}
                            </Link>
                            <Link
                              href={`/profil/${user.username}`}
                              className={`flex items-center gap-2 font-medium transition-colors ${
                                pathname === `/profil/${user.username}`
                                  ? "text-blue-600 font-bold"
                                  : "text-gray-600 hover:text-blue-500"
                              }`}
                            >
                              <img
                                src={
                                  user.profile_picture_url && user.profile_picture_url !== "default_profile.png"
                                    ? `${API_URL}${user.profile_picture_url}`
                                    : "/default_profile.png"
                                }
                                alt={user.username}
                                className={`w-8 h-8 rounded-full border ${pathname === `/profil/${user.username}` ? "border-blue-600" : "border-gray-300"}`}
                              />
                            </Link>
                              <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-600 transition-colors">
                                Logout
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                href="/search"
                                className={`text-gray-600 hover:text-blue-500 ${pathname === "/search" ? "text-blue-600 font-bold" : ""}`}
                                title="Cari"
                              >
                                <MagnifyingGlassIcon className="h-6 w-6" />
                              </Link>
                              <Link
                                href="/login"
                                className={`text-gray-600 hover:text-blue-500 font-medium transition-colors ${
                                  pathname === "/login" ? "text-blue-600 font-bold" : ""
                                }`}
                              >
                                Login
                              </Link>
                            </>
                          )}
                        </div>

                        {/* Ikon Mobile (hanya search, notifikasi, dan hamburger) */}
                        <div className="md:hidden flex items-center">
                            {user && (
                                <div className="flex items-center space-x-4 mr-2">
                                    <Link href="/search" className="text-gray-600 hover:text-blue-500" title="Cari">
                                        <MagnifyingGlassIcon className="h-6 w-6" />
                                    </Link>
                                    <Link href="/notifications" className="relative text-gray-600 hover:text-blue-500" title="Notifikasi">
                                        <BellIcon className="h-6 w-6" />
                                        {notificationCount > 0 && (
                                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                                {notificationCount}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            )}
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                                <span className="sr-only">Buka menu</span>
                                {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Menu Dropdown Mobile */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-200">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {user ? (
                                <>
                                    <Link href="/settings/profile" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Edit Profil</Link>
                                    <button onClick={handleLogout} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50">
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href="/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50">Login</Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Bottom Navigation untuk Mobile (hanya tampil jika user login) */}
            {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
            <div className="flex items-center justify-around py-2">
                {/* Beranda */}
                <Link
                    href="/"
                    className={`flex flex-col items-center p-2 transition-colors ${
                        pathname === "/" ? "text-blue-500" : "text-gray-600 hover:text-blue-500"
                    }`}
                >
                    <HomeIcon className={`h-6 w-6 ${pathname === "/" ? "text-blue-500" : ""}`} />
                    <span className={`text-xs mt-1 ${pathname === "/" ? "text-blue-500 font-bold" : ""}`}>Beranda</span>
                </Link>

                {/* Buat Postingan */}
                <Link
                    href="/create"
                    className={`flex flex-col items-center p-2 transition-colors ${
                        pathname === "/create" ? "text-blue-500" : "text-gray-600 hover:text-blue-500"
                    }`}
                >
                    <PlusCircleIcon className={`h-6 w-6 ${pathname === "/create" ? "text-blue-500" : ""}`} />
                    <span className={`text-xs mt-1 ${pathname === "/create" ? "text-blue-500 font-bold" : ""}`}>Buat</span>
                </Link>

                {/* Profil Saya */}
                <Link
                    href={`/profil/${user.username}`}
                    className={`flex flex-col items-center p-2 transition-colors ${
                        pathname === `/profil/${user.username}` ? "text-blue-500" : "text-gray-600 hover:text-blue-500"
                    }`}
                >
                    <UserIcon className={`h-6 w-6 ${pathname === `/profil/${user.username}` ? "text-blue-500" : ""}`} />
                    <span className={`text-xs mt-1 ${pathname === `/profil/${user.username}` ? "text-blue-500 font-bold" : ""}`}>Profil</span>
                </Link>
            </div>
        </div>
    )}

        </>
    );
}