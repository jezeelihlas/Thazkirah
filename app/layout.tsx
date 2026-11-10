import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Thazkirah · تَذْكِرَة | My daily practice', description: 'Your daily prayers, Sri Lankan prayer times, authentic morning and evening adhkar, Qur’an readings, and a personal daily routine.' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en" data-theme="light"><body>{children}</body></html>}
