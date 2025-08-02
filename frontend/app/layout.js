// File: frontend/app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import "cropperjs/dist/cropper.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar"; // <-- 1. Impor Navbar

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PKL Portfolio",
  description: "Dokumentasi kegiatan PKL yang interaktif",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar /> {/* <-- 2. Letakkan Navbar di sini */}
          <main>{children}</main> {/* Bungkus children dengan <main> */}
        </AuthProvider>
      </body>
    </html>
  );
}