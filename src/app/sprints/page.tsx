import prisma from '@/lib/prisma';
import UnifiedSprintsClient from './SprintsClient';

export default async function SprintsPlannerPage() {
  const allSprints = await prisma.studySprint.findMany({
    include: { subject: true },
    orderBy: { createdAt: 'desc' }
  });

  return <UnifiedSprintsClient initialSprints={allSprints} />;
}
