import { Response } from 'express';
import { Business } from '../models/Business';
import { AuthedRequest } from '../middleware/auth';

// GET /api/business/me
export async function getMyBusiness(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const business = await Business.findOne({ firebaseUid: uid });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    return res.json(business);
  } catch (err) {
    console.error('getMyBusiness error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/business/me
export async function updateMyBusiness(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name,
      // category is non-editable from UI; ignore if provided
      phone,
      email,
      location,
      description,
      logoUrl,
      coverUrl,
      hours,
      socials,
      gallery,
    } = req.body || {};

    const update: any = {};
    if (name !== undefined) update['name'] = String(name).trim();
    if (phone !== undefined) update['phone'] = String(phone).trim();
    if (email !== undefined) update['email'] = email ? String(email).trim().toLowerCase() : undefined;
    if (location !== undefined) update['location'] = String(location).trim();
    if (description !== undefined) update['description'] = String(description).trim();
    if (logoUrl !== undefined) update['logoUrl'] = String(logoUrl).trim();
    if (coverUrl !== undefined) update['coverUrl'] = String(coverUrl).trim();
    if (hours !== undefined) update['hours'] = Array.isArray(hours) ? hours : [];
    if (socials !== undefined) update['socials'] = socials || {};
    if (gallery !== undefined) update['gallery'] = Array.isArray(gallery) ? gallery : [];

    const business = await Business.findOneAndUpdate(
      { firebaseUid: uid },
      { $set: update },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    return res.json(business);
  } catch (err) {
    console.error('updateMyBusiness error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
