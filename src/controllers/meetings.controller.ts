import { Request, Response } from 'express';
import { Meeting } from '../models/Meeting';
import { Attendance } from '../models/Attendance';
import { User } from '../models/User';
import { AuthedRequest } from '../middleware/auth';

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  // dateStr: DD-MM-YYYY
  // timeStr: hh:mm AM/PM
  const dateMatch = /^([0-3]?\d)-([0-1]?\d)-(\d{4})$/.exec((dateStr || '').trim());
  if (!dateMatch) return null;
  const d = parseInt(dateMatch[1], 10);
  const m = parseInt(dateMatch[2], 10);
  const y = parseInt(dateMatch[3], 10);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return null;

  const timeMatch = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec((timeStr || '').trim());
  if (!timeMatch) return null;
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  // Use local time
  const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export async function createMeeting(req: Request, res: Response) {
  try {
    const { title, meetingType, description, location, date, time, createdBy,
      locationLat, locationLng, radiusMeters } = req.body || {};

    if (!title || !location || !date || !time) {
      return res.status(400).json({ error: 'title, location, date (DD-MM-YYYY), and time (hh:mm AM/PM) are required' });
    }

    const startsAt = parseDateTime(String(date), String(time));
    if (!startsAt) {
      return res.status(400).json({ error: 'Invalid date/time format. Expected DD-MM-YYYY and hh:mm AM/PM' });
    }

    const doc = await Meeting.create({
      title: String(title).trim(),
      meetingType: meetingType && ['general', 'special', 'training'].includes(meetingType) ? meetingType : 'general',
      description: description ? String(description).trim() : undefined,
      location: String(location).trim(),
      startsAt,
      dateString: String(date).trim(),
      timeString: String(time).trim(),
      status: 'scheduled',
      createdBy: createdBy ? String(createdBy) : undefined,
      // Optional geofence
      locationLat: typeof locationLat === 'number' ? locationLat : undefined,
      locationLng: typeof locationLng === 'number' ? locationLng : undefined,
      radiusMeters: typeof radiusMeters === 'number' ? radiusMeters : undefined,
    });

    return res.status(201).json({ meeting: doc });
  } catch (err) {
    console.error('createMeeting error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listMeetings(req: Request, res: Response) {
  try {
    const { status, type, upcoming, limit } = req.query as { status?: string; type?: string; upcoming?: string; limit?: string };

    const query: any = {};
    if (status && ['scheduled', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }
    if (type && ['general', 'special', 'training'].includes(type)) {
      query.meetingType = type;
    }
    // Upcoming filter: scheduled meetings starting from now
    if (String(upcoming).toLowerCase() === 'true') {
      query.status = 'scheduled';
      query.startsAt = { $gte: new Date() };
    }

    const lim = Math.min(Math.max(parseInt(String(limit || '10'), 10) || 10, 1), 100);
    const items = await Meeting.find(query).sort({ startsAt: 1 }).limit(lim);
    return res.json({ meetings: items });
  } catch (err) {
    console.error('listMeetings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Authenticated: returns meetings plus user's attendance status
export async function listMeetingsWithUserStatus(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const { status, type } = req.query as { status?: string; type?: string };

    const query: any = {};
    if (status && ['scheduled', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }
    if (type && ['general', 'special', 'training'].includes(type)) {
      query.meetingType = type;
    }

    const items = await Meeting.find(query).sort({ startsAt: 1 }).limit(200);

    // Find user document
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found for current account' });

    // Fetch user's attendance for these meetings
    const meetingIds = items.map((m) => m._id);
    const attendance = await Attendance.find({ meetingId: { $in: meetingIds }, userId: user._id });
    const map = new Map<string, { hasMarked: boolean; markedAt?: string }>();
    attendance.forEach((a) => {
      map.set(String(a.meetingId), { hasMarked: true, markedAt: a.markedAt?.toISOString() });
    });

    const enriched = items.map((m) => {
      const info = map.get(String(m._id));
      return {
        ...m.toObject(),
        hasMarked: info ? true : false,
        markedAt: info?.markedAt,
      };
    });

    return res.json({ meetings: enriched });
  } catch (err) {
    console.error('listMeetingsWithUserStatus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
