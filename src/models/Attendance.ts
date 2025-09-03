import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface IAttendance extends Document {
  meetingId: Types.ObjectId;
  userId: Types.ObjectId;
  markedBy: string; // firebaseUid
  status: AttendanceStatus;
  markedAt: Date;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

const LocationSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
  },
  { _id: false }
);

const AttendanceSchema = new Schema<IAttendance>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    markedBy: { type: String, required: true, index: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present', index: true },
    markedAt: { type: Date, default: Date.now, index: true },
    location: { type: LocationSchema },
  },
  { timestamps: true, collection: 'attendances' }
);

// Prevent duplicate attendance per meeting per user
AttendanceSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
