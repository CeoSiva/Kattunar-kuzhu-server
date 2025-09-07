import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { Referral } from '../models/Referral';
import { Requirement } from '../models/Requirement';
import { Meeting } from '../models/Meeting';

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  date.setHours(0, 0, 0, 0);
  return new Date(date.setDate(diff));
}

export async function getOverview(_req: AuthedRequest, res: Response) {
  try {
    const weekStart = startOfWeek();

    const [
      referralsTotal,
      referralsThisWeek,
      requirementsTotal,
      requirementsThisWeek,
      meetingsTotal,
      meetingsThisWeek,
    ] = await Promise.all([
      Referral.countDocuments({}),
      Referral.countDocuments({ createdAt: { $gte: weekStart } }),
      Requirement.countDocuments({}),
      Requirement.countDocuments({ createdAt: { $gte: weekStart } }),
      Meeting.countDocuments({}),
      Meeting.countDocuments({ createdAt: { $gte: weekStart } }),
    ]);

    return res.json({
      referrals: {
        total: referralsTotal,
        thisWeek: referralsThisWeek,
      },
      requirements: {
        total: requirementsTotal,
        thisWeek: requirementsThisWeek,
      },
      meetings: {
        total: meetingsTotal,
        thisWeek: meetingsThisWeek,
      },
      weekStart: weekStart.toISOString(),
    });
  } catch (err) {
    console.error('getOverview stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
