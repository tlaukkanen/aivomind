import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import { Link } from "@mui/material";

import { siteConfig } from "@/config/site";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon-512x512.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col min-h-screen text-white">
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow ">
        {children}
      </main>
      <footer className="w-full flex flex-col items-center justify-center py-5 gap-3">
        <div className="flex gap-6 items-center">
          {siteConfig.footerItems?.map((item, index) => (
            <Link
              key={`footer-${index}`}
              className="text-slate-300 hover:text-white text-sm no-underline"
              href={item.href}
              underline="none"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          className="flex items-center gap-1 text-current no-underline mt-2"
          href="https://www.linkedin.com/in/tlaukkanen/"
          title="Tommi Laukkanen"
          underline="none"
        >
          <span className="text-default-600 text-slate-300">
            Created with ❤️ by&nbsp;
          </span>
          <p className="text-cornflowerBlue">Tommi Laukkanen</p>
        </Link>
      </footer>
    </div>
  );
}
