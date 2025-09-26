// models/CommentsSchema.js
import mongoose from "mongoose";

const CommentsSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "products", // Reference to the products collection
      required: true,
    },
    comments: [
      {
        user: {
          type: String,
          required: true,
        },
        comment: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("comments", CommentsSchema);
