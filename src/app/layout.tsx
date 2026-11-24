import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ListServ",
  description: "Mailing lists — broadcast announcements and discussion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
