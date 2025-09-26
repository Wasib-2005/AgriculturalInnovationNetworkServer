import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  age: String,
  gender: String,
  phone: String,
  region: String,
  farmSize: String,
  crops: String,
  department: String,
  position: String,
  experience: String,
  degree: String,
  institution: String,
  address: String,
  preferences: String,
});

export default mongoose.model("User", UserSchema);
