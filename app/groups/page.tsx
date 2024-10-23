'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { getUserGroups } from '@/app/actions';

// Define the type for group
type Group = {
  id: string;
  name: string;
  created_by: string;
  members: string[];
  admins: string[];
};

const GroupItem = ({ id, name, admins, members }: Group) => {
  const { user } = useUser();
  const isAdmin = user ? admins.includes(user.id) : false;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Link href={`/group/${id}`}>
      <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
          {initials}
        </div>
        <div className="flex-grow">
          <h3 className="font-semibold">{name}</h3>
          <p className="text-gray-500 text-sm">
            {isAdmin ? 'Admin' : 'Member'} • {members.length} members
          </p>
        </div>
      </div>
    </Link>
  );
};

const YourGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const fetchGroups = async () => {
      if (user?.id) {
        const { success, groups: fetchedGroups, error } = await getUserGroups(user?.emailAddresses?.[0]?.emailAddress);
        if (success && fetchedGroups) {
          setGroups(fetchedGroups as any);
        } else {
          console.error('Failed to fetch groups:', error);
        }
      }
    };
    if (isLoaded && user) {
      fetchGroups();
    }
  }, [isLoaded, user]);

  if (!isLoaded || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Your Groups</h1>
      <p className="text-gray-600 mb-6">
        {`
        View and manage all your groups in one place. You can see the groups
        you're a part of, your role in each group, and easily access each
        group's details.
        `}
      </p>
      <div className="space-y-8">
        {groups.map((group) => (
          <GroupItem key={group.id} {...group} />
        ))}
      </div>
      <Link href="/group">
        <Button className="mt-6 bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center p-4 rounded-lg shadow mb-4">
          <Plus className="w-4 h-4 mr-2" />
          Create New Group
        </Button>
      </Link>
    </div>
  );
};

export default YourGroups;
