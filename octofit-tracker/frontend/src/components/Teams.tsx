import { CapabilityCard } from './CapabilityCard.js';
export default function Teams() {
  return <CapabilityCard
    title="Teams"
    description="Manage teams and members."
    endpoint="/api/teams"
    dataKey="teams"
    emptyMessage="No teams yet."
    renderItem={(team: { name: string; members: string[] }) =>
      `${team.name} - Members: ${team.members.join(', ')}`}
  />;
}
