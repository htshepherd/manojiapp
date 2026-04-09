"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/notes');
    } else {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-current rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
