import { Request, Response } from 'express';
import { User } from '../models/User';

export async function createOrUpdateRegistration(req: Request, res: Response) {
  try {
    const { firebaseUid, personal, business } = req.body || {};

    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }
    if (!personal || !business) {
      return res.status(400).json({ error: 'personal and business are required' });
    }
    if (!personal.name || !personal.phone || !personal.groupId) {
      return res.status(400).json({ error: 'Missing required personal fields' });
    }
    if (!business.name || !business.category) {
      return res.status(400).json({ error: 'Missing required business fields' });
    }

    const now = new Date();

    // Normalize optional empty strings to undefined
    const normalizedPersonal = {
      ...personal,
      email: personal.email ? String(personal.email).trim() : undefined,
      profilePic: personal.profilePic ? String(personal.profilePic).trim() : undefined,
    };
    const normalizedBusiness = {
      ...business,
      phone: business.phone ? String(business.phone).trim() : undefined,
      email: business.email ? String(business.email).trim() : undefined,
    };

    const writeRes = await User.updateOne(
      { firebaseUid },
      {
        $set: {
          firebaseUid,
          personal: normalizedPersonal,
          business: normalizedBusiness,
          status: 'pending',
        },
        $setOnInsert: {
          registeredAt: now,
        },
      },
      { upsert: true }
    );

    const created = (writeRes as any).upsertedCount && (writeRes as any).upsertedCount > 0;
    const doc = await User.findOne({ firebaseUid });

    return res.status(created ? 201 : 200).json({ registration: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      // unique index conflict; fall back to fetch
      const existing = await User.findOne({ firebaseUid: req.body.firebaseUid });
      return res.status(200).json({ registration: existing });
    }
    console.error('createOrUpdateRegistration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRegistrationByUid(req: Request, res: Response) {
  try {
    const { firebaseUid } = req.params;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid param is required' });

    const doc = await User.findOne({ firebaseUid });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    return res.json({ registration: doc });
  } catch (err) {
    console.error('getRegistrationByUid error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateRegistrationStatus(req: Request, res: Response) {
  try {
    const { firebaseUid } = req.params;
    const { status } = req.body || {};

    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid param is required' });
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const doc = await User.findOneAndUpdate(
      { firebaseUid },
      { $set: { status } },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.json({ registration: doc });
  } catch (err) {
    console.error('updateRegistrationStatus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
