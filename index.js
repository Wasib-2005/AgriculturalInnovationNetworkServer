import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import Product from "./models/Product.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Multer (for file uploads)
const upload = multer({ dest: "uploads/" });

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error(err));

// Routes
app.post("/api/products", upload.single("productImg"), async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "farmer_products",
      });
      imageUrl = result.secure_url;
    }

    const newProduct = new Product({
      productName: req.body.productName,
      productCategory: req.body.productCategory,
      productQuantity: req.body.productQuantity,
      productPrice: req.body.productPrice,
      productImg: imageUrl,
      productDescription: req.body.productDescription,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added!", product: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed", error });
  }
});

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);
