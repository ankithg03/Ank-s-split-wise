'use client'
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { addUserToGroup } from '@/app/actions'; // Assuming you have this action
import { fetchGroupMembers } from '@/app/actions'; // New action to fetch members

function AddUserPage() {
  const { id } = useParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const getMembers = async () => {
      const result = await fetchGroupMembers(id as string); // Fetch current members
      if (result.success) {
        setMembers(result.members); // Set the members state
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch members',
          variant: 'destructive',
        });
      }
    };

    getMembers();
  }, [id, toast]);

  const handleAddUser = async () => {
    if (!name || !email) {
      toast({
        title: 'Error',
        description: 'Both name and email are required',
        variant: 'destructive',
      });
      return;
    }

    const result = await addUserToGroup(id as string, name, email); // Call your action to add user

    if (result.success) {
      toast({
        title: 'Success',
        description: 'User added successfully',
      });
      setMembers((prev) => [...prev, `${name} - ${email}`]); // Update members state
      setName(''); // Clear the name input
      setEmail(''); // Clear the email input
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to add user',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add User to Group</h1>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        placeholder="Enter user name"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded mb-4"
        placeholder="Enter user email"
      />
      <button onClick={handleAddUser} className="w-full hover:bg-purple-800  bg-purple-600  text-white p-2 rounded-lg">
        Add User
      </button>

      <h2 className="text-xl font-bold mt-6">Current Members</h2>
      <ul className="mt-4">
        {members.map((member, index) => (
          <li key={index} className="border-b py-2">
            {member}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AddUserPage;