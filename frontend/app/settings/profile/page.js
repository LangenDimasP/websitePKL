"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { XMarkIcon } from "@heroicons/react/24/solid";

const API_URL = "https://websitepkl-production.up.railway.app";

export default function EditProfilePage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  // State untuk data profil
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    bio: "",
    school: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [oldFormData, setOldFormData] = useState(null);
  const [isProfilePictureChanged, setIsProfilePictureChanged] = useState(false);

  // State untuk gambar & crop
  const [imageSrc, setImageSrc] = useState(null);
  const [currentPictureUrl, setCurrentPictureUrl] = useState(null);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const cropperRef = useRef(null);

  // State untuk UI
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Setelah fetchProfile, simpan data lama untuk perbandingan
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/users/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setFormData({
            username: data.username || "",
            fullName: data.full_name || "",
            bio: data.bio || "",
            school: data.school || "",
          });
          setOldFormData({
            username: data.username || "",
            fullName: data.full_name || "",
            bio: data.bio || "",
            school: data.school || "",
          });
          setCurrentPictureUrl(
            data.profile_picture_url &&
              data.profile_picture_url !== "default_profile.png"
              ? `${API_URL}${data.profile_picture_url}`
              : "/default_profile.png"
          );
        } else {
          throw new Error(data.message || "Gagal memuat data profil.");
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) =>
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!validImageTypes.includes(file.type)) {
        setError("File harus berupa gambar (JPEG, PNG, atau GIF).");
        return;
      }
      setImageSrc(URL.createObjectURL(file));
      setShowCropperModal(true);
    }
  };

  const handleCrop = () => {
    if (cropperRef.current?.cropper) {
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
        width: 256,
        height: 256,
        imageSmoothingQuality: "high",
      });
      croppedCanvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedUrl = URL.createObjectURL(blob);
            setCurrentPictureUrl(croppedUrl);
            setImageSrc(null);
            setShowCropperModal(false);
            setIsProfilePictureChanged(true); // Set flag saat crop & simpan
          }
        },
        "image/jpeg",
        0.8
      );
    }
  };

  const handleCancelCrop = () => {
    setImageSrc(null);
    setShowCropperModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
  
    if (
      passwordData.newPassword &&
      passwordData.newPassword !== passwordData.confirmPassword
    ) {
      setError("Konfirmasi password baru tidak cocok.");
      setIsSubmitting(false);
      return;
    }
  
    const dataToSend = new FormData(); // <-- pindahkan ke atas
    let updatedFields = [];
  
    if (isProfilePictureChanged) {
      const response = await fetch(currentPictureUrl);
      const blob = await response.blob();
      dataToSend.append("profilePicture", blob, "profile.jpeg");
      updatedFields.push("Foto Profil");
    }
  
    dataToSend.append("username", formData.username);
    dataToSend.append("fullName", formData.fullName);
    dataToSend.append("bio", formData.bio);
    dataToSend.append("school", formData.school);
  
    if (passwordData.newPassword) {
      dataToSend.append("currentPassword", passwordData.currentPassword);
      dataToSend.append("newPassword", passwordData.newPassword);
      updatedFields.push("Password");
    }
  
    if (oldFormData) {
      if (formData.username !== oldFormData.username)
        updatedFields.push("Username");
      if (formData.fullName !== oldFormData.fullName)
        updatedFields.push("Nama Lengkap");
      if (formData.bio !== oldFormData.bio) updatedFields.push("Bio");
      if (formData.school !== oldFormData.school)
        updatedFields.push("Asal Sekolah");
    }
  
    try {
      const res = await fetch(`${API_URL}/api/users/profile/update`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: dataToSend,
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Gagal memperbarui profil.");
  
      let successMsg = "";
      if (updatedFields.length === 0) {
        successMsg = "Tidak ada perubahan pada profil.";
      } else {
        successMsg = updatedFields
          .map((f) => `${f} berhasil diupdate`)
          .join(", ");
      }
      setSuccess(successMsg);
  
      setTimeout(() => {
        router.push(`/profil/${formData.username}`);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p className="text-center p-4 sm:p-10">Memuat...</p>;
  if (!user)
    return (
      <p className="text-center p-4 sm:p-10">
        Anda harus login untuk mengakses halaman ini.
      </p>
    );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-full sm:max-w-3xl">
      <button
        onClick={() => router.back()}
        className="mb-4 bg-transparent flex items-center gap-2 cursor-pointer"
        style={{ border: "none" }}
      >
        <span style={{ fontSize: "1.2em" }}>&larr;</span>
        <span>Kembali</span>
      </button>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
        Edit Profil
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-md space-y-6"
      >
        {error && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-100 p-2 rounded">
            {success}
          </p>
        )}

        <div className="text-center">
          <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full overflow-hidden relative bg-gray-200">
            {currentPictureUrl && (
              <img
                src={currentPictureUrl}
                alt="Profil"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Label hanya pada tulisan "Ubah Foto" */}
              <label
                htmlFor="profilePicture"
                className="cursor-pointer bg-black/50 px-3 py-1 rounded text-white text-sm sm:text-base hover:bg-black/70 transition"
              >
                Ubah Foto
              </label>
            </div>
          </div>
          <input
            id="profilePicture"
            type="file"
            accept="image/*"
            onChange={handlePictureChange}
            className="hidden"
          />
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-semibold border-b pb-2 mb-4">
            Informasi Publik
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Nama Lengkap
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded shadow-sm text-sm sm:text-base"
              />
            </div>
            <div>
              <label
                htmlFor="username"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded shadow-sm text-sm sm:text-base"
              />
            </div>
            <div>
              <label
                htmlFor="bio"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded shadow-sm text-sm sm:text-base"
                rows="3"
              ></textarea>
            </div>
            <div>
              <label
                htmlFor="school"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Asal Sekolah
              </label>
              <input
                type="text"
                name="school"
                value={formData.school}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded shadow-sm text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-semibold border-b pb-2 mb-4">
            Ubah Password
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Password Saat Ini
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border rounded shadow-sm text-sm sm:text-base"
              />
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Password Baru
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border rounded shadow-sm text-sm sm:text-base"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border rounded shadow-sm text-sm sm:text-base"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 text-sm sm:text-base"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>

      {showCropperModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-lg overflow-hidden w-full max-w-[90vw] sm:max-w-lg relative">
            <button
              onClick={handleCancelCrop}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-black z-50"
            >
              <XMarkIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <div className="p-4 sm:p-6">
              <Cropper
                ref={cropperRef}
                src={imageSrc}
                style={{ height: "60vh", maxHeight: "400px", width: "100%" }}
                aspectRatio={1}
                viewMode={1}
                guides={true}
                background={false}
                autoCropArea={1}
                checkOrientation={true}
                responsive={true}
                cropBoxResizable={true}
                dragMode="move"
              />
              <div className="mt-4 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                <button
                  type="button"
                  onClick={handleCrop}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm sm:text-base"
                >
                  Crop & Simpan
                </button>
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded text-sm sm:text-base"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="h-20 md:hidden" />
    </div>
  );
}
