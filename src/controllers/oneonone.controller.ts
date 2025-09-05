import { Response } from 'express';
import { OneOnOne } from '../models/OneOnOne';
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

  const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export async function createOneOnOne(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { title, description, location, date, time, requestedUid } = req.body || {};

    if (!title || !location || !date || !time || !requestedUid) {
      return res.status(400).json({ error: 'title, location, date (DD-MM-YYYY), time (hh:mm AM/PM), and requestedUid are required' });
    }

    if (typeof requestedUid !== 'string' || requestedUid.trim().length === 0) {
      return res.status(400).json({ error: 'requestedUid must be a non-empty string (firebase UID of the other user)' });
    }

    const startsAt = parseDateTime(String(date), String(time));
    if (!startsAt) {
      return res.status(400).json({ error: 'Invalid date/time format. Expected DD-MM-YYYY and hh:mm AM/PM' });
    }

    const doc = await OneOnOne.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : undefined,
      location: String(location).trim(),
      startsAt,
      dateString: String(date).trim(),
      timeString: String(time).trim(),
      status: 'scheduled',
      requesterUid: req.user.uid,
      requestedUid: String(requestedUid).trim(),
      createdBy: req.user.uid,
    });

    return res.status(201).json({ oneOnOne: doc });
  } catch (err) {
    console.error('createOneOnOne error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listMyOneOnOnes(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const uid = req.user.uid;
    const items = await OneOnOne.find({
      $or: [
        { requesterUid: uid },
        { requestedUid: uid },
        // Backward compatibility with legacy fields
        { participantAUid: uid as any },
        { participantBUid: uid as any },
      ],
    })
      .sort({ startsAt: -1 })
      .limit(200);

    return res.json({ items });
  } catch (err) {
    console.error('listMyOneOnOnes error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listBetweenTwoUsers(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const { otherUid } = req.query as { otherUid?: string };
    if (!otherUid) {
      return res.status(400).json({ error: 'otherUid is required as a query param' });
    }

    const uid = req.user.uid;
    const items = await OneOnOne.find({
      $or: [
        { requesterUid: uid, requestedUid: otherUid },
        { requesterUid: otherUid, requestedUid: uid },
        // Backward compatibility with legacy fields
        { participantAUid: uid as any, participantBUid: otherUid as any },
        { participantAUid: otherUid as any, participantBUid: uid as any },
      ],
    })
      .sort({ startsAt: -1 })
      .limit(200);

    return res.json({ items });
  } catch (err) {
    console.error('listBetweenTwoUsers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
