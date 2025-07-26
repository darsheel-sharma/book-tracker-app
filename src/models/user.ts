import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { isEmail } from 'validator';
import bcrypt from 'bcrypt';

// Define the interface for a User document
export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password: string;
    totalBooks: number;
    completedBooks: number;
}

// Define the static method interface
interface IUserModel extends Model<IUser> {
  login(email: string, password: string): Promise<IUser>;
}

// Define schema
const userSchema = new Schema<IUser, IUserModel>({
  name: {
    type: String,
    required: [true, "Please enter your name"]
  },
  email: {
    type: String,
    required: [true, "Please enter an email"],
    unique: true,
    lowercase: true,
    validate: [isEmail, "Please enter a valid email"]
  },
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [6, "Minimum password length is 6 characters"]
  },
  totalBooks: {
    type: Number,
    default: 0
  },
  completedBooks: {
    type: Number,
    default: 0
  }
});

// 🔐 Hash password before saving
userSchema.pre<IUser>('save', async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Static login method
userSchema.statics.login = async function (email: string, password: string): Promise<IUser> {
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
        return user;
    }
    throw("incorrect password");
    
  }
  throw new Error("incorrect email");
};

// Export model
const User = mongoose.model<IUser, IUserModel>('User', userSchema);
export default User;
