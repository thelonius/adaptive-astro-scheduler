import mongoose, { Schema, Document } from 'mongoose';

export interface IRule extends Document {
  name: string;
  description: string;
  natalChartId: mongoose.Types.ObjectId;
  conditions: Array<{
    type: string;
    planet?: string;
    aspect?: string;
    sign?: string;
    house?: number;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    priority: number;
    metadata: Record<string, any>;
  }>;
  generated: boolean;
  generatedBy?: string;
  prompt?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RuleSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    natalChartId: { type: Schema.Types.ObjectId, ref: 'NatalChart', required: true },
    conditions: [
      {
        type: { type: String, required: true },
        planet: String,
        aspect: String,
        sign: String,
        house: Number,
        operator: { type: String, required: true },
        value: Schema.Types.Mixed,
      },
    ],
    actions: [
      {
        type: { type: String, required: true },
        priority: { type: Number, default: 5 },
        metadata: { type: Map, of: Schema.Types.Mixed },
      },
    ],
    generated: { type: Boolean, default: false },
    generatedBy: String,
    prompt: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IRule>('Rule', RuleSchema);
