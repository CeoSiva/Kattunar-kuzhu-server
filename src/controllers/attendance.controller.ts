import { Response } from 'express';
import mongoose from 'mongoose';
import { Attendance } from '../models/Attendance';
import { Meeting } from '../models/Meeting';
import { User } from '../models/User';
import { AuthedRequest } from '../middleware/auth';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function markAttendance(req: AuthedRequest, res: Response) {
  try {
    const meetingId = req.params.id;
    if (!mongoose.isValidObjectId(meetingId)) {
      return res.status(400).json({ error: 'Invalid meeting id' });
    }
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    // Optional: ensure meeting is scheduled and within reasonable time window (e.g., +/- 2 hours)
    // Skipping strict time checks for now.

    // Find the user by firebase uid
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found for current account' });

    const { status, timestamp, location } = req.body || {};

    // Geofence: if meeting has geofence configured, require client location and validate
    if (typeof meeting.locationLat === 'number' &&
        typeof meeting.locationLng === 'number' &&
        typeof meeting.radiusMeters === 'number') {
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return res.status(400).json({ error: 'Location coordinates required for this meeting' });
      }
      const distance = haversineMeters(meeting.locationLat, meeting.locationLng, location.lat, location.lng);
      if (distance > meeting.radiusMeters) {
        return res.status(403).json({ error: 'Outside allowed attendance radius', distance, radius: meeting.radiusMeters });
      }
    }

    // Create attendance (prevent duplicates by unique index)
    try {
      const doc = await Attendance.create({
        meetingId: new mongoose.Types.ObjectId(meetingId),
        userId: user._id,
        markedBy: req.user.uid,
        status: ['present', 'absent', 'late', 'excused'].includes(status) ? status : 'present',
        markedAt: timestamp ? new Date(timestamp) : new Date(),
        location: location && typeof location.lat === 'number' && typeof location.lng === 'number'
          ? { lat: location.lat, lng: location.lng, address: location.address }
          : undefined,
      });
      return res.status(201).json({ ok: true, attendance: doc });
    } catch (err: any) {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: 'Attendance already marked for this meeting' });
      }
      throw err;
    }
  } catch (err) {
    console.error('markAttendance error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
