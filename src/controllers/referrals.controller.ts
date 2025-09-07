import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { Referral, type IReferral, type ReferralStatus } from '../models/Referral';

// POST /api/referrals
export async function createReferral(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const {
      receiverUid,
      type,
      referredMemberUid,
      referredManual,
      description,
      notes,
      attachments,
    } = req.body || {};

    if (!receiverUid || typeof receiverUid !== 'string') {
      return res.status(400).json({ error: 'receiverUid is required' });
    }
    if (type !== 'member' && type !== 'manual') {
      return res.status(400).json({ error: 'type must be member or manual' });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }

    if (type === 'member') {
      if (!referredMemberUid || typeof referredMemberUid !== 'string') {
        return res.status(400).json({ error: 'referredMemberUid is required for member type' });
      }
    } else if (type === 'manual') {
      const m = referredManual || {};
      if (!m.name || !m.businessName || !m.category) {
        return res.status(400).json({ error: 'manual referral requires name, businessName and category' });
      }
    }

    const payload: Partial<IReferral> = {
      giverUid: uid,
      receiverUid,
      type,
      referredMemberUid: type === 'member' ? referredMemberUid : undefined,
      referredManual: type === 'manual' ? {
        name: String(referredManual.name),
        businessName: String(referredManual.businessName),
        category: String(referredManual.category),
        email: referredManual?.email ? String(referredManual.email) : undefined,
      } : undefined,
      description: description.trim(),
      notes: typeof notes === 'string' ? notes.trim() : undefined,
      attachments: Array.isArray(attachments) ? attachments.map((a: any) => ({ name: a?.name, url: String(a?.url) })).filter(a => !!a.url) : [],
      status: 'pending',
    } as any;

    const created = await Referral.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    console.error('createReferral error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/referrals/:id/confirm
export async function confirmReferral(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const id = String(req.params.id || '');
    const doc = await Referral.findById(id);
    if (!doc) return res.status(404).json({ error: 'Referral not found' });
    if (doc.receiverUid !== uid) return res.status(403).json({ error: 'Forbidden' });
    if (doc.status !== 'pending') return res.status(400).json({ error: 'Only pending referrals can be confirmed' });
    doc.status = 'confirmed' as ReferralStatus;
    await doc.save();
    return res.json(doc.toObject());
  } catch (err) {
    console.error('confirmReferral error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/referrals/:id/thank-note
export async function submitThankNote(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const id = String(req.params.id || '');
    const { message, amount } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return res.status(400).json({ error: 'amount must be a non-negative number' });
    }
    const doc = await Referral.findById(id);
    if (!doc) return res.status(404).json({ error: 'Referral not found' });
    if (doc.receiverUid !== uid) return res.status(403).json({ error: 'Forbidden' });
    if (doc.status !== 'confirmed') return res.status(400).json({ error: 'Only confirmed referrals can be completed' });
    doc.thankNoteMessage = message.trim();
    doc.thankNoteAmount = amt;
    doc.status = 'completed' as ReferralStatus;
    await doc.save();
    return res.json(doc.toObject());
  } catch (err) {
    console.error('submitThankNote error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/referrals/given
export async function listGivenReferrals(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const items = await Referral.find({ giverUid: uid }).sort({ createdAt: -1 }).lean();
    return res.json({ items, count: items.length });
  } catch (err) {
    console.error('listGivenReferrals error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/referrals/taken
export async function listTakenReferrals(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const statusRaw = String(req.query.status || '').trim();
    const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
    const filter: any = { receiverUid: uid };
    if (allowed.includes(statusRaw)) {
      filter.status = statusRaw;
    }

    const items = await Referral.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ items, count: items.length });
  } catch (err) {
    console.error('listTakenReferrals error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/referrals/:id/status
export async function updateReferralStatus(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const id = String(req.params.id || '');
    const { status } = req.body || {};
    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await Referral.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Referral not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateReferralStatus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
