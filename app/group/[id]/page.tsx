/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getGroupData, deleteExpense, exportExpenses, importExpenses, getGroupDetails, addExpense } from '@/app/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Define interfaces for Balance and Expense
interface Balance {
  name: string;
  owes: { amount: number }[];
  gets: { from: string; amount: number }[];
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  created_by: string;
  created_at: Date;
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
          id as string
        );
        setExpenses(expenses as Expense[]);
        setBalances(balances as Balance[]);

        setLoading(false);
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

  const userEmail = user?.primaryEmailAddress?.emailAddress
  const admin = group.members?.find((admin: any) => {
    return admin.includes(userEmail)
  })
  const isAdmin = group.created_by === user?.id || admin;

  const groupDescription =
    "View and manage the details of your group. You can see the group's name, balances, and expenses. As an admin, you can also delete expenses.";

  const getInitials = (name: string): string => {
    // Remove the email part if it exists
    const namePart = name?.split('-')[0].trim();
    
    const words = namePart?.split(' ');
    
    if (words?.length === 1) {
      // If there's only one word, return the first two letters
      return namePart.slice(0, 2).toUpperCase();
    } else {
      // If there are multiple words, return the first letter of each word
      return words
        ?.map((word) => word[0])
        ?.join('')
        ?.toUpperCase()
        ?.slice(0, 2);
    }
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
        description: 'Only admins can delete expenses. ',
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
          await getGroupData(id as string);
        setExpenses(updatedExpenses as Expense[]);
        setBalances(updatedBalances as Balance[]);
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
            await getGroupData(id as string);
          setExpenses(updatedExpenses as Expense[]);
          setBalances(updatedBalances as Balance[]);
        } catch (error) {
          toast({ title: 'Error importing data' + `, error: ${error}`, variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSettle = async (transaction: { from: string; to: string; amount: number }) => {

    const expenseData = {
      amount: transaction.amount,
      description: `Settling with ${transaction.to.split('-')[0]}`,
      groupId: id as string,
      splitPercentage: 100,
      splitWith: [
        {
          id: transaction.to,
          name: transaction.to,
          amount: transaction.amount
        }
      ],
      createdBy: user?.id as string,
      paidBy: {
        id: transaction.from,
        name: transaction.from
      }
    };

    const result = await addExpense(expenseData);
    if (result.success) {
      toast({ title: 'Settlement recorded successfully' });
      // Refresh the page data
      const { expenses: updatedExpenses, balances: updatedBalances } = await getGroupData(id as string);
      setExpenses(updatedExpenses as Expense[]);
      setBalances(updatedBalances as Balance[]);
    } else {
      toast({ title: 'Failed to record settlement', variant: 'destructive' });
    }
  };

  const renderBalances = () => {
    const balanceEntries = Object.entries(balances);
    if (balanceEntries.length === 0) {
      return (
        <p className="text-gray-600 mb-8">
          🌟 No outstanding balances. Everyone&apos;s all squared up! 🎉
        </p>
      );
    }
    return balanceEntries?.map(([name, balance], index) => {
      const totalOwes = Object.values(balance.owes).reduce((sum, amount) => sum + (amount as any), 0);
      const totalGets = Object.values(balance.gets).reduce((sum, amount) => sum + (amount as any), 0);
      const netBalance = totalGets - totalOwes;

      if (netBalance === 0) return null; // Don't render if the balance is zero

      const isPositive = netBalance > 0;
      const absBalance = Math.abs(netBalance);

      return (
        <Card key={index} className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div
                className={`min-w-10	h-10 w-10 ${getRandomColor()} rounded-full mr-4 flex items-center justify-center text-white font-semibold`}
              >
                {getInitials(name!)}
              </div>
              <div>
                <h3 className="font-semibold">{name?.split('-')?.[0]}
                  <div className='text-xs text-gray-500'>{name?.split('-')?.[1]}</div>
                </h3>
                <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <span className='font-semibold'>Summary:</span> {isPositive ? 'Gets' : 'Owes'} ₹{formatAmount(absBalance)}
                </p>
              </div>
            </div>
            
            {Object.keys(balance.owes).length > 0 && (
              <div className="mb-2">
                <p className="font-semibold text-sm">Owes:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(balance.owes).map(([owesTo, amount], idx) => (
                    <li key={idx} className="text-sm text-red-600">
                      ₹{formatAmount(amount as any)} to {owesTo?.split('-')?.[0]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {Object.keys(balance.gets).length > 0 && (
              <div>
                <p className="font-semibold text-sm">Gets:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(balance.gets).map(([getsFrom, amount], idx) => (
                    <li key={idx} className="text-sm text-green-600">
                      ₹{formatAmount(amount as any)} from {getsFrom?.split('-')?.[0]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      );
    });
  };    


  const renderSimplifiedBalances = () => {
    const simplifiedBalances: { [key: string]: number } = {};
    // Calculate net balance for each person
    Object.entries(balances).forEach(([name, balance]) => {
      const totalOwes = Object.values(balance.owes).reduce((sum, amount) => sum + (amount as any ), 0);
      const totalGets = Object.values(balance.gets).reduce((sum, amount) => sum + (amount as any ), 0);
      simplifiedBalances[name] = totalGets - totalOwes;
    });

    const transactions: { from: string; to: string; amount: number }[] = [];

    // Calculate simplified transactions
    while (Object.values(simplifiedBalances).some(balance => Math.abs(balance) > 0.01)) {
      const debtor = Object.entries(simplifiedBalances).find(([, balance]) => balance < -0.01);
      const creditor = Object.entries(simplifiedBalances).find(([, balance]) => balance > 0.01);

      if (debtor && creditor) {
        const [debtorName, debtorBalance] = debtor;
        const [creditorName, creditorBalance] = creditor;
        const amount = Math.min(Math.abs(debtorBalance), creditorBalance);

        transactions.push({ from: debtorName, to: creditorName, amount });

        simplifiedBalances[debtorName] += amount;
        simplifiedBalances[creditorName] -= amount;
      }
    }

    return (
      <Accordion type="single" collapsible className="mt-8">
        <AccordionItem value="simplified-transactions">
          <AccordionTrigger>
            <h3 className="text-xl font-semibold underline-offset-0	">Simplified Transactions</h3>
          </AccordionTrigger>
          <AccordionContent>
            {transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{transaction.from.split('-')[0]}</TableCell>
                      <TableCell>{transaction.to.split('-')[0]}</TableCell>
                      <TableCell>₹{formatAmount(transaction.amount)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleSettle(transaction)}>
                          Settle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>No transactions pending</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  const totalAmount = expenses.reduce((sum, currentItem) => {
    const num = currentItem?.description.includes('Settling with') ? 0 : Number(currentItem.amount || 0) 
    return sum + num;
  }, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="grid md:flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-4">{group.name}</h1>

        <div className='grid grid-cols-2 md:flex gap-4'>
        <Link href={"/group/addUser/" + id}>
            <Button className="bg-purple-600 text-white px-4 py-2 rounded-md">
              Add Users
            </Button>
          </Link>
          <Link href={"/group/manage/" + id}>
            <Button className="bg-purple-600 text-white px-4 py-2 rounded-md">
              Manage
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
      <h2 className="text-2xl font-semibold mb-4">Total Spend: {totalAmount.toFixed(2)}</h2>

      <h2 className="text-2xl font-semibold mb-4">Balances</h2>
      {renderBalances()}

      <h2 className="text-2xl font-semibold mb-4">Expenses</h2>
      {expenses.length > 0 ? (
        expenses.map((expense) => (
          <Card key={expense.id} className="mb-4">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center">
                <div
                  className={`h-10 w-10 ${getRandomColor()} rounded-full mr-4 flex items-center justify-center text-white font-semibold`}
                >
                  {getInitials(expense.description!)}
                </div>
                <div>
                  <h3 className="font-semibold">{expense.description}</h3>
                  <p className="text-sm text-gray-600">
                    Paid: ₹{formatAmount(expense.amount)}
                    <div>
                      {expense.split_with.map((s) => (<div key={s.id}>{s.name?.split('-')?.[0]} -  ₹{formatAmount(s.splitAmount)}</div>))}
                    </div>
                  </p>
                  <p className="text-xs text-gray-500">
                    Split type:
                    {expense?.split_percentage && expense?.split_percentage>0?` Percentage - ${(
                      (expense.split_with[0]?.splitAmount / expense.amount) *
                      100
                    ).toFixed(2)}%`: " Individual"}
                    
                  </p>
                  <div className="text-xs text-gray-500 font-bold">Paid by - {JSON.parse(expense.paid_by ?? '{}')?.name?.split('-')?.[0]}</div>
                  <div className="text-xs text-gray-500 font-bold">Created - {expense?.created_at?.toLocaleDateString()}</div>
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

      {renderSimplifiedBalances()}
    </div>
  );
}

export default GroupPage;
