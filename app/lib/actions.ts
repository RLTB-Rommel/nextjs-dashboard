'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { z } from 'zod';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// Use your pooled Neon URL (POSTGRES_URL / DATABASE_URL). SSL required on Neon.
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });



const InvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.coerce.number().gt(0, 'Amount must be > 0'),
  status: z.enum(['pending', 'paid']).default('pending'),
});


export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message: string | null;
};

export const initialState: State = { message: null, errors: {} };


export async function createInvoice(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const parsed = InvoiceSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to create invoice.',
    };
  }

  const { customerId, amount, status } = parsed.data;
  const amountInCents = Math.round((amount + Number.EPSILON) * 100);
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('[createInvoice] DB error:', error);
    return { message: 'Database error. Failed to create invoice.', errors: {} };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}


export async function updateInvoice(
  id: string,
  formData: FormData
): Promise<void> {
  const customerId = String(formData.get('customerId') ?? '');
  const amountRaw = formData.get('amount');
  const status = String(formData.get('status') ?? 'pending');

  const amount = Number(amountRaw);
  if (!id || !customerId || !Number.isFinite(amount) || amount <= 0 || !status) {
    redirect(`/dashboard/invoices/${id}/edit?error=invalid`);
  }

  const amountInCents = Math.round((amount + Number.EPSILON) * 100);

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId},
          amount      = ${amountInCents},
          status      = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('[updateInvoice] DB error:', error);
    redirect(`/dashboard/invoices/${id}/edit?error=update-failed`);
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}


export async function deleteInvoice(formData: FormData): Promise<void> {
  const id = (formData.get('id') as string | null)?.trim() || null;

  if (!id) {
    redirect('/dashboard/invoices?error=missing-id');
  }

  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    console.error('[deleteInvoice] DB error:', error);
    redirect('/dashboard/invoices?error=delete-failed');
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}


export async function authenticate(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn('credentials', formData); // NextAuth v5
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}