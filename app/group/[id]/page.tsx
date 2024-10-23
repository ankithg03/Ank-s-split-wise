/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getGroupData, deleteExpense, exportExpenses, importExpenses, getGroupDetails } from '@/app/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Define interfaces for Balance and Expense
interface Balance {
  name: string;
  amount: number;
  owes: boolean;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  created_by: string;
  split_with: {
    id: string;
    name: string;
    splitAmount: number;
  }[];
  paid_by: string
  split_percentage?: number
}

// Add this utility function at the top of the file, outside the component
const formatAmount = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toFixed(2);
};

interface Group {
  id: string;
  name: string;
  created_by: string;
  members: string[];
}

function GroupPage() {
  const { id } = useParams();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      if (id && user) {
        const groupResult: any = await getGroupDetails(id as string);
        if (groupResult.success && groupResult?.group) {
          setGroup(groupResult?.group);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load group details',
            variant: 'destructive',
          });
          return;
        }

        const { expenses, balances } = await getGroupData(
          id as string,
          user.fullName || 'You'
        );
        setExpenses(expenses);
        setBalances(balances);
        setLoading(false);
      }
    }
    if (userLoaded) {
      fetchData();
    }
  }, [id, user, userLoaded, toast]);
  console.log('aaa group', group)
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

  console.log('Group:', group);
  console.log('Is Admin:', isAdmin);

  const groupDescription =
    "View and manage the details of your group. You can see the group's name, balances, and expenses. As an admin, you can also delete expenses.";

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!isAdmin) {
      toast({
        title: 'Error 🚨',
        description: 'Only admins can delete expenses. 🚫',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this expense?'
    );
    if (confirmed) {
      const result = await deleteExpense(expenseId);
      if (result.success) {
        // Refresh the page data
        const { expenses: updatedExpenses, balances: updatedBalances } =
          await getGroupData(id as string, user?.fullName || 'You');
        setExpenses(updatedExpenses);
        setBalances(updatedBalances);
        router.refresh(); // Refresh the page to update any server-side rendered content
      } else {
        toast({ title: 'Failed to delete expense. Please try again.' });
      }
    }
  };

  const handleExportData = async () => {
    if (!isAdmin) {
      toast({
        title: 'Error',
        description: 'Only admins can export data.',
        variant: 'destructive',
      });
      return;
    }
    const data = await exportExpenses(id as string);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${id}.json`;
    a.click();
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      toast({
        title: 'Error',
        description: 'Only admins can import data.',
        variant: 'destructive',
      });
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        try {
          const data = JSON.parse(content);
          await importExpenses(id as string, data);
          toast({ title: 'Data imported successfully' });
          // Refresh the page data
          const { expenses: updatedExpenses, balances: updatedBalances } =
            await getGroupData(id as string, user?.fullName || 'You');
          setExpenses(updatedExpenses);
          setBalances(updatedBalances);
        } catch (error) {
          toast({ title: 'Error importing data' + `, error: ${error}`, variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-4">{group.name}</h1>

        <div className='flex gap-4'>
          <Link href="/groups">
            <Button className="bg-purple-600 text-white px-4 py-2 rounded-md">
              All Groups
            </Button>
          </Link>
          <Link href={"/expense/"+id}>
            <Button className="bg-purple-600 text-white px-4 py-2 rounded-md">
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-gray-600 mb-8">{groupDescription}</p>

      <h2 className="text-2xl font-semibold mb-4">Balances</h2>
      {balances.length > 0 ? (
        balances.map((balance, index) => (
          <Card key={index} className="mb-8">
            <CardContent className="flex items-center p-6">
              <div
                className={`h-10 w-10 ${getRandomColor()} rounded-full mr-4 flex items-center justify-center text-white font-semibold`}
              >
                {getInitials(balance.name)}
              </div>
              <div>
                <h3 className="font-semibold">{balance.name}</h3>
                <p className="text-sm text-gray-600">
                  you owe ₹{formatAmount(balance.amount)} to {balance.name}
                </p>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-gray-600 mb-8">
          🌟 No outstanding balances. Everyone&apos;s all squared up! 🎉
        </p>
      )}

      <h2 className="text-2xl font-semibold mb-4">Expenses</h2>
      {expenses.length > 0 ? (
        expenses.map((expense) => (
          <Card key={expense.id} className="mb-4">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center">
                <div
                  className={`h-10 w-10 ${getRandomColor()} rounded-full mr-4 flex items-center justify-center text-white font-semibold`}
                >
                  {getInitials(expense.description)}
                </div>
                <div>
                  <h3 className="font-semibold">{expense.description}</h3>
                  <p className="text-sm text-gray-600">
                    Paid :₹{formatAmount(expense.amount)} ·
                    <div>
                      {expense.split_with.map((s) => (<div key={s.id}>{s.name} - {s.splitAmount}</div>))}
                    </div>
                  </p>
                  <p className="text-xs text-gray-500">
                    Split type:
                    {expense?.split_percentage && expense?.split_percentage>0?` Percentage - ${(
                      (expense.split_with[0]?.splitAmount / expense.amount) *
                      100
                    ).toFixed(2)}%`: " Individual"}
                    
                  </p>
                  <div className="text-xs text-gray-500">Paid by - {JSON.parse(expense.paid_by ?? '{}')?.name}</div>
                </div>
              </div>
              <Trash2
                className="text-red-500 cursor-pointer"
                size={20}
                onClick={() => handleDeleteExpense(expense.id)}
              />
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-gray-600 mb-8">
          💸 No expenses yet. Time to split some bills! 🧾
        </p>
      )}
      
      {isAdmin && (
        <div className="mt-8 flex gap-4">
          <Button onClick={handleExportData}>Export Data</Button>
          <label htmlFor="import-data" className="cursor-pointer">
            <Button>Import Data</Button>
            <input
              id="import-data"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportData}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default GroupPage;
