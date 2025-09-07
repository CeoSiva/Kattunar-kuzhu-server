import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReferralStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type ReferralType = 'member' | 'manual';

export interface IReferral extends Document {
  giverUid: string; // the member giving the referral (auth user)
  receiverUid: string; // the member to whom the referral is given (selected in sheet 1)
  type: ReferralType;
  referredMemberUid?: string; // the member who is being referred (if type === 'member')
  referredManual?: {
    name: string;
    businessName: string;
    category: string;
    email?: string;
  };
  description: string;
  notes?: string;
  attachments?: { name?: string; url: string }[];
  thankNoteMessage?: string;
  thankNoteAmount?: number;
  status: ReferralStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ManualSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    businessName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

const AttachmentSchema = new Schema(
  {
    name: { type: String },
    url: { type: String, required: true },
  },
  { _id: false }
);

const ReferralSchema = new Schema<IReferral>(
  {
    giverUid: { type: String, required: true, index: true },
    receiverUid: { type: String, required: true, index: true },
    type: { type: String, enum: ['member', 'manual'], required: true },
    referredMemberUid: { type: String, index: true },
    referredManual: { type: ManualSchema },
    description: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    attachments: { type: [AttachmentSchema], default: [] },
    thankNoteMessage: { type: String, trim: true },
    thankNoteAmount: { type: Number, min: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending', index: true },
  },
  { timestamps: true, collection: 'referrals' }
);

ReferralSchema.index({ giverUid: 1, createdAt: -1 });
ReferralSchema.index({ receiverUid: 1, createdAt: -1 });

export const Referral: Model<IReferral> =
  mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema);
