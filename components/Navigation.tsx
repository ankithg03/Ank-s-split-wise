import React from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="w-full flex flex-col justify-between items-center p-4 bg-gray-100">
     <div className='flex w-full justify-between'>
          <Link href="/" className="flex items-center space-x-2">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 fill-current"
              style={{ fill: '#6200EA' }}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="font-bold text-xl" style={{ color: '#6200EA' }}>
              {"Ank's Splitwise"}
            </span>
          </Link>
          <UserButton />
     </div>
      <div className="grid w-full md:flex items-center gap-2 mt-2">
        {/* Added new link for 'Your Groups' */}
        <Link
          href="/groups"
          className="hover:bg-purple-800  bg-purple-600  text-white p-2 rounded-lg"
        >
          Your Groups
        </Link>
        <Link
          href="/group"
          className="hover:bg-purple-800  bg-purple-600  text-white p-2 rounded-lg"
        >
          Create Group
        </Link>
        <Link
          href="/expense"
          className="hover:bg-purple-800  bg-purple-600  text-white p-2 rounded-lg"
        >
          Add Expense
        </Link>
      </div>
    </nav>
  );
}
