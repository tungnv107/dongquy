'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { ErrorBox } from './ui';
export function Invite({ token }: { token: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('/api/invitations/accept', {
              method: 'POST',
              body: JSON.stringify({ token }),
            });
            router.push('/dashboard');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Đang xử lý…' : 'Chấp nhận lời mời'}
      </button>
      {error && <ErrorBox message={error} />}
    </>
  );
}
