import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  productCategory: { type: String, required: true },
  productQuantity: { type: Number, required: true },
  productPrice: { type: Number, required: true },
  productImg: { type: String }, // Cloudinary URL
  productDescription: { type: String },
}, { timestamps: true });

export default mongoose.model("Product", ProductSchema);
