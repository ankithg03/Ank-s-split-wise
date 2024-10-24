/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getGroupDetails, updateGroup } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import Back from '@/components/Icons/Back';

interface Group {
  id: string;
  name: string;
  created_by: string;
  members: string[];
  admins: string;
}

function GroupPage() {
  const { id } = useParams();
  const { user, isLoaded: userLoaded } = useUser();
  const [members, setMembers] = useState<string[]>([]);
  const [adminMembers, setAdminMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {

      if (id && user) {

        const groupResult = await getGroupDetails(id as string);
        console.log('aaa', groupResult)

        if (groupResult.success && groupResult?.group) {
          setGroup(groupResult?.group as Group);
          setLoading(false)
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load group details',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    if (userLoaded) {
      fetchData();
    }
  }, [id, user, userLoaded, toast]);
  if (!userLoaded || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!group) {
    return <div>Group not found</div>;
  }

  const isAdmin = group.created_by === user?.id;


  const handleUpdateGroup = async () => {
    if (!group) return;

    const updateData = {
      name: groupName,
      members: members,
      admins: adminMembers,
    };

    const result = await updateGroup(group.id, updateData);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Group updated successfully',
      });
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update group',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex mb-2 items-center">
        <div 
            className='overflow-x-hidden -ml-3'
            role='button'
            onClick={()=>{
              if(typeof window !== 'undefined') {
                window.history.back()
              }
            }}
          >
            <Back />
          </div>
        <h1 className="text-3xl font-bold">Manage {group.name}</h1>
      </div>
     
      {isAdmin && (
       <>
           <div className="mb-4">
              <Label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </Label>
              <input
                type="text"
                id="groupName"
                defaultValue={group.name}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter group name"
              />
           </div>
           <div>
              <Label
                htmlFor="members"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Members
              </Label>
              <MultiSelect
                options={group.members.map((member: any) => ({ label: member, value: member}))}
                defaultValue={group.members.map((member: any) => member)}
                onValueChange={(selectedIds) => setMembers(selectedIds)}
                placeholder="Select members"
                disabled={!group}
              />
          </div>
          <div className='mt-4'>
              <Label
                htmlFor="adminMembers"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Admin Members
              </Label>
              <MultiSelect
                options={JSON.parse(group.admins).map((member: any) => ({ label: member, value: member}))}
                defaultValue={JSON.parse(group.admins).map((member: any) => member)}
                onValueChange={(selectedIds) => setAdminMembers(selectedIds)}
                placeholder="Select Members to be admin"
                disabled={!group}
              />
          </div>
          <Button className='mt-4' onClick={handleUpdateGroup}>Update</Button>
       </>
      )}
    </div>
  );
}

export default GroupPage;
