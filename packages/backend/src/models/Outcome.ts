import mongoose, { Schema, Document } from 'mongoose';

export interface IOutcome extends Document {
  natalChartId: mongoose.Types.ObjectId;
  ruleId: mongoose.Types.ObjectId;
  eventDate: Date;
  scheduledTime: Date;
  actualTime?: Date;
  eventType: string;
  success: boolean;
  rating?: number;
  notes?: string;
  transitData?: {
    planets: Array<{
      name: string;
      sign: string;
      degree: number;
    }>;
    aspects: Array<{
      planet1: string;
      planet2: string;
      type: string;
    }>;
  };
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutcomeSchema: Schema = new Schema(
  {
    natalChartId: { type: Schema.Types.ObjectId, ref: 'NatalChart', required: true },
    ruleId: { type: Schema.Types.ObjectId, ref: 'Rule', required: true },
    eventDate: { type: Date, required: true },
    scheduledTime: { type: Date, required: true },
    actualTime: Date,
    eventType: { type: String, required: true },
    success: { type: Boolean, required: true },
    rating: { type: Number, min: 1, max: 10 },
    notes: String,
    transitData: {
      planets: [
        {
          name: String,
          sign: String,
          degree: Number,
        },
      ],
      aspects: [
        {
          planet1: String,
          planet2: String,
          type: String,
        },
      ],
    },
    feedback: String,
  },
  { timestamps: true }
);

export default mongoose.model<IOutcome>('Outcome', OutcomeSchema);
