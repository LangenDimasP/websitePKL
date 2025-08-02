"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PostModal from "@/components/PostModal";
import {
  Squares2X2Icon,
  FilmIcon,
  MapPinIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/solid";


const API_URL = "https://websitepkl-production.up.railway.app";

const PostGridItem = ({ post, onPostClick }) => (
  <div
    className="relative w-full aspect-square bg-gray-200 cursor-pointer group overflow-hidden rounded-lg"
    onClick={() => onPostClick(post)}
  >
    {post.media?.[0] ? (
      post.media[0].type === "video" ? (
        <video
          src={`${API_URL}${post.media[0].url}#t=0.1`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          preload="metadata"
        />
      ) : (
        <img
          src={`${API_URL}${post.media[0].url}`}
          alt={post.caption}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )
    ) : (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500">No media</span>
      </div>
    )}
    <div className="absolute bottom-4 left-4 flex items-center space-x-2">
      <img
        src={
          post.authorAvatar &&
          post.authorAvatar !== "" &&
          post.authorAvatar !== "default_profile.png"
            ? `${API_URL}${post.authorAvatar}`
            : "/default_profile.png"
        }
        alt={post.authorUsername}
        className="w-8 h-8 rounded-full object-cover border-2 border-white"
      />
      <span className="text-white font-bold text-sm drop-shadow-md">
        {post.authorUsername}
      </span>
    </div>
    <div className="absolute top-2 right-2">
      {post.media?.length > 1 && (
        <Squares2X2Icon
          className="w-5 h-5 text-white drop-shadow-lg"
          title="Postingan carousel"
        />
      )}
      {post.media?.length === 1 && post.media[0].type === "video" && (
        <FilmIcon className="w-5 h-5 text-white drop-shadow-lg" title="Video" />
      )}
    </div>
  </div>
);

export default function HomePage() {
  const [members, setMembers] = useState([]);
  const [sharedPosts, setSharedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [membersRes, sharedPostsRes] = await Promise.all([
          fetch(`${API_URL}/api/users/members`),
          fetch(`${API_URL}/api/posts/shared`, { headers }),
        ]);

        const membersData = await membersRes.json();
        const sharedPostsData = await sharedPostsRes.json();

        if (membersRes.ok) setMembers(membersData);
        if (sharedPostsRes.ok) setSharedPosts(sharedPostsData);
      } catch (error) {
        console.error("Gagal memuat data homepage:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handlePostUpdate = (updatedPostData) => {
    const updater = (currentPosts) =>
      currentPosts.map((p) =>
        p.id === updatedPostData.id ? { ...p, ...updatedPostData } : p
      );
    setSharedPosts(updater);

    if (selectedPost && selectedPost.id === updatedPostData.id) {
      setSelectedPost((prev) => ({ ...prev, ...updatedPostData }));
    }
  };

  const handlePostDelete = (deletedPostId) => {
    setSharedPosts((current) => current.filter((p) => p.id !== deletedPostId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-500">Memuat halaman utama...</p>
      </div>
    );
  }

  return (
    <>
      <main className="flex flex-col items-center  p-4 sm:pb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 tracking-tight mt-4">
            Dokumentasi PKL
          </h1>
          <div className="flex items-center justify-center text-lg md:text-xl text-gray-600 mt-2">
            <img
              src="/Logo_SMK_Negeri_40_Jakarta.png"
              alt="SMKN 40 Jakarta"
              className="w-6 h-6 mr-2"
            />
            <span className="mr-1">SMKN 40 JAKARTA</span>
          </div>
          <h2 className="flex items-center justify-center text-lg md:text-xl text-gray-600 mt-2">
            <MapPinIcon className="w-5 h-5 mr-1 text-red-600" />
            <span>(Perpustakaan Jakarta)</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 mt-4 max-w-2xl mx-auto mb-10">
            Lihat berbagai Postingan, Catatan, dan Dokumentasi Kegiatan selama
            PKL dari setiap anggota.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl">
          {members.map((member) => (
            <Link key={member.username} href={`/profil/${member.username}`}>
              <div className="relative bg-white rounded-xl shadow-lg w-72 mx-auto text-center pt-20 min-h-[300px] mb-8 transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl border-2 border-blue-500">
                {/* Foto Profil */}
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <img
                    src={
                      member.profile_picture_url &&
                      member.profile_picture_url !== "default_profile.png" &&
                      member.profile_picture_url !== ""
                        ? `${API_URL}${member.profile_picture_url}`
                        : "/default_profile.png"
                    }
                    alt={member.full_name}
                    className="w-32 h-32 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105 shadow-2xl"
                  />
                </div>

                {/* Info Member */}
                <div className="px-6 pb-6 pt-8">
                  <h2 className="text-xl font-bold text-black">
                    {member.full_name}
                  </h2>
                  <p className="text-blue-600 font-medium mt-1">
                    @{member.username}
                  </p>
                  <p className="text-gray-700 mt-3 text-sm h-16 overflow-hidden">
                    {member.bio || "Tidak ada bio."}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          {user ? (
            <Link
              href={`/profil/${user.username}`}
              className="bg-blue-500 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-blue-600 transition-colors"
            >
              Lihat Profil Saya
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-gray-800 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-gray-900 transition-colors"
            >
              Login untuk Berinteraksi
            </Link>
          )}
        </div>

        {sharedPosts.length > 0 && (
          <div className="w-full max-w-7xl mt-20">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
              Galeri Bersama
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sharedPosts.map((post) => (
                <PostGridItem
                  key={post.id}
                  post={post}
                  onPostClick={setSelectedPost}
                />
              ))}
            </div>
          </div>
        )}
      </main>
      {user && <div className="md:hidden h-20"></div>}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          user={{
            username: selectedPost.authorUsername,
            profile_picture_url: selectedPost.authorAvatar,
            is_verified: selectedPost.authorIsVerified,
          }}
          onClose={() => setSelectedPost(null)}
          onUpdatePost={handlePostUpdate}
          onPostDelete={handlePostDelete}
        />
      )}
    </>
  );
}
