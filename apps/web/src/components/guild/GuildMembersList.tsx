'use client';

import clsx from 'clsx';
import { GuildMember } from '@/types/guild';

interface GuildMembersListProps {
  members: GuildMember[];
}

const ROLE_LABEL: Record<GuildMember['role'], string> = {
  leader: 'Lider',
  officer: 'Subay',
  member: 'Üye',
};

const formatRelative = (iso: string): string => {
  const ts = new Date(iso).getTime();
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'şimdi';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
};

export function GuildMembersList({ members }: GuildMembersListProps) {
  return (
    <section aria-labelledby="members-heading" className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="members-heading" className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary">
            Üyeler — Katkı Sıralaması
          </h2>
          <p className="text-text-muted text-xs">
            Free-rider görünürlüğü için katkı puanına göre sıralı.
          </p>
        </div>
        <span className="badge badge-brand">{members.length} üye</span>
      </div>

      <ol className="grid gap-2">
        {members.map((m, idx) => (
          <li key={m.userId} className="member-row">
            <span className="member-row__rank" aria-label={`Sıra ${idx + 1}`}>
              {idx + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={clsx('member-row__online', !m.isOnline && 'member-row__online--off')}
                  aria-label={m.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                />
                <span className="member-row__name truncate">{m.name}</span>
              </div>
              <p className="member-row__sub">
                {ROLE_LABEL[m.role]} · {formatRelative(m.lastActiveAt)}
              </p>
            </div>
            <span
              className={clsx('member-row__role', `member-row__role--${m.role}`)}
              aria-hidden
            >
              {ROLE_LABEL[m.role]}
            </span>
            <div>
              <p className="member-row__contrib">
                {m.contributionPts.toLocaleString('tr-TR')}
              </p>
              <p className="member-row__sub text-right">
                +{m.weeklyContribution.toLocaleString('tr-TR')} bu hafta
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
