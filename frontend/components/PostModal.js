'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import RenderWithLinks from './RenderWithLinks';
import { 
    XMarkIcon, 
    HeartIcon as HeartIconOutline, 
    ChatBubbleOvalLeftIcon, 
    EllipsisHorizontalIcon, 
    TrashIcon,
    PlayIcon,
    PaperAirplaneIcon,  
    PauseIcon, 
    SpeakerWaveIcon, 
    SpeakerXMarkIcon,
    MusicalNoteIcon
} from '@heroicons/react/24/outline';
import { 
    HeartIcon as HeartIconSolid, 
    ChatBubbleOvalLeftIcon as ChatBubbleSolid 
} from '@heroicons/react/24/solid';

// Import CSS untuk Swiper
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const API_URL = "https://websitepkl-production.up.railway.app";

// --- Fungsi Helper ---
const getGuestLikes = () => { 
    if (typeof window === 'undefined') return []; 
    try { 
        const likes = localStorage.getItem('guestLikes'); 
        return likes ? JSON.parse(likes) : []; 
    } catch (e) { 
        return []; 
    } 
};

function renderCommentWithEmojis(text) {
  let result = text;
  EMOJIS.forEach(emoji => {
    const regex = new RegExp(`:${emoji.alt}:`, 'g');
    result = result.replace(
      regex,
      `<img src="${emoji.src}" alt="${emoji.alt}" class="inline w-6 h-6 align-middle" />`
    );
  });
  return result;
}

const EMOJIS = [
  { src: "/emoji/emoji1.avif", alt: "emoji1" },
  { src: "/emoji/emoji2.avif", alt: "emoji2" },
  { src: "/emoji/emoji3.avif", alt: "emoji3" },
  { src: "/emoji/emoji4.png", alt: "emoji4" },
  { src: "/emoji/emoji5.png", alt: "emoji5" },
];

const addGuestLike = (postId) => { 
    const likes = getGuestLikes(); 
    if (!likes.includes(postId)) { 
        likes.push(postId); 
        localStorage.setItem('guestLikes', JSON.stringify(likes)); 
    } 
};

const removeGuestLike = (postId) => { 
    let likes = getGuestLikes(); 
    likes = likes.filter(id => id !== postId); 
    localStorage.setItem('guestLikes', JSON.stringify(likes)); 
};



const isPostLikedByGuest = (postId) => getGuestLikes().includes(postId);

const getAspectRatioPadding = (ratio) => { 
    switch (ratio) { 
        case '1:1': return '100%'; 
        case '4:5': return '125%'; 
        case '1.91:1': return '52.35%'; 
        default: return '100%'; 
    } 
};

