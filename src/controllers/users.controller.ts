import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthedRequest } from '../middleware/auth';
import { Business } from '../models/Business';

export async function getStatusByPhone(req: Request, res: Response) {
  try {
    const raw = String(req.query.phone || '').trim();
    if (!raw) return res.status(400).json({ error: 'phone query is required' });

    // normalize: keep last 10 digits (India), as stored by client
    const digits = raw.replace(/\D/g, '');
    const phone = digits.length > 10 ? digits.slice(-10) : digits;

    const user = await User.findOne({ 'personal.phone': phone });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ status: user.status });
  } catch (err) {
    console.error('getStatusByPhone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/users/by-uid?uid=...
export async function getUserPublicByUid(req: AuthedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    if (!authUid) return res.status(401).json({ error: 'Unauthorized' });

    const uid = String(req.query.uid || '').trim();
    if (!uid) return res.status(400).json({ error: 'uid query is required' });

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const business = await Business.findOne({ firebaseUid: uid });

    return res.json({
      firebaseUid: user.firebaseUid,
      user: {
        name: user.personal?.name,
        profilePic: user.personal?.profilePic,
        phone: user.personal?.phone,
        email: user.personal?.email,
        groupId: user.personal?.groupId,
      },
      business: business ? {
        name: (business as any).name,
        category: (business as any).category,
        logoUrl: (business as any).logoUrl,
        coverUrl: (business as any).coverUrl,
      } : undefined,
    });
  } catch (err) {
    console.error('getUserPublicByUid error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/users/me
export async function getMe(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findOne({ firebaseUid: uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      firebaseUid: user.firebaseUid,
      personal: user.personal,
      status: user.status,
      registeredAt: user.registeredAt,
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/users/me
export async function updateMe(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { name, email, phone, groupId, profilePic } = req.body || {};

    const update: any = {};
    if (name !== undefined) update['personal.name'] = String(name).trim();
    if (email !== undefined) update['personal.email'] = email ? String(email).trim().toLowerCase() : undefined;
    if (phone !== undefined) update['personal.phone'] = String(phone).trim();
    if (groupId !== undefined) update['personal.groupId'] = String(groupId).trim();
    if (profilePic !== undefined) update['personal.profilePic'] = String(profilePic).trim();

    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { $set: update },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      firebaseUid: user.firebaseUid,
      personal: user.personal,
      status: user.status,
      registeredAt: user.registeredAt,
    });
  } catch (err) {
    console.error('updateMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
