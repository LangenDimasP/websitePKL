"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PostModal from "@/components/PostModal";
import { useAuth } from "@/context/AuthContext";

const API_URL = "websitepkl-production.up.railway.app";

export default function SharedPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { token } = useAuth(); // Ambil token dari AuthContext

  useEffect(() => {
    if (!slug) return;
    console.log("Fetching post with slug:", slug);
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/posts/by-slug/${slug}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}, // Kirim token jika tersedia
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Gagal memuat postingan");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Post fetched:", data);
        const mappedPost = {
          ...data,
          song_start_time: data.songStartTime,
          song_end_time: data.songEndTime,
          isLiked: !!data.isLiked,
        };
        setPost(mappedPost);
        setShowModal(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching post:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [slug, token]); // Tambahkan token ke dependencies

  const handleUpdatePost = (updatedPost) => {
    if (!updatedPost || !updatedPost.id) {
      console.error("Data update post tidak valid:", updatedPost);
      return;
    }
    setPost((prevPost) => ({
      ...prevPost,
      isLiked: updatedPost.isLiked,
      likeCount: updatedPost.likeCount,
    }));
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat profil...</p>
        </div>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat postingan...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-4">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal ? (
        <PostModal
          post={post}
          user={{
            username: post.authorUsername,
            profile_picture_url: post.authorAvatar,
            is_verified: post.authorIsVerified,
          }}
          onClose={() => {
            setShowModal(false);
            setLoadingProfile(true);
            setTimeout(() => {
              window.location.href = `/profil/${post.authorUsername}`;
            }, 1000);
          }}
          onUpdatePost={handleUpdatePost}
          onPostDelete={() => {
            setShowModal(false);
            setPost(null);
          }}
        />
      ) : (
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat postingan...</p>
          </div>
        </div>
      )}
    </>
  );
}
