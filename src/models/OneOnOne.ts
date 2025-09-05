import mongoose, { Schema, Document, Model } from 'mongoose';

export type OneOnOneStatus = 'scheduled' | 'completed' | 'cancelled';

export interface IOneOnOne extends Document {
  title: string;
  description?: string;
  location: string;
  // The combined date-time when the meeting starts
  startsAt: Date;
  // Denormalized convenience fields for easy display/filtering
  dateString: string; // DD-MM-YYYY
  timeString: string; // hh:mm AM/PM
  status: OneOnOneStatus;
  // Firebase auth UIDs
  requesterUid: string; // who is requesting
  requestedUid: string; // who is being requested
  // Optional: track who created it
  createdBy?: string; // firebaseUid
}

const OneOnOneSchema = new Schema<IOneOnOne>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true, index: true },
    dateString: { type: String, required: true },
    timeString: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled', index: true },
    requesterUid: { type: String, required: true, index: true },
    requestedUid: { type: String, required: true, index: true },
    createdBy: { type: String },
  },
  { timestamps: true, collection: 'one_on_one_meetings' }
);

// Compound index for efficient lookups
OneOnOneSchema.index({ requesterUid: 1, requestedUid: 1, startsAt: -1 });

export const OneOnOne: Model<IOneOnOne> =
  mongoose.models.OneOnOne || mongoose.model<IOneOnOne>('OneOnOne', OneOnOneSchema);
