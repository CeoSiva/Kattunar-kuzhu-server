import { Request, Response } from 'express';
import { User } from '../models/User';

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
