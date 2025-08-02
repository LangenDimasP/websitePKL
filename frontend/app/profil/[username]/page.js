"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PostModal from "@/components/PostModal";
import FollowListModal from "@/components/FollowListModal";
import { TrashIcon } from "@heroicons/react/24/outline";
import {
  CheckBadgeIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  TagIcon,
  FilmIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/solid";

const API_URL = "https://websitepkl-production.up.railway.app";

// --- Fungsi Pengambilan Data ---
async function getProfileData(username, token) {
  try {
    const res = await fetch(`${API_URL}/api/users/${username}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
}

async function getUserStory(username, token) {
  try {
    const res = await fetch(`${API_URL}/api/stories/${username}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      console.log("Failed to fetch stories:", res.status);
      return null;
    }

    const stories = await res.json();
    console.log("Raw stories response:", stories);

    if (stories && stories.length > 0) {
      const story = stories[0];
      console.log("Found story:", story);

      // Fetch song data if story has song_id
      if (story.song_id) {
        try {
          // Log the song URL we're trying to fetch
          const songUrl = `${API_URL}/api/songs/${story.song_id}`;
          console.log("Fetching song from:", songUrl);

          const songRes = await fetch(songUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (!songRes.ok) {
            console.error(`Failed to fetch song (${songRes.status}):`, songUrl);
            // Return story without song data if song fetch fails
            return {
              ...story,
              song: {
                title: "Lagu tidak tersedia",
                artist: "Unknown",
                url: null,
                start_time: story.song_start_time,
                end_time: story.song_end_time,
              },
            };
          }

          const songData = await songRes.json();
          console.log("Song data:", songData);

          return {
            ...story,
            song: {
              ...songData,
              start_time: story.song_start_time,
              end_time: story.song_end_time,
            },
          };
        } catch (error) {
          console.error("Error fetching song:", error);
          // Return story without song data if there's an error
          return {
            ...story,
            song: {
              title: "Error loading song",
              artist: "Unknown",
              url: null,
              start_time: story.song_start_time,
              end_time: story.song_end_time,
            },
          };
        }
      }
      return story;
    }
    return null;
  } catch (error) {
    console.error("Error in getUserStory:", error);
    return null;
  }
}

async function getPostsData(username, token) {
  try {
    const res = await fetch(`${API_URL}/api/posts/by/${username}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
}

async function getNotesData(username) {
  try {
    const res = await fetch(`${API_URL}/api/notes/by/${username}`);
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return [];
  }
}

async function getTaggedPostsData(username, token) {
  try {
    const res = await fetch(`${API_URL}/api/posts/tagged/${username}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Failed to fetch tagged posts:", error);
    return [];
  }
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username;
  const { user: loggedInUser, token } = useAuth();
  const [user, setUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [taggedPosts, setTaggedPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [hasSeenStory, setHasSeenStory] = useState(false);
    const [mediaLoaded, setMediaLoaded] = useState(false);
  const [followListModal, setFollowListModal] = useState({
    isOpen: false,
    title: "",
    users: [],
  });
  const videoStoryRef = useRef(null);
  const [isProfileImageModalOpen, setIsProfileImageModalOpen] = useState(false);
  const userStory = userStories[activeStoryIndex];

  const [timeLeft, setTimeLeft] = useState(15000);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef(null);
  const progressBarRef = useRef(null);
  const audioRef = useRef(null);
  const startTimeRef = useRef(null); // Tambahkan ref untuk waktu mulai

  const getRelativeTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    return `${diffHours} jam lalu`;
  };

  const router = useRouter();

  // Perbaiki fungsi updateTimer
  const updateTimer = () => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = 15000 - elapsed;

    if (remaining <= 0) {
      // Jika masih ada story berikutnya, lanjut ke story berikutnya
      if (activeStoryIndex < userStories.length - 1) {
        setActiveStoryIndex((i) => i + 1);
        setTimeLeft(15000);
        startTimeRef.current = Date.now();
        // Progress bar akan otomatis reset di useEffect [isStoryModalOpen, userStory]
        return;
      } else {
        // Kalau sudah story terakhir, tutup modal
        setIsStoryModalOpen(false);
        return;
      }
    }

    setTimeLeft(remaining);
    timerRef.current = requestAnimationFrame(updateTimer);
  };

  const markStoryAsSeen = (username) => {
    let seenStories = JSON.parse(localStorage.getItem("seenStories") || "{}");
    seenStories[username] = true;
    localStorage.setItem("seenStories", JSON.stringify(seenStories));
  };

  const pauseTimer = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    if (progressBarRef.current) {
      progressBarRef.current.style.animationPlayState = "paused";
    }
  };

  const resumeTimer = () => {
    setIsPlaying(true);
    if (progressBarRef.current) {
      progressBarRef.current.style.animationPlayState = "running";
    }
    updateTimer();
  };

  useEffect(() => {
    if (isStoryModalOpen && mediaLoaded) {
      setTimeLeft(15000);
      startTimeRef.current = Date.now();
      setIsPlaying(true);
  
      if (progressBarRef.current) {
        progressBarRef.current.style.animation = "none";
        void progressBarRef.current.offsetWidth;
        progressBarRef.current.style.animation = "progress 15s linear forwards";
      }
  
      updateTimer();
    } else {
      setTimeLeft(15000);
      startTimeRef.current = null;
      setIsPlaying(false);
  
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [isStoryModalOpen, userStory, mediaLoaded]);

    useEffect(() => {
    if (isStoryModalOpen) {
      setMediaLoaded(false);
    }
  }, [isStoryModalOpen, userStory]);

  // Perbaiki event handler untuk media container
  const handleMediaClick = (e) => {
    e.stopPropagation();
    if (audioRef.current && !e.type.includes("touch")) {
      if (isPlaying) {
        pauseTimer();
        audioRef.current.pause();
      } else {
        resumeTimer();
        audioRef.current
          .play()
          .catch((err) => console.error("Audio play failed:", err));
      }
    }
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
    if (audioRef.current && isPlaying) {
      pauseTimer();
      audioRef.current.pause();
    }
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    if (audioRef.current && !isPlaying) {
      resumeTimer();
      audioRef.current
        .play()
        .catch((err) => console.error("Audio play failed:", err));
    }
  };

  useEffect(() => {
    setLoadingProfile(true);
    getProfileData(username, token).then((profile) => {
      if (!profile) {
        setNotFound(true);
      } else {
        setProfileData(profile);
        setIsFollowing(profile.isFollowedByMe);
        setFollowerCount(profile.stats.followerCount);
      }
      setLoadingProfile(false);
    });
  }, [username, token]);

  useEffect(() => {
    if (profileData?.user?.username) {
      let seenStories = JSON.parse(localStorage.getItem("seenStories") || "{}");
      setHasSeenStory(!!seenStories[profileData.user.username]);
    }
  }, [profileData?.user?.username, isStoryModalOpen]);

  useEffect(() => {
    if (
      isStoryModalOpen &&
      userStory &&
      userStory.media_type === "video" &&
      videoStoryRef.current
    ) {
      // Set currentTime ke videoStart (atau 0 jika tidak ada)
      videoStoryRef.current.currentTime = userStory.video_start || 0;
      // Unmute video
      videoStoryRef.current.muted = false;
      // Play video
      videoStoryRef.current.play().catch(() => {});
    }
  }, [isStoryModalOpen, userStory]);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/stories/${username}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return setUserStories([]);
        let stories = await res.json();
        if (!Array.isArray(stories)) {
          stories = [stories];
        }
        // Fetch detail lagu untuk setiap story yang punya song_id
        const storiesWithSong = await Promise.all(
          (stories || []).map(async (story) => {
            if (story.song_id) {
              try {
                const songRes = await fetch(
                  `${API_URL}/api/songs/${story.song_id}`
                );
                if (!songRes.ok) return { ...story, song: null };
                const songData = await songRes.json();
                return {
                  ...story,
                  song: {
                    ...songData,
                    start_time: story.song_start_time,
                    end_time: story.song_end_time,
                  },
                };
              } catch {
                return { ...story, song: null };
              }
            }
            return story;
          })
        );
        setUserStories(storiesWithSong);
        setActiveStoryIndex(0);
      } catch (error) {
        setUserStories([]);
      }
    };
    fetchStories();
  }, [username, token]);

  const handlePostUpdate = (updatedPostData) => {
    if (!updatedPostData || !updatedPostData.id) {
      console.error("Data update post tidak valid:", updatedPostData);
      return;
    }

    // Update posts array dengan seluruh data post terbaru
    setPosts((currentPosts) =>
      currentPosts.map((p) =>
        p.id === updatedPostData.id ? { ...p, ...updatedPostData } : p
      )
    );

    setTaggedPosts((currentPosts) =>
      currentPosts.map((p) =>
        p.id === updatedPostData.id ? { ...p, ...updatedPostData } : p
      )
    );

    // Update selectedPost dengan seluruh data terbaru
    setSelectedPost((prev) =>
      prev && prev.id === updatedPostData.id
        ? { ...prev, ...updatedPostData }
        : prev
    );
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    setDeletingNoteId(noteToDelete);
    try {
      const res = await fetch(`${API_URL}/api/notes/${noteToDelete}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
      } else {
        const data = await res.json();
        alert(data.message || "Gagal menghapus catatan");
      }
    } catch (err) {
      alert("Gagal menghapus catatan");
    } finally {
      setDeletingNoteId(null);
      setShowDeleteNoteConfirm(false);
      setNoteToDelete(null);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Yakin ingin menghapus catatan ini?")) return;
    setDeletingNoteId(noteId);
    try {
      const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        const data = await res.json();
        alert(data.message || "Gagal menghapus catatan");
      }
    } catch (err) {
      alert("Gagal menghapus catatan");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handlePostDelete = (deletedPostId) => {
    setPosts((current) => current.filter((p) => p.id !== deletedPostId));
    setTaggedPosts((current) => current.filter((p) => p.id !== deletedPostId));
  };

  // Di dalam useEffect yang sama untuk fetchProfile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      setLoadingProfile(true);

      const profile = await getProfileData(username, token);
      if (profile) {
        setProfileData(profile);
        setIsFollowing(profile.isFollowedByMe);
        setFollowerCount(profile.stats.followerCount);
      }

      // Tambahkan kode ini untuk cek query parameter post
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get("post");

      if (postId) {
        // Fetch posts jika belum ada
        if (posts.length === 0) {
          const userPosts = await getPostsData(username, token);
          setPosts(userPosts);
          // Cari dan set post yang sesuai
          const targetPost = userPosts.find((p) => p.id.toString() === postId);
          if (targetPost) {
            setSelectedPost(targetPost);
          }
        } else {
          // Jika posts sudah ada, langsung cari
          const targetPost = posts.find((p) => p.id.toString() === postId);
          if (targetPost) {
            setSelectedPost(targetPost);
          }
        }
      }

      setLoadingProfile(false);
    };

    fetchProfile();
  }, [username, token]);

  useEffect(() => {
    const fetchTabData = async () => {
      if (!username) return;
      setLoadingTabs(true);

      if (activeTab === "posts") {
        const userPosts = await getPostsData(username, token);
        setPosts(userPosts);
      } else if (activeTab === "notes") {
        const userNotes = await getNotesData(username);
        setNotes(userNotes);
      } else if (activeTab === "tagged") {
        const userTaggedPosts = await getTaggedPostsData(username, token);
        setTaggedPosts(userTaggedPosts);
      }
      setLoadingTabs(false);
    };
    fetchTabData();
  }, [activeTab, username, token]);

  useEffect(() => {
    if (
      isStoryModalOpen &&
      userStory &&
      userStory.media_type === "video" &&
      videoStoryRef.current
    ) {
      const video = videoStoryRef.current;
      video.currentTime = userStory.video_start || 0;
      video.muted = false;
      video.play().catch(() => {});

      const handleTimeUpdate = () => {
        const end =
          userStory.video_end !== undefined
            ? userStory.video_end
            : (userStory.video_start || 0) + 15;
        if (video.currentTime >= end) {
          video.pause();
        }
      };
      video.addEventListener("timeupdate", handleTimeUpdate);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
      };
    }
  }, [isStoryModalOpen, userStory]);

  const handleFollowToggle = async () => {
    if (!loggedInUser)
      return alert("Anda harus login untuk mengikuti pengguna.");
    const originalFollowState = isFollowing;
    const originalFollowerCount = followerCount;
    setIsFollowing(!isFollowing);
    setFollowerCount(isFollowing ? followerCount - 1 : followerCount + 1);
    try {
      const res = await fetch(`${API_URL}/api/users/${username}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setIsFollowing(originalFollowState);
        setFollowerCount(originalFollowerCount);
      }
    } catch (error) {
      setIsFollowing(originalFollowState);
      setFollowerCount(originalFollowerCount);
    }
  };

  const openFollowList = async (type) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${username}/${type}`);
      const data = await res.json();
      if (res.ok) {
        setFollowListModal({
          isOpen: true,
          title: type === "followers" ? "Pengikut" : "Mengikuti",
          users: data,
        });
      }
    } catch (error) {
      console.error(`Gagal memuat daftar ${type}:`, error);
    }
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

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-white px-4 py-8">
        <img
          src="/user-not-found.png"
          alt="User Not Found"
          className="w-40 h-40 sm:w-60 sm:h-60 mb-6 object-contain"
        />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700 mb-2 text-center">
          User Tidak Ditemukan
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-6 text-center">
          Username <span className="font-bold break-all">{username}</span> sudah
          dihapus atau diganti.
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

  const isOwnProfile = loggedInUser?.username === profileData.user.username;

  const PostGridItem = ({ post }) => (
    <div
      className="relative w-full aspect-square bg-gray-200 cursor-pointer group overflow-hidden rounded-sm"
      onClick={() => setSelectedPost(post)}
    >
      {post.media?.[0] ? (
        post.media[0].type === "video" ? (
          <video
            src={`${API_URL}${post.media[0].url}#t=1`}
            className="w-full h-full object-cover"
            preload="metadata"
          />
        ) : (
          <img
            src={`${API_URL}${post.media[0].url}`}
            alt={post.caption || "Post image"}
            className="w-full h-full object-cover"
          />
        )
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-xs sm:text-sm">No media</span>
        </div>
      )}
      <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
      <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
        {post.media?.length > 1 && (
          <Squares2X2Icon
            className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-lg"
            title="Postingan carousel"
          />
        )}
        {post.media?.length === 1 && post.media[0].type === "video" && (
          <FilmIcon
            className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-lg"
            title="Video"
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="container mx-auto max-w-4xl px-2 sm:px-4 lg:px-6">
        {/* Header Profile */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-0 sm:space-x-4 md:space-x-10">
          {/* Profile Picture */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 flex-shrink-0 mx-auto sm:mx-0">
            <div
              onClick={() => {
                if (userStory) {
                  markStoryAsSeen(profileData.user.username);
                  setIsStoryModalOpen(true);
                } else {
                  setIsProfileImageModalOpen(true);
                }
              }}
              className={`w-full h-full rounded-full cursor-pointer relative ${
                userStory
                  ? hasSeenStory
                    ? "p-1 bg-gray-200" // outline abu-abu muda jika sudah dilihat
                    : "p-1 bg-gradient-to-tr from-blue-500 via-blue-400 to-blue-300" // outline biru jika belum
                  : ""
              }`}
            >
              <div
                className={`w-full h-full rounded-full ${
                  userStory ? "p-0.5 bg-white" : ""
                }`}
              >
                <img
                  src={
                    profileData.user.profile_picture_url &&
                    profileData.user.profile_picture_url !== "" &&
                    profileData.user.profile_picture_url !==
                      "default_profile.png"
                      ? `${API_URL}${profileData.user.profile_picture_url}`
                      : "/default_profile.png"
                  }
                  alt={profileData.user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
          </div>
          {/* Profile Info */}
          <div className="flex-grow w-full sm:w-auto text-center sm:text-left">
            {/* Username and Actions */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 mb-3">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-light">
                  {profileData.user.username}
                </h1>
                {profileData.user.is_verified && (
                  <img
                    src="/verified-badge.webp"
                    alt="Verified"
                    title="Akun Terverifikasi"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {!isOwnProfile && loggedInUser && (
                  <button
                    onClick={handleFollowToggle}
                    className={`text-xs sm:text-sm font-semibold px-4 sm:px-6 py-1.5 rounded transition-all duration-200 ${
                      isFollowing
                        ? "bg-gray-200 text-black hover:bg-gray-300"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {isFollowing ? "Mengikuti" : "Ikuti"}
                  </button>
                )}
                {isOwnProfile && (
                  <Link
                    href="/settings/profile"
                    className="bg-gray-200 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded hover:bg-gray-300 transition-colors"
                  >
                    Edit Profil
                  </Link>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-center sm:justify-start space-x-4 sm:space-x-6 mb-4 text-sm sm:text-base">
              <div className="text-center sm:text-left">
                <span className="font-semibold">
                  {profileData.stats.postCount}
                </span>{" "}
                <span className="hidden xs:inline">kiriman</span>
                <span className="xs:hidden">post</span>
              </div>
              <button
                onClick={() => openFollowList("followers")}
                className="hover:underline cursor-pointer text-center sm:text-left"
              >
                <span className="font-semibold">{followerCount}</span>{" "}
                <span className="hidden xs:inline">pengikut</span>
                <span className="xs:hidden">followers</span>
              </button>
              <button
                onClick={() => openFollowList("following")}
                className="hover:underline cursor-pointer text-center sm:text-left"
              >
                <span className="font-semibold">
                  {profileData.stats.followingCount}
                </span>{" "}
                <span className="hidden xs:inline">mengikuti</span>
                <span className="xs:hidden">following</span>
              </button>
            </div>

            {/* Bio */}
            <div className="max-w-md mx-auto sm:mx-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                {profileData.user.full_name}
              </p>
              <p className="text-gray-700 whitespace-pre-line text-sm sm:text-base leading-relaxed">
                {profileData.user.bio}
              </p>
              {profileData.user.school && (
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {profileData.user.school}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex justify-center border-b mt-4 sm:mt-6 gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "posts"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            <Squares2X2Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">POSTINGAN</span>
            <span className="xs:hidden">POST</span>
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "notes"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">CATATAN</span>
            <span className="xs:hidden">NOTES</span>
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "tagged"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            <TagIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">DITANDAI</span>
            <span className="xs:hidden">TAGGED</span>
          </button>
        </div>

        {/* Main Content */}
        <main className="mt-4 sm:mt-6 md:mt-8 min-h-[200px] pb-4">
          {loadingTabs ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              {activeTab === "posts" && (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:gap-3 lg:gap-4">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <PostGridItem key={`post-${post.id}`} post={post} />
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-gray-500 py-10 sm:py-16">
                      <div className="max-w-xs mx-auto">
                        <Squares2X2Icon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm sm:text-base mb-2">
                          Belum ada postingan
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Postingan akan muncul di sini setelah dibagikan
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "notes" && (
                <div className="space-y-3 sm:space-y-4">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex justify-between items-start"
                      >
                        <div>
                          <p className="text-gray-800 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                            {note.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                            Dibuat pada{" "}
                            {new Date(note.created_at).toLocaleString("id-ID", {
                              dateStyle: "long",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        {/* Tombol hapus hanya untuk pemilik profil */}
                        {isOwnProfile && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingNoteId === note.id}
                            className="ml-2 text-red-500 hover:text-red-700 p-2 rounded transition disabled:opacity-50"
                            title="Hapus Catatan"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-10 sm:py-16">
                      <div className="max-w-xs mx-auto">
                        <DocumentTextIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm sm:text-base mb-2">
                          Belum ada catatan
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Catatan yang dibuat akan muncul di sini
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "tagged" && (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:gap-3 lg:gap-4">
                  {taggedPosts.length > 0 ? (
                    taggedPosts.map((post) => (
                      <PostGridItem key={`tagged-${post.id}`} post={post} />
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-gray-500 py-10 sm:py-16">
                      <div className="max-w-xs mx-auto">
                        <TagIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm sm:text-base mb-2">
                          Belum ada postingan yang menanda
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Postingan yang menandai Anda akan muncul di sini
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
        <div className="h-12 md:hidden" />
      </div>

      {/* Post Modal */}
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

      {/* Follow List Modal */}
      {followListModal.isOpen && (
        <FollowListModal
          title={followListModal.title}
          users={followListModal.users}
          onClose={() =>
            setFollowListModal({ isOpen: false, title: "", users: [] })
          }
        />
      )}

      {/* Profile Image Modal */}
      {isProfileImageModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
          onClick={() => setIsProfileImageModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg overflow-hidden max-w-sm sm:max-w-lg w-full max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsProfileImageModalOpen(false)}
              className="absolute top-4 right-4 text-white z-50 hover:opacity-70 transition-opacity"
              style={{ background: "rgba(0,0,0,0.4)", borderRadius: "50%" }}
            >
              <XMarkIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <img
              src={
                profileData.user.profile_picture_url &&
                profileData.user.profile_picture_url !== "" &&
                profileData.user.profile_picture_url !== "default_profile.png"
                  ? `${API_URL}${profileData.user.profile_picture_url}`
                  : "/default_profile.png"
              }
              alt={profileData.user.username}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}
      {showDeleteNoteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <TrashIcon className="w-10 h-10 mx-auto text-red-500 mb-2" />
            <h2 className="text-lg font-bold mb-2">Konfirmasi Hapus Catatan</h2>
            <p className="mb-4 text-gray-700">
              Apakah Anda yakin ingin menghapus catatan ini?
              <br />
              Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => {
                  setShowDeleteNoteConfirm(false);
                  setNoteToDelete(null);
                }}
              >
                Batal
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-semibold"
                onClick={confirmDeleteNote}
                disabled={deletingNoteId === noteToDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {isStoryModalOpen && userStories.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setIsStoryModalOpen(false)}
          />

          {/* Tombol prev/next */}
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 z-[100] bg-black/40 rounded-full p-2"
            onClick={(e) => {
              e.stopPropagation();
              setActiveStoryIndex((i) => Math.max(i - 1, 0));
            }}
            disabled={activeStoryIndex === 0}
            style={{ pointerEvents: userStories.length > 1 ? "auto" : "none" }}
          >
            &lt;
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[100] bg-black/40 rounded-full p-2"
            onClick={(e) => {
              e.stopPropagation();
              setActiveStoryIndex((i) =>
                Math.min(i + 1, userStories.length - 1)
              );
            }}
            disabled={activeStoryIndex === userStories.length - 1}
            style={{ pointerEvents: userStories.length > 1 ? "auto" : "none" }}
          >
            &gt;
          </button>

          {/* Modal Container with 80% Height */}
          <div className="relative w-full max-w-[432px] h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col">
            <button
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-[100] bg-black/60 text-white rounded-full w-10 h-10 aspect-square flex items-center justify-center transition
    ${
      activeStoryIndex === 0
        ? "cursor-not-allowed opacity-60"
        : "cursor-pointer hover:bg-white/30 hover:scale-110"
    }`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveStoryIndex((i) => Math.max(i - 1, 0));
              }}
              disabled={activeStoryIndex === 0}
              style={{
                pointerEvents:
                  userStories.length > 1 && activeStoryIndex !== 0
                    ? "auto"
                    : "none",
              }}
              aria-label="Sebelumnya"
            >
              &lt;
            </button>
            <button
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-[100] bg-black/60 text-white rounded-full w-10 h-10 aspect-square flex items-center justify-center transition
    ${
      activeStoryIndex === userStories.length - 1
        ? "cursor-not-allowed opacity-60"
        : "cursor-pointer hover:bg-white/30 hover:scale-110"
    }`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveStoryIndex((i) =>
                  Math.min(i + 1, userStories.length - 1)
                );
              }}
              disabled={activeStoryIndex === userStories.length - 1}
              style={{
                pointerEvents:
                  userStories.length > 1 &&
                  activeStoryIndex !== userStories.length - 1
                    ? "auto"
                    : "none",
              }}
              aria-label="Berikutnya"
            >
              &gt;
            </button>

            {/* Progress Bar Instagram Style */}
            <div className="flex gap-1 px-4 pt-2 absolute top-0 left-0 w-full z-50">
              {userStories.map((story, idx) => (
                <div
                  key={story.id}
                  className="flex-1 h-1 bg-gray-400/60 rounded overflow-hidden"
                >
                  <div
                    ref={idx === activeStoryIndex ? progressBarRef : null}
                    className="h-full bg-white transition-all duration-200"
                    style={{
                      width:
                        idx < activeStoryIndex
                          ? "100%"
                          : idx === activeStoryIndex
                          ? undefined // akan di-animate via CSS
                          : "0%",
                      animation:
                        idx === activeStoryIndex
                          ? "progress 15s linear forwards"
                          : "none",
                    }}
                  ></div>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsStoryModalOpen(false)}
              className="absolute top-4 right-4 text-white z-50 hover:opacity-70 transition-opacity"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>

            {/* Header with Username (10% height) */}
            <div className="h-[10%] z-20 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center">
              <div className="flex items-center space-x-2">
                <img
                  src={
                    profileData.user.profile_picture_url &&
                    profileData.user.profile_picture_url !== "" &&
                    profileData.user.profile_picture_url !==
                      "default_profile.png"
                      ? `${API_URL}${profileData.user.profile_picture_url}`
                      : "/default_profile.png"
                  }
                  alt={profileData.user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="text-white font-semibold text-sm">
                    {profileData.user.username}
                    {profileData.user.is_verified && (
                      <img
                        src="/verified-badge.webp"
                        alt="Verified"
                        className="w-4 h-4 ml-1 inline"
                      />
                    )}
                  </p>
                  <p className="text-white/80 text-xs">
                    {getRelativeTime(userStory.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Media Container (80% height) */}
            <div
              className="h-[80%] flex items-center justify-center bg-black overflow-y-auto select-none"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Pause pada touch start
                if (audioRef.current && isPlaying) {
                  audioRef.current.pause();
                  if (progressBarRef.current) {
                    progressBarRef.current.style.animationPlayState = "paused";
                  }
                  if (timerRef.current) {
                    cancelAnimationFrame(timerRef.current);
                  }
                  setIsPlaying(false);
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Resume pada touch end jika sebelumnya paused
                if (audioRef.current && !isPlaying) {
                  audioRef.current
                    .play()
                    .catch((err) => console.error("Audio play failed:", err));
                  if (progressBarRef.current) {
                    progressBarRef.current.style.animationPlayState = "running";
                  }
                  // Update startTimeRef untuk melanjutkan timer dari posisi saat ini
                  const elapsed = 15000 - timeLeft;
                  startTimeRef.current = Date.now() - elapsed;
                  setIsPlaying(true);
                  updateTimer();
                }
              }}
              onTouchMove={(e) => {
                e.preventDefault(); // Mencegah scroll dan gesture lainnya
              }}
              onContextMenu={(e) => {
                e.preventDefault(); // Mencegah context menu (long press menu)
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Hanya handle click untuk desktop (bukan touch device)
                if (!("ontouchstart" in window)) {
                  if (audioRef.current) {
                    if (isPlaying) {
                      // Pause
                      audioRef.current.pause();
                      if (progressBarRef.current) {
                        progressBarRef.current.style.animationPlayState =
                          "paused";
                      }
                      if (timerRef.current) {
                        cancelAnimationFrame(timerRef.current);
                      }
                      setIsPlaying(false);
                    } else {
                      // Resume
                      audioRef.current
                        .play()
                        .catch((err) =>
                          console.error("Audio play failed:", err)
                        );
                      if (progressBarRef.current) {
                        progressBarRef.current.style.animationPlayState =
                          "running";
                      }
                      const elapsed = 15000 - timeLeft;
                      startTimeRef.current = Date.now() - elapsed;
                      setIsPlaying(true);
                      updateTimer();
                    }
                  }
                }
              }}
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                WebkitTouchCallout: "none", // Mencegah callout pada iOS
                WebkitTapHighlightColor: "transparent", // Menghilangkan highlight tap
              }}
            >
              <div
                className="w-full h-full flex items-center"
                style={{
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  pointerEvents: "none", // Mencegah event pada child elements
                }}
              >
                {userStory.media_type === "image" ? (
                  <img
                    src={`${API_URL}${userStory.media_url}`}
  alt="Story"
  className="w-full h-full object-contain"
  draggable={false}
  onLoad={() => setMediaLoaded(true)}
                    onDragStart={(e) => e.preventDefault()}
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <>
                    <video
  ref={videoStoryRef}
  src={`${API_URL}${userStory.media_url}`}
  autoPlay
  controls={false}
  muted={false}
  className="w-full h-full object-contain"
  draggable={false}
  onLoadedData={() => setMediaLoaded(true)}
                      onDragStart={(e) => e.preventDefault()}
                      style={{
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        pointerEvents: "none",
                      }}
                    />
                    {/* Tampilkan tulisan jika tidak ada lagu */}
                  </>
                )}
              </div>
            </div>

            {/* Footer with Audio Controls and Song Info (10% height) */}
            {userStory.song && userStory.song.url ? (
              <div className="h-[10%] z-20 p-4 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end">
                <div className="text-white mb-2">
                  <p className="font-semibold text-sm">
                    {userStory.song.title}
                  </p>
                  <p className="text-xs text-white/80">
                    {userStory.song.artist}
                  </p>
                </div>
                <StoryAudioPlayer
                  audioRef={audioRef}
                  src={`${API_URL}${userStory.song.url}`}
                  startTime={userStory.song.start_time}
                  endTime={userStory.song.end_time}
                  setMediaLoaded={setMediaLoaded} // Tambahkan prop ini
                />
              </div>
            ) : (
              userStory.media_type === "video" && (
                <div className="h-[10%] z-20 p-4 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end">
                  <div className="text-white mb-2">
                    <p className="font-semibold text-xs italic text-gray-300">
                      Original musik dari video
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
function StoryAudioPlayer({ audioRef, src, startTime, endTime }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;

    const audioElement = audioRef.current; // Simpan referensi untuk cleanup

    const handleTimeUpdate = () => {
      if (audioElement.currentTime >= endTime) {
        audioElement.currentTime = startTime;
        audioElement
          .play()
          .catch((err) => console.error("Audio play failed:", err));
      }
    };

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.currentTime = startTime;
    audioElement
      .play()
      .catch((err) => console.error("Audio play failed:", err));

    return () => {
      // Gunakan referensi yang disimpan untuk cleanup
      if (audioElement) {
        audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      }
    };
  }, [startTime, endTime]); // Hapus audioRef dari dependency array

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={toggleMute}
        className="p-2 rounded-full bg-white/20 hover:bg-white/30"
      >
        {muted ? (
          <SpeakerXMarkIcon className="w-6 h-6 text-white" />
        ) : (
          <SpeakerWaveIcon className="w-6 h-6 text-white" />
        )}
      </button>
      <audio
        ref={audioRef}
        src={src}
        muted={muted}
        autoPlay
        className="hidden story-audio"
        onCanPlayThrough={() => setMediaLoaded && setMediaLoaded(true)}
      />
    </div>
  );
}
