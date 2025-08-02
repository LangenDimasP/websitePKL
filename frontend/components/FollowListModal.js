"use client";

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";

const API_URL = "websitepkl-production.up.railway.app";

export default function FollowListModal({ title, users, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm h-[60vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Daftar Pengguna (Scrollable) */}
        <div className="flex-grow overflow-y-auto">
          {users.length > 0 ? (
            <div className="divide-y">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/profil/${user.username}`}
                  onClick={onClose}
                >
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
          ) : (
            <p className="text-center text-gray-500 p-8">
              Tidak ada pengguna untuk ditampilkan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
