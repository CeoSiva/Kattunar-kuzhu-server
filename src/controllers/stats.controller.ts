import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { Referral } from '../models/Referral';
import { Requirement } from '../models/Requirement';
import { Meeting } from '../models/Meeting';
import { User } from '../models/User';
import { Attendance } from '../models/Attendance';

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  date.setHours(0, 0, 0, 0);
  return new Date(date.setDate(diff));
}

// Per-user overview (authenticated)
export async function getUserOverview(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: 'Unauthenticated' });
    const uid = req.user.uid;
    const weekStart = startOfWeek();

    // Find the app User document for attendance linkage
    const userDoc = await User.findOne({ firebaseUid: uid });

    const [
      // Requirements created by this user
      myReqTotal,
      myReqWeek,
      // Referrals where user is giver or receiver
      myRefGivenTotal,
      myRefGivenWeek,
      myRefTakenTotal,
      myRefTakenWeek,
      // Meetings attended (via Attendance by userId)
      myAttendTotal,
      myAttendWeek,
    ] = await Promise.all([
      Requirement.countDocuments({ firebaseUid: uid }),
      Requirement.countDocuments({ firebaseUid: uid, createdAt: { $gte: weekStart } }),

      Referral.countDocuments({ giverUid: uid }),
      Referral.countDocuments({ giverUid: uid, createdAt: { $gte: weekStart } }),
      Referral.countDocuments({ receiverUid: uid }),
      Referral.countDocuments({ receiverUid: uid, createdAt: { $gte: weekStart } }),

      userDoc ? Attendance.countDocuments({ userId: userDoc._id }) : Promise.resolve(0),
      userDoc ? Attendance.countDocuments({ userId: userDoc._id, createdAt: { $gte: weekStart } }) : Promise.resolve(0),
    ]);

    const referralsTotal = myRefGivenTotal + myRefTakenTotal;
    const referralsWeek = myRefGivenWeek + myRefTakenWeek;

    return res.json({
      referrals: { total: referralsTotal, thisWeek: referralsWeek },
      requirements: { total: myReqTotal, thisWeek: myReqWeek },
      meetings: { total: myAttendTotal, thisWeek: myAttendWeek },
      weekStart: weekStart.toISOString(),
    });
  } catch (err) {
    console.error('getUserOverview stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getRequirementProgress(req: AuthedRequest, res: Response) {
  try {
    const mode = String(req.query.mode || 'weekly'); // 'weekly' or 'monthly'
    if (mode !== 'weekly' && mode !== 'monthly') {
      return res.status(400).json({ error: 'mode must be weekly or monthly' });
    }

    if (mode === 'weekly') {
      // Last 8 weeks (including current), grouped by ISO week
      const now = startOfDay(new Date());
      const start = addDays(now, -7 * 7); // 8 weeks window
      // Fetch requirements in window
      const docs = await Requirement.find({ createdAt: { $gte: start } }).select('createdAt').lean();
      // Build week labels as 'Wk NN'
      const weeks: { label: string; start: Date }[] = [];
      const labels: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = addDays(now, -i * 7);
        const weekNum = getISOWeek(d);
        const year = d.getFullYear();
        const label = `Wk ${weekNum}`;
        weeks.push({ label, start: d });
        labels.push(label);
      }
      const counts = labels.map(() => 0);
      docs.forEach((doc: any) => {
        const w = getISOWeek(new Date(doc.createdAt));
        const label = `Wk ${w}`;
        const idx = labels.indexOf(label);
        if (idx >= 0) counts[idx] += 1;
      });
      return res.json({ mode, labels, counts });
    }

    // monthly: last 6 months including current
    const now = startOfMonth(new Date());
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const docs = await Requirement.find({ createdAt: { $gte: start } }).select('createdAt').lean();
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('en-US', { month: 'short' }));
    }
    const counts = labels.map(() => 0);
    docs.forEach((doc: any) => {
      const d = new Date(doc.createdAt);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const idx = labels.indexOf(label);
      if (idx >= 0) counts[idx] += 1;
    });
    return res.json({ mode, labels, counts });
  } catch (err) {
    console.error('getRequirementProgress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper: ISO week number
function getISOWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year.
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp as any) - (yearStart as any)) / 86400000 + 1) / 7);
  return weekNo;
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
