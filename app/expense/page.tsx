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
import { useOrganization, useOrganizationList, useUser } from '@clerk/nextjs';
import React, { useEffect, useState } from 'react';
import { addExpense } from '../actions';
import { useParams } from 'next/navigation';
import Back from '@/components/Icons/Back';


// ... (rest of the code remains unchanged)

interface Organization {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
}

interface SplitMember {
  id: string;
  name: string;
}

export const AddExpense = () => {
  const { id } = useParams();
  console.log('aaa', id)
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState('');
  const [splitPercentage, setSplitPercentage] = useState('100');
  const [splitWith, setSplitWith] = useState<SplitMember[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [paidBy, setPaidBy] = useState<Member | undefined>();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { userMemberships, isLoaded: isOrgListLoaded } = useOrganizationList({
    userMemberships: true,
  });
  const { isLoaded: isOrgLoaded } = useOrganization();
  const { toast } = useToast();
  const [splitType, setSplitType] = useState<'Equally' | 'Indivually'>('Equally');
  const [individualSplits, setIndividualSplits] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (isOrgListLoaded && userMemberships.data) {
      const orgs = userMemberships.data.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
      }));
      console.log('Organizations fetched:', orgs);
      setOrganizations(orgs);

      // Set the first organization as default and fetch its members
      if (orgs.length > 0 && !group) {
        const defaultOrgId = orgs[0].id;
        setGroup(defaultOrgId);
        fetchMembers(defaultOrgId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgListLoaded, userMemberships.data, group]);

  const fetchMembers = async (orgId: string) => {
    try {
      const org = await userMemberships.data?.find(
        (membership) => membership.organization.id === orgId
      )?.organization;
      if (org) {
        const memberships = await org.getMemberships();
        const membersList = memberships.data.map((membership) => ({
          id: membership.publicUserData.userId ?? '',
          name: `${membership.publicUserData.firstName ?? ''} ${
            membership.publicUserData.lastName ?? ''
          }`.trim(),
        }));
        setMembers(membersList);
        console.log('Members fetched:', membersList);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch group members. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleGroupChange = (orgId: string) => {
    setGroup(orgId);
    fetchMembers(orgId);
    setSplitWith([]); // Reset split with when group changes
  };

  const handleSplitTypeChange = (value: 'Equally' | 'Indivually') => {
    setSplitType(value);
    setSplitPercentage('100');
    setIndividualSplits({});
  };

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
      groupId: group,
      splitType,
      splitPercentage: splitType === 'Equally' ? parseFloat(splitPercentage) : 0,
      splitWith: splitType === 'Equally' 
        ? splitWith.map(member => ({ id: member.id, name: member.name, amount: parseFloat(amount)/(splitWith.length+1) }))
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
        setGroup('');
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

  if (!isUserLoaded || !isOrgListLoaded || !isOrgLoaded) {
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

        <div>
          <Label
            htmlFor="group"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Group
          </Label>
          {organizations.length > 0 ? (
            <Select onValueChange={handleGroupChange} value={group} required>
              <SelectTrigger id="group" className="w-full">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-gray-500">
              No groups available. Please create or join a group first.
            </p>
          )}
        </div>

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
            const paidBy = members.find(member=>member.id)
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
                <Label htmlFor={`split-${member.id}`} className="w-1/3">{member.name}</Label>
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
    </div>
  );
}

export default AddExpense