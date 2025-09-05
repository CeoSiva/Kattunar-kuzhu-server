import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';

// GET /api/search/members?query=...&limit=20
export async function searchMembers(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const rawQuery = String(req.query.query || '').trim();
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));

    if (!rawQuery) {
      return res.json({ items: [], count: 0 });
    }

    // Case-insensitive partial match regex
    const regex = new RegExp(rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Aggregate users with joined business by firebaseUid
    const pipeline: any[] = [
      // Optionally filter only approved users. Comment out if not desired.
      { $match: { status: 'approved' } },
      {
        $lookup: {
          from: 'businesses',
          localField: 'firebaseUid',
          foreignField: 'firebaseUid',
          as: 'business',
        },
      },
      { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { 'personal.name': regex },
            { 'business.name': regex },
            { 'business.category': regex },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          firebaseUid: 1,
          user: {
            name: '$personal.name',
            profilePic: '$personal.profilePic',
            phone: '$personal.phone',
            email: '$personal.email',
            groupId: '$personal.groupId',
          },
          business: {
            name: '$business.name',
            category: '$business.category',
            logoUrl: '$business.logoUrl',
            coverUrl: '$business.coverUrl',
          },
        },
      },
      { $limit: limit },
    ];

    const docs = await User.aggregate(pipeline).exec();
    return res.json({ items: docs, count: docs.length });
  } catch (err) {
    console.error('searchMembers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
