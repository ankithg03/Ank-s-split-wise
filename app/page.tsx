'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserPlus, LineChart } from 'lucide-react';
import Banner from '@/components/Banner';
import FeatureCard from '@/components/FeatureCard';

function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
 
  useEffect(() => {
    setIsIOS(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    )
 
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])
 
  if (isStandalone) {
    return null // Don't show install button if already installed
  }
 
  return (
    <div>
      <button className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600">
        Install App
      </button>
      {isIOS && (
        <p>
          To install this app on your iOS device, tap the share button
          <span role="img" aria-label="share icon">
            {' '}
            ⎋{' '}
          </span>
          and then &quot;Install App&quot;
          <span role="img" aria-label="plus icon">
            {' '}
            ➕{' '}
          </span>.
        </p>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen text-gray-900">
      <InstallPrompt />
      {/* Hero Section */}
      <Banner />
      {/* Features Section */}
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-12 text-center text-gray-900">
          Why use Split?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            Icon={Users}
            title="Group expense tracking"
            description="Easily add group members to your expense. All the expenses are added up and divided by the number of people in the group."
          />
          <FeatureCard
            Icon={UserPlus}
            title="Individual expense addition"
            description="Add expenses to your group. You can add your expenses, and they will be automatically added to your group's expenses."
          />
          <FeatureCard
            Icon={LineChart}
            title="Expense viewing"
            description="View all your expenses in one place. You can see how much you've spent and how much you owe."
          />
        </div>
      </div>
      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 text-center text-sm text-gray-400">
        By using Split, you agree to our Terms of Service and Privacy Policy,
        <div>Copyright © 2024 Ankith G. All rights reserved.</div>
      </footer>
    </div>
  );
}
