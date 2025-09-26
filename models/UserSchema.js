import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["farmer", "officer", "consumer", "admin"], // allowed roles
      required: true, // no default, must be provided
    },
  },
  { timestamps: true }
);

export default mongoose.model("users", UserSchema);
