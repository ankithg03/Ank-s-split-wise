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
  groupId?: string;
  splitPercentage: number;
  splitWith: SplitMember[];
  splitType?: "Equally" | "Indivually";
  createdBy: string;
  paidBy: Member | undefined;
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

interface GroupData {
  id?: string;
  name: string;
  created_by: string;
  members: string[];
  admins: string[];
}

interface TransactionRecord {
  [email: string]: {
    owes: { [email: string]: number };
    gets: { [email: string]: number };
  };
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

function calculateIndividualShares(expenses: Expense[]): TransactionRecord {
  const transactions: TransactionRecord = {};

  expenses.forEach(expense => {
      const paidByEmail = JSON.parse(expense.paid_by).id; // Parse the JSON string to get the email
      const splitAmount = expense.split_with;

      splitAmount.forEach(participant => {
          const participantEmail = participant.id;
          const amount = participant.splitAmount;

          // Exclude the person who paid
          if (participantEmail === paidByEmail) return;

          // Initialize transaction records if not present
          if (!transactions[participantEmail]) {
              transactions[participantEmail] = { owes: {}, gets: {} };
          }

          // Participant owes the payer
          if (!transactions[participantEmail].owes[paidByEmail]) {
              transactions[participantEmail].owes[paidByEmail] = 0;
          }
          transactions[participantEmail].owes[paidByEmail] += amount;

          // Payer gets from the participant
          if (!transactions[paidByEmail]) {
              transactions[paidByEmail] = { owes: {}, gets: {} };
          }
          if (!transactions[paidByEmail].gets[participantEmail]) {
              transactions[paidByEmail].gets[participantEmail] = 0;
          }
          transactions[paidByEmail].gets[participantEmail] += amount;
      });
  });

  // Calculate net amounts and adjust "owes" and "gets"
  for (const email in transactions) {
      const owes = transactions[email].owes;
      const gets = transactions[email].gets;

      for (const owedTo in owes) {
          const totalOwed = owes[owedTo] || 0;
          const totalReceived = gets[owedTo] || 0;

          // Transfer the net amount to either "owes" or "gets"
          if (totalOwed > totalReceived) {
              transactions[email].owes[owedTo] = totalOwed - totalReceived;
              delete transactions[email].gets[owedTo]; // Remove gets entry
          } else if (totalReceived > totalOwed) {
              transactions[email].gets[owedTo] = totalReceived - totalOwed;
              delete transactions[email].owes[owedTo]; // Remove owes entry
          } else {
              // If they are equal, clear both
              delete transactions[email].owes[owedTo];
              delete transactions[email].gets[owedTo];
          }
      }
  }

  return transactions;
}

export async function getGroupData(groupId: string) {
  try {
    const expenses = await sql`
      SELECT id, amount, description, created_by, split_with, paid_by, split_percentage, created_at
      FROM expenses
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `;

    return { expenses, balances: calculateIndividualShares(expenses as Expense[]) };
  } catch (error) {
    console.error('Error fetching group data:', error);
    return { expenses: [], balances: [], currentUserOwes: 0 };
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

export async function createGroup(groupData: GroupData) {
  const { name, created_by, members, admins } = groupData;

  try {
    const result = await sql`
      INSERT INTO groups (name, created_by, members, admins)
      VALUES (${name}, ${created_by}, ${JSON.stringify(members)}, ${JSON.stringify(admins)})
      RETURNING id
    `;
    return { success: true, groupId: result[0].id };
  } catch (error) {
    console.error('Error creating group:', error);
    return { success: false, error: 'Failed to create group' };
  }
}

export async function getGroupDetails(groupId: string) {
  try {
    let result = []
    if (groupId=="default") {
          result = await sql`
                    SELECT * FROM groups
                    WHERE name = ${groupId}
                  `;
    } else {
      result = await sql`
                SELECT * FROM groups
                WHERE id = ${groupId}
              `;
    }
   

    if (result.length === 0) {
      return { success: false, error: 'Group not found' };
    }

    return { success: true, group: result[0] };
  } catch (error) {
    console.error('Error fetching group details:', error);
    return { success: false, error: 'Failed to fetch group details' };
  }
}

export async function updateGroup(groupId: string, updateData: Partial<GroupData>) {
  const { name, members, admins } = updateData;

  try {
    await sql`
      UPDATE groups
      SET name = COALESCE(${name}, name),
          members = COALESCE(${JSON.stringify(members)}, members),
          admins = COALESCE(${JSON.stringify(admins)}, admins)
      WHERE id = ${groupId}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error updating group:', error);
    return { success: false, error: 'Failed to update group' };
  }
}

export async function deleteGroup(groupId: string) {
  try {
    await sql`
      DELETE FROM groups
      WHERE id = ${groupId}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error deleting group:', error);
    return { success: false, error: 'Failed to delete group' };
  }
}

export async function getUserGroups(userId: string) {
  try {
    const result = await sql`
    SELECT * FROM groups 
    WHERE admins LIKE ${'%' + userId + '%'};
  `;

    return { success: true, groups: result };
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return { success: false, error: 'Failed to fetch user groups' };
  }
}
