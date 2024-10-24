/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from "@/components/ui/multi-select"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs';
import React, { useEffect, useState } from 'react';
import { addExpense, getGroupDetails, getUserGroups } from '../actions'; // inviteUserToGroup
import { useParams } from 'next/navigation';
import Back from '@/components/Icons/Back';


// ... (rest of the code remains unchanged)

interface Member {
  id: string;
  name: string;
  email?: string;
  status?: string;
}

interface SplitMember {
  id: string;
  name: string;
}

export const AddExpense = () => {
  const { id } = useParams();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState<{ id: string; name: string } | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string, members?: any }[] | null>(null);

  const [splitPercentage, setSplitPercentage] = useState('100');
  const [splitWith, setSplitWith] = useState<SplitMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [paidBy, setPaidBy] = useState<Member | undefined>();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { toast } = useToast();
  const [splitType, setSplitType] = useState<'Equally' | 'Indivually'>('Equally');
  const [individualSplits, setIndividualSplits] = useState<{ [key: string]: number }>({});
  // const [inviteEmail, setInviteEmail] = useState('');
  // const [inviteName, setInviteName] = useState('');

  useEffect(() => {
    if (id) {
      fetchGroupDetails(id as string);
    }
  }, [id]);
  useEffect(()=>{
    fetchGroupDetailsByUser()
      
  }, [id, user])

  const fetchGroupDetailsByUser = async () => {
    if (!id && user?.emailAddresses?.[0]?.emailAddress) {
    const result = await getUserGroups(user?.emailAddresses?.[0]?.emailAddress)
      if (result?.success && result?.groups) {
        const group = result?.groups?.[0]
        setGroup({ id: group.id, name: group.name });
        setGroups(result.groups.map(group=>({ id: group.id, name: group.name, members: group.members })))
        const membersList = group.members.map((memberId: string) => ({
          id: memberId,
          name: memberId, // You might want to fetch actual names if available
        }));
        setMembers(membersList);
      }
    }
  }

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const result = await getGroupDetails(groupId);
      if (result.success && result.group) {
        setGroup({ id: result.group.id, name: result.group.name });
        const membersList = result.group.members.map((memberId: string) => ({
          id: memberId,
          name: memberId, // You might want to fetch actual names if available
        }));
        setMembers(membersList);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch group details. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch group details. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // const handleGroupChange = (orgId: string) => {
  //   setGroup({ id: orgId, name: orgId });
  //   setSplitWith([]); // Reset split with when group changes
  // };

  const handleIndividualSplitChange = (memberId: string, amount: string) => {
    setIndividualSplits(prev => ({
      ...prev,
      [memberId]: parseFloat(amount) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isUserLoaded || !user) {
      toast({
        title: 'Oops! 😅',
        description:
          "You need to be logged in to add an expense. Let's get you signed in!",
        variant: 'destructive',
      });
      return;
    }
    const expenseData = {
      amount: parseFloat(amount),
      description,
      groupId: group?.id,
      splitType,
      splitPercentage: splitType === 'Equally' ? parseFloat(splitPercentage) : 0,
      splitWith: splitType === 'Equally' 
        ? splitWith.map(member => ({ id: member.id, name: member.name, amount: parseFloat(amount)/(splitWith.length) }))
        : Object.entries(individualSplits).map(([id, amount]) => ({ id, name: members.find(m => m.id === id)?.name || '', amount })),
      createdBy: user.id,
      paidBy,
    };

    try {
      const result = await addExpense(expenseData);
      if (result.success) {
        toast({
          title: 'Expense Added! 🎉',
          description:
            'Your expense has been successfully recorded. Great job!',
        });

        // Reset form
        setAmount('');
        setDescription('');
        setGroup(null);
        setSplitPercentage('');
        setSplitWith([]);
      } else {
        throw new Error('Failed to add expense');
      }
    } catch (error: unknown) {
      console.error('Error adding expense:', error);
      toast({
        title: 'Uh-oh! 😟',
        description: "We couldn't add your expense. Let's give it another try!",
        variant: 'destructive',
      });
    }
  };

  // const handleInviteUser = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!group || !inviteEmail || !inviteName) return;

  //   try {
  //     const result = await inviteUserToGroup(group.id, inviteEmail, inviteName);
  //     if (result.success) {
  //       toast({
  //         title: 'Success',
  //         description: `Invitation sent to ${inviteEmail}`,
  //       });
  //       setInviteEmail('');
  //       setInviteName('');
  //       // Refresh group details to update the members list
  //       fetchGroupDetails(group.id);
  //     } else {
  //       toast({
  //         title: 'Error',
  //         description: result.error || 'Failed to invite user. Please try again.',
  //         variant: 'destructive',
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error inviting user:', error);
  //     toast({
  //       title: 'Error',
  //       description: 'Failed to invite user. Please try again.',
  //       variant: 'destructive',
  //     });
  //   }
  // };

  if (!isUserLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
      <div className='flex mb-2 items-center'>
        <div 
          className='overflow-x-hidden -ml-3'
          role='button'
          onClick={()=>{
            if(typeof window !== 'undefined') {
              window.history.back()
            }
          }}
        ><Back /></div>
        <h1 className="text-2xl font-bold">Add an expense</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Record your expenses and split them with your group.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Amount
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="₹0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full"
          />
        </div>

        <div>
          <Label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </Label>
          <Input
            id="description"
            placeholder="What did you pay for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full"
          />
        </div>
        {groups? ( <div>
          <Label
            htmlFor="paidBy"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Groups
          </Label>
          <Select onValueChange={(value)=>{
            const group = groups.find(group=>group.id==value)
            if (group) {
              const membersList = group.members.map((memberId: string) => ({
                id: memberId,
                name: memberId, // You might want to fetch actual names if available
              }));
              setMembers(membersList);
              setGroup(group)

            }
          }} value={group?.id} required>
            <SelectTrigger id="group_by" className="w-full">
              <SelectValue placeholder="Select Group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>): (<div>
          <Label
            htmlFor="group"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Group
          </Label>
          {group ? (
            <p className="text-sm text-gray-500">{group.name}</p>
          ) : (
            <p className="text-sm text-gray-500">Loading group...</p>
          )}
        </div>)}
        

        {/* <div>
          <Label
            htmlFor="splitPercentage"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Split Percentage
          </Label>
          <Input
            id="splitPercentage"
            type="number"
            placeholder="Enter percentage to split"
            value={splitPercentage}
            onChange={(e) => setSplitPercentage(e.target.value)}
            className="w-full"
          />
        </div> */}

        <div>
          <Label
            htmlFor="paidBy"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Paid By
          </Label>
          <Select onValueChange={(value)=>{
            const paidBy = members.find(member=>member.id==value)
            setPaidBy(paidBy)
          }} value={paidBy?.id} required>
            <SelectTrigger id="paidBy" className="w-full">
              <SelectValue placeholder="Select who paid" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label
            htmlFor="splitType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Split Type
          </Label>
          <Select onValueChange={(value: 'Equally' | 'Indivually') => setSplitType(value)} value={splitType}>
            <SelectTrigger id="splitType" className="w-full">
              <SelectValue placeholder="Select split type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Equally">Equally</SelectItem>
              <SelectItem value="Indivually">Indivually</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {splitType === 'Equally' ? (
          <>
            <div>
              <Input
                id="splitPercentage"
                type="hidden"
                placeholder="Enter percentage to split"
                value={'100%'}
                onChange={(e) => setSplitPercentage(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label
                htmlFor="splitWith"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Split with
              </Label>
              <MultiSelect
                options={members.map(member => ({ label: member.name, value: member.id }))}
                // selected={splitWith.map(member => member.id)}
                onValueChange={(selectedIds) => {
                  setSplitWith(
                    members.filter(member => selectedIds.includes(member.id))
                  );
                }}
                placeholder="Select members to split with"
                disabled={!group}
              />
            </div>
          </>
        ) : (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Individual Splits
            </Label>
            {members.map(member => (
              <div key={member.id} className="flex items-center space-x-2 mb-2">
                <Label htmlFor={`split-${member.id}`} className="w-1/3">{member.name?.split('-')?.[0]}</Label>
                <Input
                  id={`split-${member.id}`}
                  type="number"
                  placeholder="Amount"
                  value={individualSplits[member.id] || ''}
                  onChange={(e) => handleIndividualSplitChange(member.id, e.target.value)}
                  className="w-2/3"
                />
              </div>
            ))}
          </div>
        )}

        <Button type="submit" className="w-full">
          Save Expense
        </Button>
      </form>

      {/* <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invite User to Group</h3>
        <form onSubmit={handleInviteUser} className="space-y-4">
          <div>
            <Label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </Label>
            <Input
              type="email"
              id="inviteEmail"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="inviteName" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </Label>
            <Input
              type="text"
              id="inviteName"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Invite User</Button>
        </form>
      </div> */}

      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Group Members</h3>
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between">
              <span>{member.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AddExpense
