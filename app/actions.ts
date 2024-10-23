/* eslint-disable @typescript-eslint/no-explicit-any */

'use server';

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface SplitMember {
  id: string;
  name: string;
  amount?: number
}

interface Member {
  id: string;
  name: string;
}

interface ExpenseData {
  amount: number;
  description: string;
  groupId: string;
  splitPercentage: number;
  splitWith: SplitMember[];
  splitType?: "Equally" | "Indivually";
  createdBy: string;
  paidBy: Member | undefined;
}
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
  paid_by: string;
  split_with: {
    id: string;
    name: string;
    splitAmount: number;
  }[];
}

export async function addExpense(expenseData: ExpenseData) {
  const {
    amount,
    description,
    groupId,
    splitPercentage,
    splitWith,
    createdBy,
    paidBy,
  } = expenseData;

  try {
    // Calculate split amount for each member
    const splitAmount = (amount * (splitPercentage / 100)) / splitWith.length;

    // Create a JSON object with member information and split amounts
    const splitWithInfo = splitWith.map((member) => ({
      id: member.id,
      name: member.name,
      splitAmount: member.amount ?? splitAmount,
    }));

    console.log('aaa>>', `
    INSERT INTO expenses (
      amount, description, group_id, split_percentage, created_by, split_with, paid_by
    )
    VALUES (
      ${amount}, ${description}, ${groupId}, ${splitPercentage}, ${createdBy}, ${JSON.stringify(
    splitWithInfo
  )}, ${JSON.stringify(paidBy)}
    )
  `)
    // Insert the expense
    await sql`
      INSERT INTO expenses (
        amount, description, group_id, split_percentage, created_by, split_with, paid_by
      )
      VALUES (
        ${amount}, ${description}, ${groupId}, ${splitPercentage}, ${createdBy}, ${JSON.stringify(
      splitWithInfo
    )}, ${paidBy}
      )
    `;


    return { success: true };
  } catch (error) {
    console.error('Error adding expense:', error);
    return { success: false };
  }
}

export async function getGroupData(groupId: string, userName: string) {
  try {
    const expenses = (await sql`
      SELECT id, amount, description, created_by, split_with, paid_by, split_percentage
      FROM expenses
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `) as Expense[];

    const balances: Balance[] = [];
    const balanceMap = new Map<string, { amount: number; name: string }>();

    expenses.forEach((expense) => {
      const creatorSplit =
        expense.amount -
        expense.split_with.reduce(
          (sum: number, member: { splitAmount: number }) =>
            sum + member.splitAmount,
          0
        );

      // Get creator's name from split_with
      const creatorName =
        expense.split_with.find(
          (m: { name: string }) => m.name === expense.created_by
        )?.name || 'Unknown';

      // Update creator's balance
      const creatorBalance = balanceMap.get(expense.created_by) || {
        amount: 0,
        name: creatorName,
      };
      creatorBalance.amount += creatorSplit;
      balanceMap.set(expense.created_by, creatorBalance);
      // Update split members' balances
      expense.split_with.forEach(
        (member: { name: string; splitAmount: number }) => {
          const memberBalance = balanceMap.get(member.name) || {
            amount: 0,
            name: member.name,
          };
          memberBalance.amount -= member.splitAmount;
          balanceMap.set(member.name, memberBalance);
        }
      );
    });

    balanceMap.forEach(({ amount, name }) => {
      if (name !== userName && amount < 0) {
        balances.push({
          name,
          amount: Math.abs(amount),
          owes: true,
        });
      }
    });

    return { expenses, balances };
  } catch (error) {
    console.error('Error fetching group data:', error);
    return { expenses: [], balances: [] };
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    await sql`
      DELETE FROM expenses
      WHERE id = ${expenseId}
    `;
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { success: false };
  }
}

export async function exportExpenses(groupId: string) {
  try {
    const expenses = await sql`
      SELECT * FROM expenses
      WHERE group_id = ${groupId}
    `;
    return expenses;
  } catch (error) {
    console.error('Error exporting expenses:', error);
    throw error;
  }
}

export async function importExpenses(groupId: string, expenses: any[]) {
  try {
    for (const expense of expenses) {
      await sql`
        INSERT INTO expenses (
          amount, description, group_id, split_percentage, created_by, split_with, paid_by
        )
        VALUES (
          ${expense.amount}, ${expense.description}, ${groupId}, ${expense.split_percentage},
          ${expense.created_by}, ${JSON.stringify(expense.split_with)}, ${expense.paid_by}
        )
      `;
    }
  } catch (error) {
    console.error('Error importing expenses:', error);
    throw error;
  }
}
