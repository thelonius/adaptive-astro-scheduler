import mongoose, { Schema, Document } from 'mongoose';

export interface INatalChart extends Document {
  name: string;
  birthDate: Date;
  birthTime: string;
  birthPlace: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  planets: Array<{
    name: string;
    sign: string;
    degree: number;
    house: number;
  }>;
  houses: Array<{
    number: number;
    sign: string;
    degree: number;
  }>;
  aspects: Array<{
    planet1: string;
    planet2: string;
    type: string;
    orb: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const NatalChartSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    birthDate: { type: Date, required: true },
    birthTime: { type: String, required: true },
    birthPlace: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
    },
    planets: [
      {
        name: { type: String, required: true },
        sign: { type: String, required: true },
        degree: { type: Number, required: true },
        house: { type: Number, required: true },
      },
    ],
    houses: [
      {
        number: { type: Number, required: true },
        sign: { type: String, required: true },
        degree: { type: Number, required: true },
      },
    ],
    aspects: [
      {
        planet1: { type: String, required: true },
        planet2: { type: String, required: true },
        type: { type: String, required: true },
        orb: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<INatalChart>('NatalChart', NatalChartSchema);
