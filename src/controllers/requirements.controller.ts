import { Response } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { Requirement } from '../models/Requirement';
import mongoose from 'mongoose';
import { RequirementResponse } from '../models/RequirementResponse';
import { User } from '../models/User';

// POST /api/requirements
export async function createRequirement(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, category, budget, timeline, isPublic, taggedMemberUid } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const doc = await Requirement.create({
      firebaseUid: uid,
      title: String(title).trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
      category: typeof category === 'string' ? category.trim() : undefined,
      budget: typeof budget === 'string' ? budget.trim() : undefined,
      timeline: timeline ? new Date(timeline) : undefined,
      isPublic: Boolean(isPublic !== undefined ? isPublic : true),
      taggedMemberUid: typeof taggedMemberUid === 'string' ? taggedMemberUid.trim() : undefined,
    });
    return res.status(201).json(doc);
  } catch (err) {
    console.error('createRequirement error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/requirements/public
export async function listPublicRequirements(req: AuthedRequest, res: Response) {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
    // Aggregate to enrich with creator user and their business logo
    const pipeline: any[] = [
      { $match: { isPublic: true } },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'firebaseUid',
          foreignField: 'firebaseUid',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'businesses',
          localField: 'firebaseUid',
          foreignField: 'firebaseUid',
          as: 'business',
        },
      },
      { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          budget: 1,
          timeline: 1,
          isPublic: 1,
          taggedMemberUid: 1,
          createdAt: 1,
          creator: {
            firebaseUid: '$firebaseUid',
            name: '$user.personal.name',
            profilePic: '$user.personal.profilePic',
          },
          business: {
            logoUrl: '$business.logoUrl',
            name: '$business.name',
          },
        },
      },
    ];
    const items = await Requirement.aggregate(pipeline).exec();
    return res.json({ items, count: items.length });
  } catch (err) {
    console.error('listPublicRequirements error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/requirements/me
export async function listMyRequirements(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const pipeline: any[] = [
      { $match: { firebaseUid: uid } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'businesses',
          localField: 'firebaseUid',
          foreignField: 'firebaseUid',
          as: 'business',
        },
      },
      { $unwind: { path: '$business', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          budget: 1,
          timeline: 1,
          isPublic: 1,
          taggedMemberUid: 1,
          createdAt: 1,
          business: {
            logoUrl: '$business.logoUrl',
            name: '$business.name',
          },
        },
      },
    ];
    const items = await Requirement.aggregate(pipeline).exec();
    return res.json({ items, count: items.length });
  } catch (err) {
    console.error('listMyRequirements error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/requirements/:id/responses
export async function createRequirementResponse(req: AuthedRequest, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const requirementId = String(req.params.id || '');
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(requirementId)) {
      return res.status(400).json({ error: 'Invalid requirement id' });
    }
    // Optional: ensure requirement exists and is public or allowed
    const reqDoc = await Requirement.findById(requirementId).lean();
    if (!reqDoc) return res.status(404).json({ error: 'Requirement not found' });
    if (!reqDoc.isPublic && uid !== reqDoc.taggedMemberUid && uid !== reqDoc.firebaseUid) {
      return res.status(403).json({ error: 'Not allowed to respond to this requirement' });
    }
    // Try to capture responder's User _id for reliable joins
    const userDoc = await User.findOne({ firebaseUid: uid }, { _id: 1 }).lean();
    const created = await RequirementResponse.create({
      requirementId: new mongoose.Types.ObjectId(requirementId),
      responderUid: uid,
      responderUserId: userDoc?._id,
      message: message.trim(),
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('createRequirementResponse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/requirements/:id/responses
export async function listRequirementResponses(req: AuthedRequest, res: Response) {
  try {
    const requirementId = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(requirementId)) {
      return res.status(400).json({ error: 'Invalid requirement id' });
    }
    // Aggregate to enrich responder info
    const pipeline: any[] = [
      { $match: { requirementId: new mongoose.Types.ObjectId(requirementId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          let: { rid: '$responderUserId', rUid: '$responderUid' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $and: [ { $ne: ['$$rid', null] }, { $eq: ['$_id', '$$rid'] } ] },
                    { $eq: ['$firebaseUid', '$$rUid'] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          message: 1,
          createdAt: 1,
          responder: {
            firebaseUid: '$responderUid',
            name: '$user.personal.name',
            profilePic: '$user.personal.profilePic',
            groupId: '$user.personal.groupId',
            phone: '$user.personal.phone',
            email: '$user.personal.email',
          },
        },
      },
    ];
    const items = await RequirementResponse.aggregate(pipeline).exec();
    return res.json({ items, count: items.length });
  } catch (err) {
    console.error('listRequirementResponses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
