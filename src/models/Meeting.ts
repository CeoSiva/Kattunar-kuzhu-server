import mongoose, { Schema, Document, Model } from 'mongoose';

export type MeetingType = 'general' | 'special' | 'training';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export interface IMeeting extends Document {
  title: string;
  meetingType: MeetingType;
  description?: string;
  location: string;
  // The combined date-time when the meeting starts
  startsAt: Date;
  // Denormalized convenience fields for easy display/filtering
  dateString: string; // DD-MM-YYYY
  timeString: string; // hh:mm AM/PM
  status: MeetingStatus;
  createdBy?: string; // firebaseUid or user id (optional for now)
  // Optional geofence fields
  locationLat?: number;
  locationLng?: number;
  radiusMeters?: number; // if provided, attendance can be geofenced
}

const MeetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true, trim: true },
    meetingType: { type: String, enum: ['general', 'special', 'training'], default: 'general', index: true },
    description: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true, index: true },
    dateString: { type: String, required: true },
    timeString: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled', index: true },
    createdBy: { type: String },
    locationLat: { type: Number },
    locationLng: { type: Number },
    radiusMeters: { type: Number },
  },
  { timestamps: true, collection: 'meetings' }
);

MeetingSchema.index({ title: 1 });

export const Meeting: Model<IMeeting> =
  mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);
