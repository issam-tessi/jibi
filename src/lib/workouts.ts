export const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Cardio', 'Abs'];

/** Suggested exercises per workout type (first match wins in the picker). */
export const EXERCISES: Record<string, string[]> = {
  Push: ['Bench press', 'Incline dumbbell press', 'Overhead press', 'Lateral raise', 'Dips', 'Triceps pushdown', 'Chest fly'],
  Pull: ['Deadlift', 'Pull-up', 'Lat pulldown', 'Barbell row', 'Seated cable row', 'Face pull', 'Biceps curl', 'Hammer curl'],
  Legs: ['Squat', 'Romanian deadlift', 'Leg press', 'Lunges', 'Leg curl', 'Leg extension', 'Calf raise', 'Hip thrust'],
  Upper: ['Bench press', 'Barbell row', 'Overhead press', 'Pull-up', 'Biceps curl', 'Triceps pushdown'],
  Lower: ['Squat', 'Romanian deadlift', 'Leg press', 'Leg curl', 'Calf raise'],
  'Full body': ['Squat', 'Bench press', 'Deadlift', 'Pull-up', 'Overhead press', 'Plank'],
  Cardio: ['Treadmill', 'Bike', 'Rowing machine', 'Jump rope', 'Stairs'],
  Abs: ['Plank', 'Crunches', 'Hanging leg raise', 'Cable crunch', 'Russian twist'],
};

/** Estimated one-rep max (Epley). */
export const oneRepMax = (weight: number, reps: number) => (reps === 1 ? weight : weight * (1 + reps / 30));

export const formatKg = (kg: number) => `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
