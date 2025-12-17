import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  // Required fields
  name: string;
  email: string;
  primaryMobile: string;
  secondaryMobile?: string;
  aadhaar: string;
  pan: string;
  dateOfBirth: Date;
  placeOfBirth: string;
  currentAddress: string;
  permanentAddress: string;

  // Best practice fields
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  version: number;

  // Methods
  maskSensitiveData(): Partial<IUser>;
  calculateAge(): number;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    primaryMobile: {
      type: String,
      required: [true, 'Primary mobile is required'],
      match: [/^[0-9]{10}$/, 'Primary mobile must be a 10-digit number'],
    },
    secondaryMobile: {
      type: String,
      match: [/^[0-9]{10}$/, 'Secondary mobile must be a 10-digit number'],
    },
    aadhaar: {
      type: String,
      required: [true, 'Aadhaar is required'],
      unique: true,
      match: [/^[0-9]{12}$/, 'Aadhaar must be a 12-digit number'],
    },
    pan: {
      type: String,
      required: [true, 'PAN is required'],
      unique: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN format'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function (value: Date) {
          return value < new Date();
        },
        message: 'Date of birth must be in the past',
      },
    },
    placeOfBirth: {
      type: String,
      required: [true, 'Place of birth is required'],
      trim: true,
    },
    currentAddress: {
      type: String,
      required: [true, 'Current address is required'],
      trim: true,
    },
    permanentAddress: {
      type: String,
      required: [true, 'Permanent address is required'],
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: String,
    },
    updatedBy: {
      type: String,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ aadhaar: 1 });
userSchema.index({ pan: 1 });
userSchema.index({ primaryMobile: 1 });
userSchema.index({ isDeleted: 1 });

// Compound index for active users
userSchema.index({ isDeleted: 1, createdAt: -1 });

// Instance method to mask sensitive data
userSchema.methods.maskSensitiveData = function (): Partial<IUser> {
  const user = this.toObject();

  // Mask Aadhaar (show only last 4 digits)
  if (user.aadhaar) {
    user.aadhaar = 'XXXX-XXXX-' + user.aadhaar.slice(-4);
  }

  // Mask PAN (show only last 4 characters)
  if (user.pan) {
    user.pan = 'XXXXX' + user.pan.slice(-4);
  }

  return user;
};

// Instance method to calculate age
userSchema.methods.calculateAge = function (): number {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// Pre-save middleware for version increment
userSchema.pre('save', function (next) {
  if (!this.isNew) {
    this.version += 1;
  }
  next();
});

// Query middleware to exclude soft-deleted users by default
userSchema.pre(/^find/, function (next) {
  // Cast 'this' to Query type to access query methods
  // @ts-ignore - Mongoose types are complex, this is safe
  const query = this.getQuery();
  if (query.isDeleted === undefined) {
    // @ts-ignore
    this.where({ isDeleted: false });
  }
  next();
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