const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return "Baru saja";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}j`;
    if (days < 7) return `${days}h`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

// --- Komponen untuk Video Player Kustom ---
const CustomVideoPlayer = ({ src }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const total = videoRef.current.duration;
            setCurrentTime(current);
            setProgress((current / total) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };
    
    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative w-full h-full group" onClick={togglePlayPause}>
            <video
                ref={videoRef}
                src={src}
                loop
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
            />
            
            {/* Tombol Play/Pause di Tengah */}
            <div className={`absolute inset-0 flex items-center justify-center bg-opacity-20 transition-opacity duration-300 ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button className="bg-black/50 rounded-full p-4 text-white">
                    {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                </button>
            </div>

            {/* Kontrol di Bawah */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-2 text-white">
                    <button onClick={togglePlayPause}>
                        {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                    <span className="text-xs font-mono">{formatTime(currentTime)}</span>
                    {/* Progress Bar */}
                    <div className="w-full bg-white/30 h-1 rounded-full cursor-pointer" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const newTime = (clickX / rect.width) * duration;
                        if (videoRef.current) videoRef.current.currentTime = newTime;
                    }}>
                        <div className="bg-white h-full rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-xs font-mono">{formatTime(duration)}</span>
                    <button onClick={toggleMute}>
                        {isMuted ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Komponen untuk menampilkan komentar & balasannya ---
const Comment = ({ comment, onReply, loggedInUser }) => {
    const [repliesVisible, setRepliesVisible] = useState(true);

    return (
        <div className="flex items-start space-x-3">
            <Link href={`/profil/${comment.username}`} className="flex-shrink-0">
                                <img
                  src={
                    comment.profile_picture_url &&
                    comment.profile_picture_url !== "" &&
                    comment.profile_picture_url !== "default_profile.png"
                      ? `${API_URL}${comment.profile_picture_url}`
                      : "/default_profile.png"
                  }
                  alt={comment.username}
                  className="w-8 h-8 rounded-full object-cover mt-1"
                />
            </Link>
            <div className="flex-grow">
                <div className="text-sm flex items-center flex-wrap">
                  <span className="font-bold inline-flex items-center mr-2">
                    <Link href={`/profil/${comment.username}`} className="hover:underline">{comment.username}</Link>
                    {comment.is_verified && <img src="/verified-badge.webp" alt="Verified" className="w-4 h-4 ml-1" />}
                  </span>
                  {/* Komentar + emoji langsung di samping username */}
                  <span
                    className="break-words"
                    dangerouslySetInnerHTML={{ __html: renderCommentWithEmojis(comment.content) }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 pl-1 flex items-center space-x-3">
                    <span>{timeAgo(comment.created_at)}</span>
                    {loggedInUser && (
                        <button onClick={() => onReply(comment)} className="font-semibold hover:underline">Balas</button>
                    )}
                </div>

                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2">
                        <button onClick={() => setRepliesVisible(!repliesVisible)} className="text-xs font-bold text-gray-600 flex items-center space-x-2 hover:text-black">
                            <span className="w-6 border-t border-gray-400"></span>
                            <span>{repliesVisible ? 'Sembunyikan balasan' : `Lihat ${comment.replies.length} balasan`}</span>
                        </button>
                    </div>
                )}

                {repliesVisible && comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {comment.replies.map(reply => (
                            <Comment key={reply.id} comment={reply} onReply={onReply} loggedInUser={loggedInUser} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Komponen untuk menampilkan info "Disukai oleh" ---
const LikedByInfo = ({ likeCount, isLiked, post, loggedInUser }) => {
    if (!loggedInUser && isLiked) {
        // Guest like: Selalu tampil "Disukai oleh someone"
        return <p className="text-sm text-gray-800">Disukai oleh <strong>someone</strong></p>;
    }

    if (likeCount === 0) {
        return <p className="text-sm text-gray-600">Jadilah yang pertama menyukai ini.</p>;
    }

    const otherLikes = loggedInUser ? likeCount - 1 : likeCount;

    if (isLiked && loggedInUser) {
        if (otherLikes > 0) {
            return (
                <p className="text-sm text-gray-800">
                    Disukai oleh <strong>Anda</strong> dan <strong>{otherLikes} lainnya</strong>
                </p>
            );
        }
        return <p className="text-sm text-gray-800">Disukai oleh <strong>Anda</strong></p>;
    }

    if (post.firstLikerUsername) {
        if (likeCount > 1) {
            return (
                <p className="text-sm text-gray-800">
                    Disukai oleh <Link href={`/profil/${post.firstLikerUsername}`} className="font-bold hover:underline">{post.firstLikerUsername}</Link> dan <strong>{likeCount - 1} lainnya</strong>
                </p>
            );
        }
        return (
            <p className="text-sm text-gray-800">
                Disukai oleh <Link href={`/profil/${post.firstLikerUsername}`} className="font-bold hover:underline">{post.firstLikerUsername}</Link>
            </p>
        );
    }

    return <p className="font-bold text-sm">{likeCount} suka</p>;
};

export default function PostModal({ post, user, onClose, onUpdatePost, onPostDelete }) {
    const { token, user: loggedInUser, logout } = useAuth();
    const router = useRouter();

    const [isLiked, setIsLiked] = useState(() => {
    if (!post || !post.id) {
        console.error('Data post tidak lengkap saat inisialisasi:', post);
        return false;
    }
    return loggedInUser ? !!post.isLiked : isPostLikedByGuest(post.id);
});
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const [comments, setComments] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const [showCommentForm, setShowCommentForm] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false); // State untuk audio playback
    const audioRef = useRef(null); // Ref untuk audio element
    const commentInputRef = useRef(null);
    const [lastTap, setLastTap] = useState(0);
    const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
    const [hearts, setHearts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showLoginCommentPopup, setShowLoginCommentPopup] = useState(false);
        const [isMuted, setIsMuted] = useState(false);
const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
const CAPTION_MAX_LENGTH = 180; // Atur batas karakter sesuai kebutuhan


        useEffect(() => {
      if (audioRef.current) {
        audioRef.current.muted = isMuted;
      }
    }, [isMuted]);
    // Di dalam komponen PostModal
useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = 'auto';
    };
}, []);

const handleOverlayClick = (e) => {
    // Jika klik langsung di overlay (bukan di modal)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
        if (!isLiked) handleLikeToggle();
        
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const newHeart = {
            id: Date.now(),
            x,
            y
        };
        
        setHearts(prev => [...prev, newHeart]);
        
        setTimeout(() => {
            setHearts(prev => prev.filter(heart => heart.id !== newHeart.id));
        }, 1000);
        
        setLastTap(0);
    } else {
        setLastTap(now);
    }
};

const handleShare = async () => {
    if (!post.slug) {
        alert('Slug tidak tersedia untuk postingan ini.');
        return;
    }

    const shareUrl = `${window.location.origin}/p/${post.slug}`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: `Postingan oleh ${user.username}`,
                text: post.caption?.slice(0, 100) || 'Lihat postingan ini',
                url: shareUrl
            });
        } 
        else if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } 
        else {
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            try {
                document.execCommand('copy');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            } catch (err) {
                alert('Tidak dapat menyalin link. URL: ' + shareUrl);
            } finally {
                document.body.removeChild(textarea);
            }
        }
    } catch (error) {
        console.error('Error sharing:', error);
        alert('Tidak dapat membagikan. URL: ' + shareUrl);
    }
};

    // Fungsi untuk toggle play/pause audio
    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
                console.log('Audio dipause, currentTime:', audioRef.current.currentTime);
            } else {
                const mulai = Number(post.song_start_time) || 0;
                const selesai = Number(post.song_end_time) || Infinity;
                console.log('Parsed songStartTime:', mulai, 'songEndTime:', selesai);
                console.log('Sebelum set currentTime di toggle:', audioRef.current.currentTime);
                audioRef.current.currentTime = mulai;
                console.log('Setelah set currentTime di toggle:', audioRef.current.currentTime);

                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                    console.log('Audio mulai diputar di toggle, currentTime:', audioRef.current.currentTime);
                    if (audioRef.current.currentTime < mulai) {
                        audioRef.current.currentTime = mulai;
                        console.log('Paksa set currentTime setelah play di toggle:', audioRef.current.currentTime);
                    }
                }).catch(err => {
                    console.error('Gagal putar musik di toggle:', err);
                    setIsPlaying(false);
                });
            }
        }
    };

    // Audio setup logic dengan autoplay
useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !post.songUrl) return;

    const mulai = Number(post.song_start_time) || 0;
    const selesai = Number(post.song_end_time) || Math.min(mulai + 15, audio.duration || 0);

    const handleLoadedMetadata = () => {
        if (audio.duration) {
            audio.currentTime = mulai;
        }
    };

    const handleTimeUpdate = () => {
        if (audio.currentTime < mulai) {
            audio.currentTime = mulai;
        }
        if (selesai !== Infinity && audio.currentTime >= selesai) {
            audio.currentTime = mulai;
            if (!isPlaying) {
                audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            }
        }
    };

    const handleCanPlayThrough = () => {
        audio.currentTime = mulai;
        audio.play().then(() => {
            setIsPlaying(true);
            if (audio.currentTime < mulai) {
                audio.currentTime = mulai;
            }
        }).catch(() => setIsPlaying(false));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
    audio.addEventListener('timeupdate', handleTimeUpdate);

    if (audio.readyState >= 2) {
        handleLoadedMetadata();
        handleCanPlayThrough();
    }

    return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.pause();
        audio.currentTime = mulai;
        setIsPlaying(false);
    };
}, [post.id, post.songUrl, post.song_start_time, post.song_end_time]);

useEffect(() => {
  if (showModal) {
    setTimeout(() => {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.play().catch(() => {});
      }
    }, 300); // beri jeda agar modal sudah muncul
  }
}, [showModal]);

    useEffect(() => {
        const fetchComments = async () => {
            if (!post.id) return;
            try {
                setIsLoadingComments(true);
                const res = await fetch(`${API_URL}/api/posts/${post.id}/comments`);
                const data = await res.json();
                if (res.ok) setComments(data);
            } catch (error) {
                console.error("Gagal mengambil komentar:", error);
            } finally {
                setIsLoadingComments(false);
            }
        };
        fetchComments();
    }, [post.id]);

        function renderCaption(caption) {
      if (!caption) return null;
      if (isCaptionExpanded || caption.length <= CAPTION_MAX_LENGTH) {
        return (
          <span>
            <RenderWithLinks text={caption} />
          </span>
        );
      }
      return (
        <span>
          <RenderWithLinks text={caption.slice(0, CAPTION_MAX_LENGTH) + '...'} />{' '}
          <button
            className="text-blue-500 hover:underline text-xs font-semibold"
            onClick={() => setIsCaptionExpanded(true)}
            type="button"
          >
            baca selengkapnya
          </button>
        </span>
      );
    }

    useEffect(() => {
      if (post && post.id) {
        setIsLiked(loggedInUser ? !!post.isLiked : isPostLikedByGuest(post.id));
        setLikeCount(post.likeCount || 0);
      }
    }, [post, loggedInUser]);

    const handleLikeToggle = async () => {
        if (!post || !post.id) {
            console.error('Data post tidak valid:', post);
            return;
        }
    
        // Update state lokal langsung
        const newIsLiked = !isLiked;
        const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;
    
        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);
    
        try {
            if (loggedInUser) {
                const res = await fetch(`${API_URL}/api/posts/${post.id}/like`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
    
                if (res.status === 401) {
                    alert('Sesi Anda telah berakhir. Silakan login kembali.');
                    logout();
                    router.push('/login');
                    return;
                }
    
                const data = await res.json();
                if (!res.ok) {
                    // Jika gagal, rollback state
                    setIsLiked(isLiked);
                    setLikeCount(likeCount);
                    throw new Error(data.message || 'Gagal toggle like');
                }
    
                // Update parent jika perlu
                if (typeof onUpdatePost === 'function') {
                    onUpdatePost({
                        ...post,
                        isLiked: data.liked,
                        likeCount: data.newLikeCount
                    });
                }
            } else {
                // Guest like
                if (newIsLiked) {
                    addGuestLike(post.id);
                } else {
                    removeGuestLike(post.id);
                }
                if (typeof onUpdatePost === 'function') {
                    onUpdatePost({
                        ...post,
                        isLiked: newIsLiked,
                        likeCount: newLikeCount
                    });
                }
            }
        } catch (error) {
            // Rollback state jika error
            setIsLiked(isLiked);
            setLikeCount(likeCount);
            console.error('Error toggling like:', error);
            alert(`Gagal toggle like: ${error.message}`);
        }
    };
