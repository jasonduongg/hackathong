'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import NewHero from '@/components/NewHero';
import HowItWorks from '@/components/HowItWorks';
import ExamplesSection from '@/components/ExamplesSection';
import Testimonials from '@/components/ui/testimonials';
import Footer from '@/components/ui/footer';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/home');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-orange-50 via-soft-orange-25 to-soft-orange-100">
        <div className="text-lg text-gray-700">Loading...</div>
      </div>
    );
  }

  // If user is logged in, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-orange-50 via-soft-orange-25 to-soft-orange-100">
        <div className="text-lg text-gray-700">Redirecting to home...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-soft-orange-50 via-soft-orange-25 to-soft-orange-100">
      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen scroll-mt-16">
        <NewHero />
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-4 md:px-8 lg:px-16 py-20 scroll-mt-16 bg-soft-orange-25/50 backdrop-blur-sm">
        <HowItWorks />
      </section>

      {/* Examples Section */}
      <section id="examples" className="px-4 md:px-8 lg:px-16 py-20 scroll-mt-16">
        <ExamplesSection />
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="px-4 md:px-8 lg:px-16 py-20 scroll-mt-16 bg-gradient-to-r from-soft-orange-50/50 to-soft-orange-100/50">
        <Testimonials />
      </section>

      {/* Footer Section */}
      <section id="footer" className="px-4 md:px-8 lg:px-16 scroll-mt-16 bg-soft-orange-25/70 backdrop-blur-sm">
        <Footer />
      </section>
    </div>
  );
}
