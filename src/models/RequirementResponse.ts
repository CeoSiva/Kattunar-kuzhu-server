import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRequirementResponse extends Document {
  requirementId: mongoose.Types.ObjectId;
  responderUid: string; // firebase uid of the responder
  responderUserId?: mongoose.Types.ObjectId; // reference to users._id (for compatibility)
  message: string;
}

const RequirementResponseSchema = new Schema<IRequirementResponse>(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true, index: true },
    responderUid: { type: String, required: true, index: true },
    responderUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: 'requirement_responses' }
);

RequirementResponseSchema.index({ requirementId: 1, createdAt: -1 });

export const RequirementResponse: Model<IRequirementResponse> =
  mongoose.models.RequirementResponse || mongoose.model<IRequirementResponse>('RequirementResponse', RequirementResponseSchema);
