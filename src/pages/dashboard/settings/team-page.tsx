import { TeamRolesTable } from './team-roles-table'
import { SeatManagement } from './seat-management'
import { useQuery } from '@tanstack/react-query'
import { getStudio } from '@/api/studios'

export function TeamPage() {
  const { data: studio } = useQuery({
    queryKey: ['studio', 'default'],
    queryFn: () => getStudio('default'),
  })

  const seatsUsed = studio?.team_members?.filter((m) => m.status === 'active').length ?? 0
  const maxSeats = studio?.subscription?.seats ?? 10

  return (
    <div className="space-y-6">
      <SeatManagement seatsUsed={seatsUsed} maxSeats={maxSeats} />
      <TeamRolesTable />
    </div>
  )
}