if (!post || !post.id || !post.media || !post.authorUsername) {
    console.error('Data post tidak lengkap:', post);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg">
                <p className="text-red-500">Data postingan tidak lengkap. Silakan coba lagi.</p>
                <button onClick={onClose} className="mt-2 text-blue-500">Tutup</button>
            </div>
        </div>
    );
}

    const handleDoubleClickLike = (e) => {
    if (!isLiked) handleLikeToggle();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Tambahkan heart baru dengan ID unik
    const newHeart = {
        id: Date.now(),
        x,
        y
    };
    
    setHearts(prev => [...prev, newHeart]);
    
    // Hapus heart setelah animasi selesai
    setTimeout(() => {
        setHearts(prev => prev.filter(heart => heart.id !== newHeart.id));
    }, 1000);
};

    
    const handleCommentIconClick = () => {
        if (!loggedInUser) {
            setShowLoginCommentPopup(true);
            return;
        }
        setShowCommentForm(!showCommentForm);
        setReplyingTo(null);
        if (!showCommentForm) {
            setTimeout(() => commentInputRef.current?.focus(), 100);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !loggedInUser) return;
        try {
            const payload = { 
                content: newComment,
                parentCommentId: replyingTo ? replyingTo.id : null 
            };
            const res = await fetch(`${API_URL}/api/posts/${post.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const savedComment = await res.json();
            if (res.ok) {
                setComments([...comments, savedComment]);
                setNewComment('');
                setReplyingTo(null);
            } else { alert(savedComment.message || 'Gagal mengirim komentar'); }
        } catch (error) {
            console.error("Gagal mengirim komentar:", error);
        }
    };

    // Ganti handleDelete
const handleDelete = async () => {
    setShowDeleteConfirm(true);
};

const confirmDelete = async () => {
    try {
        const res = await fetch(`${API_URL}/api/posts/${post.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        onPostDelete(post.id);
        onClose();
    } catch (error) {
        alert(`Gagal menghapus postingan: ${error.message}`);
    } finally {
        setShowDeleteConfirm(false);
    }
};
    
    const formatDate = (dateString) => { 
        const options = { year: 'numeric', month: 'long', day: 'numeric' }; 
        return new Date(dateString).toLocaleDateString('id-ID', options); 
    };

    if (!post || !user) return null;

    if (!post || !post.media || !Array.isArray(post.media)) {
    console.error('Data post atau media tidak valid:', post);
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center p-4">
          <p className="text-red-500">Data postingan tidak valid.</p>
        </div>
      </div>
    );
  }

    return (
    <div
    className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 overflow-y-auto"
    onClick={handleOverlayClick}
>
    <div 
        className="my-auto w-[95%] max-w-4xl mx-auto" // Tambahkan mx-auto untuk center horizontal
        style={{
            minHeight: 'min(100%, 100vh - 64px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center' // Tambahkan ini untuk memastikan konten center
        }}
    >
    
  <button onClick={onClose} className="fixed sm:absolute top-4 right-4 text-white z-50">
    <XMarkIcon className="w-8 h-8" />
  </button>
  <div
    className="bg-white w-full max-w-4xl flex flex-col sm:flex-row rounded-lg overflow-hidden"
    onClick={(e) => e.stopPropagation()}
  >
            {/* Media Section */}
            <div 
    className="w-full sm:w-1/2 bg-black flex items-center justify-center flex-shrink-0 relative" 
    onDoubleClick={handleDoubleClickLike}
    onTouchStart={handleTap} // Tambahkan ini
>
    <div className="w-full">
        <div className="relative w-full" style={{ paddingBottom: getAspectRatioPadding(post.aspect_ratio) }}>
            <div className="absolute inset-0 flex items-center justify-center">
    {hearts.map(heart => (
        <HeartIconSolid 
            key={heart.id}
            className="absolute text-red-500 w-24 h-24 z-10 pointer-events-none heart-animate"
            style={{
                left: `${heart.x}px`,
                top: `${heart.y}px`,
            }}
        />
    ))}
                <div className="relative w-full h-full">
                  {/* Speaker button hanya muncul saat lagu sedang play */}
                  {post.songUrl && isPlaying && (
                    <button
                      className="absolute bottom-3 right-3 bg-gray-700 bg-opacity-60 rounded-full p-2 z-20"
                      onClick={() => {
                        setIsMuted((prev) => {
                          if (audioRef.current) audioRef.current.muted = !prev;
                          return !prev;
                        });
                      }}
                      title={isMuted ? "Aktifkan suara" : "Mute"}
                    >
                      {isMuted ? (
                        <SpeakerXMarkIcon className="w-6 h-6 text-white" />
                      ) : (
                        <SpeakerWaveIcon className="w-6 h-6 text-white" />
                      )}
                    </button>
                  )}
                  {/* Swiper tetap di sini */}
                  <Swiper
                    modules={[Navigation, Pagination]}
                    navigation
                    pagination={{ clickable: true }}
                    loop={post.media.length > 1}
                    className="w-full h-full"
                  >
                    {post.media.map((mediaItem, index) => (
                      <SwiperSlide key={index} className="w-full h-full">
                        {mediaItem.type === 'image' ? (
                          <img
                            src={`${API_URL}${mediaItem.url}`}
                            alt={`Post media ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <CustomVideoPlayer
                            src={`${API_URL}${mediaItem.url}`}
                            className="w-full h-full"
                          />
                        )}
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
            </div>
        </div>
    </div>
</div>

            {/* Content Section */}
            <div className="w-full sm:w-1/2 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center border-b p-3 sm:p-4 flex-shrink-0">
                    <img 
                        src={`${API_URL}${user.profile_picture_url}`} 
                        alt={user.username} 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" 
                    />
                    <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                        <span className="font-bold inline-flex items-center text-sm sm:text-base">
                            {user.username}
                            {user.is_verified && (
                                <img src="/verified-badge.webp" alt="Verified" className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                            )}
                        </span>
                        {post.songUrl && (
                            <div className="flex items-center space-x-1 sm:space-x-1.5 text-xs text-gray-600 mt-1">
                                <MusicalNoteIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="font-semibold truncate">{post.songArtist}</span>
                                <span className="text-gray-400">-</span>
                                <span className="truncate">{post.songTitle}</span>
                                {post.songUrl && (
                                    <button onClick={togglePlayPause} className="ml-2 text-blue-500 flex-shrink-0">
                                        {isPlaying ? (
                                            <PauseIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                        ) : (
                                            <PlayIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    {loggedInUser?.username === user.username && (
                        <div className="relative flex-shrink-0">
                            <button onClick={() => setShowOptions(!showOptions)}>
                                <EllipsisHorizontalIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                            </button>
                            {showOptions && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
                                    <button 
                                        onClick={handleDelete} 
                                        className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        <span>Hapus Postingan</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Comments Section */}
                <div className="flex-grow overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3 sm:space-y-4 mb-2 min-h-[200px] sm:min-h-[300px]">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <img 
                            src={`${API_URL}${user.profile_picture_url}`} 
                            alt={user.username} 
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" 
                        />
                        <div className="text-xs sm:text-sm min-w-0 flex-1">
                            <span className="font-bold inline-flex items-center">
                                {user.username}
                                {user.is_verified && (
                                    <img src="/verified-badge.webp" alt="Verified" className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                                )}
                            </span>{' '}
                            {renderCaption(post.caption)}
                        </div>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                        {isLoadingComments ? (
                            <p className="text-sm">Memuat komentar...</p>
                        ) : (
                            comments.map(comment => (
                                <Comment 
                                    key={comment.id} 
                                    comment={comment} 
                                    loggedInUser={loggedInUser}
                                    onReply={(c) => {
                                        if (!loggedInUser) {
                                            setShowLoginCommentPopup(true);
                                            return;
                                        }
                                        setReplyingTo({ id: c.id, username: c.username });
                                        setNewComment(`@${c.username} `);
                                        setShowCommentForm(true);
                                        setTimeout(() => commentInputRef.current?.focus(), 100);
                                    }}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Actions and Comment Form */}
                <div className="border-t p-3 sm:p-4 space-y-2 sm:space-y-3 bg-white flex-shrink-0 mt-auto pb-4">
                    <div className="flex space-x-3 sm:space-x-4">
                        <button onClick={handleLikeToggle}>
                            {isLiked ? (
                                <HeartIconSolid className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
                            ) : (
                                <HeartIconOutline className="w-6 h-6 sm:w-7 sm:h-7" />
                            )}
                        </button>
                        <button onClick={handleCommentIconClick}>
                            {showCommentForm ? (
                                <ChatBubbleSolid className="w-6 h-6 sm:w-7 sm:h-7" />
                            ) : (
                                <ChatBubbleOvalLeftIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                            )}
                        </button>
                        <button 
                            onClick={handleShare}
                            className="transform rotate-315"
                            title="Bagikan postingan"
                        >
                            <PaperAirplaneIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
                        </button>
                    </div>
                    
                    <LikedByInfo likeCount={likeCount} isLiked={isLiked} post={post} loggedInUser={loggedInUser} />
                    <p className="text-gray-500 text-xs uppercase">{formatDate(post.created_at)}</p>
                    
                    {loggedInUser && showCommentForm && (
                        <div className="border-t pt-2 sm:pt-3">
                            {replyingTo && (
                                <div className="text-xs text-gray-500 mb-1 flex justify-between items-center">
                                    <span>Membalas ke @{replyingTo.username}</span>
                                    <button 
                                        onClick={() => { setReplyingTo(null); setNewComment(''); }} 
                                        className="font-semibold hover:underline"
                                    >
                                        Batal
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2">
  <input 
    ref={commentInputRef} 
    type="text" 
    value={newComment} 
    onChange={(e) => setNewComment(e.target.value)} 
    placeholder="Tambahkan komentar..." 
    className="w-full bg-transparent text-sm focus:outline-none" 
  />
  <button 
    type="submit" 
    className="text-blue-500 font-semibold text-sm disabled:text-gray-300 flex-shrink-0" 
    disabled={!newComment.trim()}
  >
    Kirim
  </button>
</form>
{/* Emoji Picker */}
<div className="flex flex-wrap gap-2 mt-2">
  {EMOJIS.map((emoji, idx) => (
    <button
      key={idx}
      type="button"
      className="hover:bg-gray-200 rounded p-1"
      onClick={() => setNewComment((prev) => prev + `:${emoji.alt}:`)}
      tabIndex={-1}
      style={{ width: 32, height: 32 }}
    >
      <img src={emoji.src} alt={emoji.alt} className="w-auto h-auto" />
    </button>
  ))}
</div>
                        </div>
                    )}
                </div>

                {/* Audio Element */}
                {post.songUrl && (
                    <audio 
                        ref={audioRef} 
                        src={`${API_URL}${post.songUrl.toLowerCase()}`} 
                        preload="metadata" 
                        loop={false}
                    />
                )}
            </div>
        </div>
        {showDeleteConfirm && (
      <div className="fixed inset-0 flex items-center justify-center z-60 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
          <TrashIcon className="w-10 h-10 mx-auto text-red-500 mb-2" />
          <h2 className="text-lg font-bold mb-2">Konfirmasi Hapus</h2>
          <p className="mb-4 text-gray-700">Apakah Anda yakin ingin menghapus postingan ini?<br />Aksi ini tidak dapat dibatalkan.</p>
          <div className="flex justify-center gap-4">
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Batal
            </button>
            <button
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-semibold"
              onClick={confirmDelete}
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    )}
    {showToast && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-2 z-[70] animate-fade-in-up">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Link postingan telah disalin</span>
            </div>
        )}
        </div>
                {showLoginCommentPopup && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full text-center">
              <h2 className="text-lg font-bold mb-2 text-blue-600">Login Diperlukan</h2>
              <p className="mb-4 text-gray-700">Anda harus login untuk berkomentar.</p>
              <div className="flex justify-center gap-4">
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  onClick={() => setShowLoginCommentPopup(false)}
                >
                  Tutup
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                  onClick={() => { setShowLoginCommentPopup(false); router.push('/login'); }}
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
);
}