'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs'; //useOrganizationList, 
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGroup, getGroupDetails } from '@/app/actions';
import { MultiSelect } from "@/components/ui/multi-select";

export default function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [invitedMembers, setInvitedMembers] = useState<string[]>([]);
  const [adminMembers, setAdminMembers] = useState<string[]>([]);
  const [useExistingUsers, setUseExistingUsers] = useState(false);

  const [members, setMembers] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  useEffect(()=>{
    getGroup()
  }, [])
  const getGroup = async ()=>{
    const group = await getGroupDetails('default')
    const members = group.success ? group?.group?.members : []
    setMembers(members)
  }
  // const { createOrganization } = useOrganizationList();
  const { toast } = useToast();
  const router = useRouter();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create a group',
      });
      return;
    }

    setIsLoading(true);
    try {
      const admins = Array.from(new Set([`${user.fullName} - ${currentUserEmail}`, ...adminMembers]));
      const members = Array.from(new Set([String(`${user.fullName} - ${currentUserEmail}`), ...invitedMembers.map(email => email)]));
      const groupData = {
        name: groupName,
        created_by: user.id,
        members: members,
        admins: admins
      };

      const { success, groupId, error } = await createGroup(groupData);

      if (success && groupId) {
        toast({
          title: 'Success',
          description: 'Group created successfully!',
        });
        router.push(`/group/${groupId}`);
      } else {
        throw new Error(error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create group. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = (selectedMembers: string[]) => {
    setInvitedMembers(selectedMembers);
  };
  const handleAdmin = (selectedMembers: string[]) => {
    setAdminMembers(selectedMembers);
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Create a group</h1>
      <p className="text-gray-600 mb-6">
        {'Split expenses with friends, roommates, and more.'}
      </p>

      <form onSubmit={handleCreateGroup} className="space-y-6">
        <div>
          <label
            htmlFor="groupName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Group name
          </label>
          <Input
            id="groupName"
            name="groupName"
            type="text"
            placeholder="Enter group name"
            className="w-full"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </div>

        {useExistingUsers ? (<>
          <div>
          <label
            htmlFor="inviteMembers"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Invite members
          </label>
          <MultiSelect
            options={members.map(member => ({ label: member, value: member }))}
            onValueChange={handleInvite}
            placeholder="Select members to invite"
            className="w-full"
          />
        </div>
        <div>
          <label
            htmlFor="adminMembers"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Admin Members
          </label>
          <MultiSelect
            options={members.map(member => ({ label: member, value: member }))}
            onValueChange={handleAdmin}
            placeholder="Select members to become admins"
            className="w-full"
          />
        </div>
        
        </>):''}
        <div>
          <label
            htmlFor="useExistingUsers"
            className="block text-sm font-medium text-gray-700 mb-1 custom-checkbox"
          >
          <input
            type="checkbox"
            id="useExistingUsers"
            name="useExistingUsers"
            checked={useExistingUsers}
            onChange={(e) => setUseExistingUsers(e.target.checked)}
            className="w-full"
          />
          <div>
            Use existing users
            </div>
          </label>
         
        </div>

        {invitedMembers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Invited members:
            </h3>
            <ul className="list-disc pl-5">
              {invitedMembers.map((email, index) => (
                <li key={index}>{email}</li>
              ))}
            </ul>
          </div>
        )}

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Group'}
        </Button>
      </form>
    </div>
  );
}
