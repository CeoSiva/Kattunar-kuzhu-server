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

// PATCH /api/oneonone/:id/complete
export async function completeOneOnOne(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: 'Unauthenticated' });
    const uid = req.user.uid;
    const { id } = req.params as { id: string };
    const { proofUrl } = req.body as { proofUrl?: string };
    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!proofUrl) return res.status(400).json({ error: 'proofUrl is required' });

    const doc = await OneOnOne.findById(id);
    if (!doc) return res.status(404).json({ error: 'One-on-one not found' });

    // Only requester can complete, and only if scheduled and start time reached
    if (doc.requesterUid !== uid) {
      return res.status(403).json({ error: 'Only the requester can complete this one-on-one' });
    }
    if (doc.status !== 'scheduled') {
      return res.status(400).json({ error: 'Only scheduled one-on-ones can be completed' });
    }
    const now = new Date();
    if (now.getTime() < new Date(doc.startsAt).getTime()) {
      return res.status(400).json({ error: 'Cannot complete before the scheduled start time' });
    }

    doc.proofPhotoUrl = String(proofUrl);
    doc.completedAt = new Date();
    doc.status = 'completed';
    doc.lastActionAt = new Date();
    await doc.save();
    return res.json({ oneOnOne: doc });
  } catch (err) {
    console.error('completeOneOnOne error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/oneonone/:id/reschedule
export async function requestReschedule(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: 'Unauthenticated' });
    const uid = req.user.uid;
    const { id } = req.params as { id: string };
    const { date, time, location, note } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!date && !time && !location) return res.status(400).json({ error: 'At least one of date, time, or location is required' });

    const doc = await OneOnOne.findById(id);
    if (!doc) return res.status(404).json({ error: 'One-on-one not found' });
    // Only participants may propose
    if (doc.requestedUid !== uid && doc.requesterUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to propose reschedule' });
    }

    const proposal: any = {
      proposedByUid: uid,
      proposedAt: new Date(),
      status: 'pending',
    };
    if (date) proposal.dateString = String(date).trim();
    if (time) proposal.timeString = String(time).trim();
    if (location) proposal.location = String(location).trim();
    if (note) proposal.note = String(note).trim();

    doc.proposal = proposal;
    doc.lastActionAt = new Date();
    await doc.save();
    return res.json({ oneOnOne: doc });
  } catch (err) {
    console.error('requestReschedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/oneonone/:id/reschedule/accept
export async function acceptReschedule(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: 'Unauthenticated' });
    const uid = req.user.uid;
    const { id } = req.params as { id: string };
    if (!id) return res.status(400).json({ error: 'id is required' });

    const doc = await OneOnOne.findById(id);
    if (!doc) return res.status(404).json({ error: 'One-on-one not found' });
    if (!doc.proposal || doc.proposal.status !== 'pending') {
      return res.status(400).json({ error: 'No pending proposal to accept' });
    }
    // Only the counterparty to proposedByUid may accept
    const counterParty = doc.proposal.proposedByUid === doc.requestedUid ? doc.requesterUid : doc.requestedUid;
    if (uid !== counterParty) {
      return res.status(403).json({ error: 'Not authorized to accept this proposal' });
    }

    // Apply proposed changes where present
    const nextDate = doc.proposal.dateString || doc.dateString;
    const nextTime = doc.proposal.timeString || doc.timeString;
    const nextLocation = doc.proposal.location || doc.location;
    const nextStartsAt = parseDateTime(nextDate, nextTime);
    if (!nextStartsAt) return res.status(400).json({ error: 'Invalid proposed date/time' });

    doc.dateString = nextDate;
    doc.timeString = nextTime;
    doc.location = nextLocation;
    doc.startsAt = nextStartsAt;
    doc.status = 'scheduled';
    doc.proposal.status = 'accepted';
    doc.lastActionAt = new Date();
    await doc.save();
    return res.json({ oneOnOne: doc });
  } catch (err) {
    console.error('acceptReschedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PATCH /api/oneonone/:id/reschedule/reject
export async function rejectReschedule(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: 'Unauthenticated' });
    const uid = req.user.uid;
    const { id } = req.params as { id: string };
    if (!id) return res.status(400).json({ error: 'id is required' });

    const doc = await OneOnOne.findById(id);
    if (!doc) return res.status(404).json({ error: 'One-on-one not found' });
    if (!doc.proposal || doc.proposal.status !== 'pending') {
      return res.status(400).json({ error: 'No pending proposal to reject' });
    }
    // Only the counterparty to proposedByUid may reject
    const counterParty = doc.proposal.proposedByUid === doc.requestedUid ? doc.requesterUid : doc.requestedUid;
    if (uid !== counterParty) {
      return res.status(403).json({ error: 'Not authorized to reject this proposal' });
    }

    doc.proposal.status = 'rejected';
    doc.lastActionAt = new Date();
    await doc.save();
    return res.json({ oneOnOne: doc });
  } catch (err) {
    console.error('rejectReschedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
// PATCH /api/oneonone/:id/approve
export async function approveOneOnOne(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const uid = req.user.uid;
    const { id } = req.params as { id: string };
    if (!id) return res.status(400).json({ error: 'id is required' });

    const doc = await OneOnOne.findById(id);
    if (!doc) return res.status(404).json({ error: 'One-on-one not found' });

    if (doc.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending one-on-ones can be approved' });
    }

    if (doc.requestedUid !== uid) {
      return res.status(403).json({ error: 'Only the requested member can approve this one-on-one' });
    }

    doc.status = 'scheduled';
    await doc.save();
    return res.json({ oneOnOne: doc });
  } catch (err) {
    console.error('approveOneOnOne error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
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
      status: 'pending',
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

export async function listReceivedRequests(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const uid = req.user.uid;
    const { status } = req.query as { status?: string };
    const statusFilter = status && ['pending', 'scheduled', 'completed', 'cancelled'].includes(status)
      ? { status }
      : {};
    const items = await OneOnOne.find({
      $and: [
        statusFilter,
        {
          $or: [
            { requestedUid: uid },
            // Legacy compatibility
            { participantBUid: uid as any },
          ],
        },
      ],
    })
      .sort({ startsAt: -1 })
      .limit(200);
    return res.json({ items });
  } catch (err) {
    console.error('listReceivedRequests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listSentRequests(req: AuthedRequest, res: Response) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    const uid = req.user.uid;
    const { status } = req.query as { status?: string };
    const statusFilter = status && ['pending', 'scheduled', 'completed', 'cancelled'].includes(status)
      ? { status }
      : {};
    const items = await OneOnOne.find({
      $and: [
        statusFilter,
        {
          $or: [
            { requesterUid: uid },
            // Legacy compatibility
            { participantAUid: uid as any },
          ],
        },
      ],
    })
      .sort({ startsAt: -1 })
      .limit(200);
    return res.json({ items });
  } catch (err) {
    console.error('listSentRequests error:', err);
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
