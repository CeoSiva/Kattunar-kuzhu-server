import { Request, Response } from 'express';
import { User } from '../models/User';
import { Business } from '../models/Business';

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

    // Upsert personal info into users
    const userWriteRes = await User.updateOne(
      { firebaseUid },
      {
        $set: {
          firebaseUid,
          personal: normalizedPersonal,
          status: 'pending',
        },
        $setOnInsert: {
          registeredAt: now,
        },
      },
      { upsert: true }
    );

    // Ensure we have userId to reference from business
    const userDoc = await User.findOne({ firebaseUid });

    // Upsert business info into businesses
    await Business.updateOne(
      { firebaseUid },
      {
        $set: {
          firebaseUid,
          name: normalizedBusiness.name,
          category: normalizedBusiness.category,
          phone: normalizedBusiness.phone,
          email: normalizedBusiness.email,
          location: normalizedBusiness.location,
          userId: userDoc?._id,
        },
      },
      { upsert: true }
    );

    const created = (userWriteRes as any).upsertedCount && (userWriteRes as any).upsertedCount > 0;
    const bizDoc = await Business.findOne({ firebaseUid });

    // Merge for response
    const response = {
      firebaseUid,
      personal: userDoc?.personal,
      business: bizDoc
        ? {
            name: bizDoc.name,
            category: bizDoc.category,
            phone: bizDoc.phone,
            email: bizDoc.email,
            location: bizDoc.location,
          }
        : undefined,
      status: userDoc?.status,
      registeredAt: userDoc?.registeredAt,
    };

    return res.status(created ? 201 : 200).json({ registration: response });
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

    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const biz = await Business.findOne({ firebaseUid });

    const response = {
      firebaseUid,
      personal: user.personal,
      business: biz
        ? {
            name: biz.name,
            category: biz.category,
            phone: biz.phone,
            email: biz.email,
            location: biz.location,
          }
        : undefined,
      status: user.status,
      registeredAt: user.registeredAt,
    };

    return res.json({ registration: response });
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
