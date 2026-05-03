export function formatRelativeShort(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const sec = Math.floor(diff / 1000)
  if (sec < 10) return 'şimdi'
  if (sec < 60) return `${sec}sn`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa`
  const day = Math.floor(hr / 24)
  return `${day}g`
}

export function formatCountdown(iso: string): string {
  const now = Date.now()
  const target = new Date(iso).getTime()
  const diff = Math.max(0, target - now)
  const totalSec = Math.floor(diff / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}sa ${m.toString().padStart(2, '0')}dk`
  if (m > 0) return `${m}dk ${s.toString().padStart(2, '0')}sn`
  return `${s}sn`
}

export function roleLabel(role: 'leader' | 'officer' | 'member'): string {
  switch (role) {
    case 'leader':
      return 'Lider'
    case 'officer':
      return 'Subay'
    case 'member':
      return 'Üye'
  }
}

export function resourceLabel(resource: 'mineral' | 'gas'): string {
  return resource === 'mineral' ? 'Mineral' : 'Gaz'
}

export function resourceIcon(resource: 'mineral' | 'gas'): string {
  return resource === 'mineral' ? '💎' : '☢️'
}
