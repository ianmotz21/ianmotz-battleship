import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Battleship",
  description: "A classic Battleship game built with Next.js",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
