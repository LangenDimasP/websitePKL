"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import Link from "next/link";
import {
  RectangleGroupIcon,
  StopIcon,
  PhotoIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  MusicalNoteIcon,
  PlayIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";

// ...existing code...

const API_URL = "websitepkl-production.up.railway.app";

// --- Komponen Form untuk Postingan ---
const PostForm = ({ token, user }) => {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [aspectRatio, setAspectRatio] = useState(1 / 1);
  const [isVideoPresent, setIsVideoPresent] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songStartTime, setSongStartTime] = useState(0);
  const [songEndTime, setSongEndTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const cropperRefs = useRef([]);
  const captionRef = useRef(null);
  const audioRef = useRef(null);

  // Fetch songs when component mounts
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/songs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Periksa apakah response berhasil
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setSongs(data);
      } catch (err) {
        console.error("Gagal memuat daftar lagu:", err);
        // Set songs ke array kosong jika gagal fetch
        setSongs([]);
      }
    };

    // Hanya fetch jika token tersedia
    if (token) {
      fetchSongs();
    }
  }, [token]);

  // Cleanup audio and revoke object URLs
  useEffect(() => {
    return () => {
      files.forEach((fileData) => URL.revokeObjectURL(fileData.url));
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [files]);

  const handleFileChange = (e) => {
    e.preventDefault();
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length > 0) {
      const hasVideo = selectedFiles.some((file) =>
        file.type.startsWith("video/")
      );
      setIsVideoPresent(hasVideo);

      const fileData = selectedFiles.map((file) => ({
        file: file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("image/") ? "image" : "video",
      }));

      // Tambahkan file baru ke files lama
      setFiles((prevFiles) => [...prevFiles, ...fileData]);

      if (hasVideo) {
        setAspectRatio(1 / 1);
        setSelectedSong(null);
        setSongStartTime(0);
        setSongEndTime(0);
        setIsMusicPlaying(false);
      }

      const imageCount = [...files, ...fileData].filter(
        (f) => f.type === "image"
      ).length;
      cropperRefs.current = new Array(imageCount).fill(null);
    }
  };

  const handleAspectRatioChange = (ratio) => {
    setAspectRatio(ratio);
  };

  const handleCaptionChange = (e) => {
    const text = e.target.value;
    setCaption(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w+)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setShowSuggestions(false);
      setMentionQuery(null);
    }
  };

  const handleSuggestionClick = (selectedUsername) => {
    const cursorPos = captionRef.current.selectionStart;
    const textBeforeCursor = caption.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w+)$/);

    if (mentionMatch) {
      const startIndex = mentionMatch.index;
      const newCaption = `${caption.substring(
        0,
        startIndex
      )}@${selectedUsername} ${caption.substring(cursorPos)}`;
      setCaption(newCaption);
    }
    setShowSuggestions(false);
    setMentionQuery(null);
    captionRef.current.focus();
  };

  const handleSongChange = (e) => {
    const songId = e.target.value;
    const songData = songId ? songs.find((s) => s.id == songId) : null;
    setSelectedSong(songData);
    const startTime = songData?.start_time || 0;
    setSongStartTime(startTime);
    setSongEndTime(
      songData?.end_time || Math.min(startTime + 15, songDuration)
    );
    setIsMusicPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMusicPlaying) {
      audio.pause();
      setIsMusicPlaying(false);
    } else {
      audio.currentTime = songStartTime;
      audio.play().catch(() => {});
      setIsMusicPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.currentTime >= songEndTime) {
        audio.pause();
        setIsMusicPlaying(false);
      }
    };

    if (isMusicPlaying) {
      audio.addEventListener("timeupdate", handleTimeUpdate);
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [isMusicPlaying, songEndTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (files.length === 0) {
      setError("Anda harus memilih setidaknya satu file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("caption", caption);
      const aspectRatioString =
        aspectRatio === 1 ? "1:1" : aspectRatio === 4 / 5 ? "4:5" : "1.91:1";
      formData.append("aspectRatio", aspectRatioString);
      formData.append("type", isShared ? "bersama" : "pribadi");
      if (selectedSong) {
        formData.append("songId", selectedSong.id);
        formData.append("songStartTime", songStartTime);
        formData.append("songEndTime", songEndTime);
      }

      let imageCropIndex = 0;
      const filePromises = files.map((fileData) => {
        if (fileData.type === "image") {
          const cropperInstance = cropperRefs.current[imageCropIndex++];
          return new Promise((resolve, reject) => {
            if (!cropperInstance)
              return reject(new Error("Cropper tidak siap."));
            const canvas = cropperInstance.getCroppedCanvas();
            if (!canvas) return reject(new Error("Gagal mendapat hasil crop."));
            canvas.toBlob((blob) => resolve(blob), "image/jpeg");
          });
        } else {
          return Promise.resolve(fileData.file);
        }
      });

      const processedFiles = await Promise.all(filePromises);

      processedFiles.forEach((file, index) => {
        if (file) formData.append("files", file, files[index].file.name);
      });

      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat postingan");
      setSuccessMsg("Postingan berhasil dibuat!");
      setTimeout(() => {
        router.push(`/profil/${user.username}`);
      }, 1200);
      if (!res.ok) throw new Error(data.message || "Gagal membuat postingan");
      router.push(`/profil/${user.username}`);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (mentionQuery === null) return;

    const delayDebounceFn = setTimeout(async () => {
      if (mentionQuery.trim() === "") {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      try {
        const res = await fetch(
          `${API_URL}/api/users/search?q=${mentionQuery}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (res.ok && data.length > 0) {
          setSuggestions(data);
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error("Gagal fetch mention suggestions:", err);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [mentionQuery, token]);

  let imageIndex = -1;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
          {error}
        </p>
      )}
      {successMsg && (
        <p className="text-sm text-green-600 bg-green-100 p-3 rounded-lg">
          {successMsg}
        </p>
      )}

      <div>
        <label
          htmlFor="file"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Pilih Gambar atau Video
        </label>
        <input
          id="file"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {files.length > 0 && (
        <>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Preview & Atur Gambar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {files.map((fileData) => {
                if (fileData.type === "image") {
                  imageIndex++;
                  const currentImageIndex = imageIndex;
                  return (
                    <div
                      key={`${fileData.url}-${aspectRatio}`}
                      className="w-full"
                    >
                      <Cropper
                        ref={(el) => {
                          if (el)
                            cropperRefs.current[currentImageIndex] = el.cropper;
                        }}
                        src={fileData.url}
                        style={{
                          height: "100%",
                          width: "100%",
                          maxHeight: "300px",
                        }}
                        aspectRatio={aspectRatio}
                        viewMode={1}
                        guides={true}
                        background={false}
                        checkOrientation={false}
                        className="rounded-lg"
                      />
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={fileData.url}
                      className="w-full h-[200px] sm:h-[250px] bg-black flex items-center justify-center rounded-lg"
                    >
                      <video
                        src={fileData.url}
                        controls
                        className="max-h-full max-w-full rounded-lg"
                      ></video>
                    </div>
                  );
                }
              })}
              <div
                className="flex items-center justify-center w-full aspect-square min-h-[120px] max-h-[200px] sm:max-h-[250px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition"
                onClick={() => document.getElementById("file").click()}
              >
                <span className="flex flex-col items-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm text-center">
                    Tambah Gambar/Video
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Aspek Rasio (Untuk Gambar)
            </label>
            {isVideoPresent && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 text-yellow-700 text-xs rounded-lg mb-3">
                <InformationCircleIcon className="w-4 h-4" />
                <span>Aspek rasio dikunci ke 1:1 karena ada video.</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isVideoPresent}
                onClick={() => handleAspectRatioChange(1 / 1)}
                className={`p-2 border rounded-lg flex flex-col items-center w-20 transition-colors ${
                  aspectRatio === 1 / 1
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
              >
                <StopIcon className="w-8 h-8" />
                <span className="text-xs mt-1">1:1</span>
              </button>
              <button
                type="button"
                disabled={isVideoPresent}
                onClick={() => handleAspectRatioChange(4 / 5)}
                className={`p-2 border rounded-lg flex flex-col items-center w-20 transition-colors ${
                  aspectRatio === 4 / 5
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
              >
                <div className="w-6 h-8 bg-gray-400 rounded-sm"></div>
                <span className="text-xs mt-1">4:5</span>
              </button>
              <button
                type="button"
                disabled={isVideoPresent}
                onClick={() => handleAspectRatioChange(1.91 / 1)}
                className={`p-2 border rounded-lg flex flex-col items-center w-20 transition-colors ${
                  aspectRatio === 1.91 / 1
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation`}
              >
                <div className="w-10 h-5 bg-gray-400 rounded-sm"></div>
                <span className="text-xs mt-1">1.91:1</span>
              </button>
            </div>
          </div>
          {!isVideoPresent && (
            <div className="p-4 border rounded-lg space-y-3">
              <label
                htmlFor="song"
                className="block text-gray-700 text-sm font-bold"
              >
                Pilih Lagu (Opsional)
              </label>
              <select
                id="song"
                value={selectedSong ? selectedSong.id : ""}
                onChange={handleSongChange}
                className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Tanpa Musik --</option>
                {songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.artist} - {song.title}
                  </option>
                ))}
              </select>
              {selectedSong && (
                <div className="mt-2 space-y-3">
                  <audio
                    ref={audioRef}
                    src={`${API_URL}${selectedSong.file_url}`}
                    className="hidden"
                    onLoadedMetadata={(e) => {
                      setSongDuration(e.target.duration);
                      if (!songEndTime) {
                        setSongEndTime(
                          Math.min(songStartTime + 15, e.target.duration)
                        );
                      }
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 touch-manipulation"
                    >
                      {isMusicPlaying ? (
                        <PauseIcon className="w-5 h-5" />
                      ) : (
                        <PlayIcon className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">
                          Mulai dari
                        </label>
                        <input
                          type="range"
                          min="0"
                          max={songDuration > 15 ? songDuration - 15 : 0}
                          value={songStartTime}
                          onChange={(e) => {
                            const newStartTime = parseFloat(e.target.value);
                            setSongStartTime(newStartTime);
                            setSongEndTime(
                              Math.min(newStartTime + 15, songDuration)
                            );
                            if (isMusicPlaying) {
                              audioRef.current.currentTime = newStartTime;
                            }
                          }}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">
                          Berhenti di
                        </label>
                        <input
                          type="range"
                          min={songStartTime}
                          max={songDuration}
                          value={songEndTime}
                          onChange={(e) => {
                            const newEndTime = parseFloat(e.target.value);
                            if (newEndTime - songStartTime <= 15) {
                              setSongEndTime(newEndTime);
                            } else {
                              setSongEndTime(songStartTime + 15);
                            }
                            if (isMusicPlaying) {
                              audioRef.current.currentTime =
                                parseFloat(songStartTime);
                            }
                          }}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Pilih klip hingga 15 detik. Mulai dari:{" "}
                    {Math.floor(songStartTime)} detik, Berhenti di:{" "}
                    {Math.floor(songEndTime)} detik
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="relative">
        <label
          htmlFor="caption"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Caption
        </label>
        <textarea
          ref={captionRef}
          id="caption"
          value={caption}
          onChange={handleCaptionChange}
          className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          rows="4"
        ></textarea>
        {showSuggestions && (
          <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
            {suggestions.map((sugUser) => (
              <div
                key={sugUser.id}
                onClick={() => handleSuggestionClick(sugUser.username)}
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 cursor-pointer"
              >
                <img
                  src={
                    sugUser.profile_picture_url &&
                    sugUser.profile_picture_url !== "" &&
                    sugUser.profile_picture_url !== "default_profile.png"
                      ? `${API_URL}${sugUser.profile_picture_url}`
                      : "/default_profile.png"
                  }
                  alt={sugUser.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="font-bold text-sm">{sugUser.username}</p>
                  <p className="text-xs text-gray-500">{sugUser.full_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label htmlFor="isShared" className="font-medium text-gray-700 text-sm">
          Jadikan Postingan Bersama
        </label>
        <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
          <input
            type="checkbox"
            name="isShared"
            id="isShared"
            checked={isShared}
            onChange={() => setIsShared(!isShared)}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
          />
          <label
            htmlFor="isShared"
            className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
          ></label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-sm sm:text-base touch-manipulation"
      >
        Publikasikan Postingan
      </button>
    </form>
  );
};

// --- Komponen Form untuk Catatan ---
const NoteForm = ({ token, user }) => {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("Catatan tidak boleh kosong.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat catatan");
      setSuccessMsg("Catatan berhasil dibuat!");
      setTimeout(() => {
        router.push(`/profil/${user.username}`);
      }, 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
          {error}
        </p>
      )}
      {successMsg && (
        <p className="text-sm text-green-600 bg-green-100 p-3 rounded-lg">
          {successMsg}
        </p>
      )}
      <div>
        <label
          htmlFor="content"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Catatan
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          rows="6"
          placeholder="Tulis catatan Anda di sini..."
        ></textarea>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-sm sm:text-base touch-manipulation"
      >
        Publikasikan Catatan
      </button>
    </form>
  );
};

// Tambahkan di atas export default function CreatePostPage()
// ...existing code...
const StoryForm = ({ token, user }) => {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songStartTime, setSongStartTime] = useState(0);
  const [songEndTime, setSongEndTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef(null);
  const [videoStart, setVideoStart] = useState(0);
  const [videoEnd, setVideoEnd] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef(null);
  const [checkingVideo, setCheckingVideo] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchSongs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/songs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setSongs(data);
      } catch (err) {
        console.error("Gagal memuat daftar lagu:", err);
        setSongs([]);
      }
    };

    fetchSongs();
  }, [token]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type.startsWith("video/")) {
      setCheckingVideo(true);
      const url = URL.createObjectURL(selected);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      video.onloadedmetadata = () => {
        setCheckingVideo(false);
        setError(null);
        setFile(selected);
        setVideoStart(0);
        setVideoEnd(Math.min(15, video.duration));
        setVideoDuration(video.duration);
        URL.revokeObjectURL(url);
      };
    } else {
      setError(null);
      setFile(selected);
    }
  };

  const handleSongChange = (e) => {
    const songId = e.target.value;
    const songData = songId ? songs.find((s) => s.id == songId) : null;
    setSelectedSong(songData);
    const startTime = songData?.start_time || 0;
    setSongStartTime(startTime);
    setSongEndTime(
      songData?.end_time || Math.min(startTime + 15, songDuration)
    );
    setIsMusicPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMusicPlaying) {
      audio.pause();
      setIsMusicPlaying(false);
    } else {
      audio.currentTime = songStartTime;
      audio.play().catch(() => {});
      setIsMusicPlaying(true);
    }
  };

  useEffect(() => {
    if (videoRef.current && file && file.type.startsWith("video/")) {
      videoRef.current.currentTime = videoStart;
    }
  }, [videoStart, file]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      if (audio.currentTime >= songEndTime) {
        audio.pause();
        setIsMusicPlaying(false);
      }
    };
    if (isMusicPlaying) {
      audio.addEventListener("timeupdate", handleTimeUpdate);
    }
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [isMusicPlaying, songEndTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      if (!checkingVideo) setError("Pilih foto atau video untuk story.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("media", file);
      if (file.type.startsWith("video/")) {
        formData.append("videoStart", videoStart);
        formData.append("videoEnd", videoEnd);
      }
      const res = await fetch(`${API_URL}/api/stories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal upload story");
      setSuccessMsg("Story berhasil diupload!");
      setTimeout(() => router.push(`/profil/${user.username}`), 1200);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">
          {error}
        </p>
      )}
      {successMsg && (
        <p className="text-sm text-green-600 bg-green-100 p-3 rounded-lg">
          {successMsg}
        </p>
      )}
      <div>
        <label
          htmlFor="file"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Pilih Foto/Video (maksimal 15 detik)
        </label>
        <input
          id="file"
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      {file && (
        <div className="mb-4 flex flex-col items-center">
          {file.type.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              style={{
                maxWidth: "100%",
                maxHeight: "400px",
                objectFit: "contain",
              }}
              className="rounded-lg border"
            />
          ) : (
            <>
              <video
                src={URL.createObjectURL(file)}
                controls
                ref={videoRef}
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                }}
                className="rounded-lg border"
                onLoadedMetadata={(e) => {
                  setVideoDuration(e.target.duration);
                  if (videoEnd === 0)
                    setVideoEnd(Math.min(15, e.target.duration));
                }}
              />
              <div className="w-full mt-2">
                <label className="text-xs text-gray-500">
                  Pilih bagian video (max 15 detik)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{Math.floor(videoStart)}s</span>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration - 1}
                    value={videoStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVideoStart(val);
                      setVideoEnd(Math.min(val + 15, videoDuration));
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs">{Math.floor(videoEnd)}s</span>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration - 1}
                    value={videoStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVideoStart(val);
                      setVideoEnd(Math.min(val + 15, videoDuration));
                    }}
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Durasi terpilih: {Math.floor(videoEnd - videoStart)} detik
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <div className="p-4 border rounded-lg space-y-3">
        <label htmlFor="song" className="block text-gray-700 text-sm font-bold">
          Pilih Lagu (Opsional)
        </label>
        <select
          id="song"
          value={selectedSong ? selectedSong.id : ""}
          onChange={handleSongChange}
          className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Tanpa Musik --</option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.artist} - {song.title}
            </option>
          ))}
        </select>
        {selectedSong && (
          <div className="mt-2 space-y-3">
            <audio
              ref={audioRef}
              src={`${API_URL}${selectedSong.file_url}`}
              className="hidden"
              onLoadedMetadata={(e) => {
                setSongDuration(e.target.duration);
                if (!songEndTime) {
                  setSongEndTime(
                    Math.min(songStartTime + 15, e.target.duration)
                  );
                }
              }}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 touch-manipulation"
              >
                {isMusicPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
              </button>
              <div className="flex-1 space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Mulai dari</label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration - 1}
                    value={videoStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVideoStart(val);
                      setVideoEnd(Math.min(val + 15, videoDuration));
                    }}
                    className="flex-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Berhenti di</label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration - 1}
                    value={videoStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVideoStart(val);
                      setVideoEnd(Math.min(val + 15, videoDuration));
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Pilih klip hingga 15 detik. Mulai dari:{" "}
              {Math.floor(songStartTime)} detik, Berhenti di:{" "}
              {Math.floor(songEndTime)} detik
            </p>
          </div>
        )}
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-sm"
        disabled={!file || checkingVideo}
      >
        Publikasikan Story
      </button>
    </form>
  );
};

// --- Komponen Halaman Utama ---
export default function CreatePostPage() {
  const { user, token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("post");
  const router = useRouter();

  if (loading) return <p className="text-center p-6 sm:p-10">Memuat...</p>;
  if (!user)
    return (
      <p className="text-center p-6 sm:p-10">
        Anda harus login untuk membuat konten.
      </p>
    );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-6 sm:py-10">
      <button
        onClick={() => router.back()}
        className="mb-4 bg-transparent flex items-center gap-2 cursor-pointer"
        style={{ border: "none" }}
      >
        <span style={{ fontSize: "1.2em" }}>&larr;</span>
        <span>Kembali</span>
      </button>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Buat Konten Baru</h1>
      <div className="mb-6 sm:mb-8 border-b">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab("post")}
            className={`flex items-center space-x-2 py-2 px-3 sm:px-4 font-semibold text-sm sm:text-base ${
              activeTab === "post"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-500"
            } touch-manipulation`}
          >
            <PhotoIcon className="w-5 h-5" />
            <span>Postingan</span>
          </button>
          <button
            onClick={() => setActiveTab("note")}
            className={`flex items-center space-x-2 py-2 px-3 sm:px-4 font-semibold text-sm sm:text-base ${
              activeTab === "note"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-500"
            } touch-manipulation`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Catatan</span>
          </button>
          <button
            onClick={() => setActiveTab("story")}
            className={`flex items-center space-x-2 py-2 px-3 sm:px-4 font-semibold text-sm sm:text-base ${
              activeTab === "story"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-500"
            } touch-manipulation`}
          >
            <RectangleGroupIcon className="w-5 h-5" />
            <span>Buat Story</span>
          </button>
        </div>
      </div>

      {activeTab === "post" ? (
        <PostForm token={token} user={user} />
      ) : activeTab === "note" ? (
        <NoteForm token={token} user={user} />
      ) : (
        <StoryForm token={token} user={user} />
      )}
    </div>
  );
}

// --- Custom CSS for Toggle Switch and Range Input ---
const styles = `
  .toggle-checkbox:checked {
    right: 0;
    border-color: #3b82f6;
  }
  .toggle-checkbox:checked + .toggle-label {
    background-color: #3b82f6;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
  }
`;

// Inject styles into the document
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
