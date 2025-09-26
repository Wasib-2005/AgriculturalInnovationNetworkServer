import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

import ProductSchema from "./models/ProductSchema.js";
import CommentsSchema from "./models/CommentsSchema.js";
import UserSchema from "./models/UserSchema.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.1.25:5173"],
    credentials: true,
  })
);
app.use(express.json());

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Ensure upload folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.post("/user_verification", (req, res) => {
  res.send("API is running...");
});

// POST: Add new product
app.post("/upload/products", upload.single("productImg"), async (req, res) => {
  try {
    console.log("Received product data:", req.body);

    let imageUrl = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "farmer_products",
      });
      imageUrl = result.secure_url;

      // Remove temp file
      fs.unlinkSync(req.file.path);
    }

    const newProduct = new ProductSchema({
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

// GET: All products
app.get("/get/products", async (req, res) => {
  try {
    // Query params from frontend (default: page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate skip
    const skip = (page - 1) * limit;

    // Fetch products with skip + limit
    const products = await ProductSchema.find().skip(skip).limit(limit);

    // Count total documents
    const total = await ProductSchema.countDocuments();

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET Product by Name & category
app.get("/product_search", async (req, res) => {
  try {
    const search = req.query.name; // can be product name or category
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!search) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const skip = (page - 1) * limit;

    // Case-insensitive search by productName OR category
    const query = {
      $or: [
        { productName: { $regex: new RegExp(search, "i") } },
        { productCategory: { $regex: new RegExp(search, "i") } },
      ],
    };

    const products = await ProductSchema.find(query).skip(skip).limit(limit);

    const total = await ProductSchema.countDocuments(query);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch products", error });
  }
});

app.get("/get/product/:id", async (req, res) => {
  try {
    console.log("product by id");
    const { id } = req.params;
    const product = await ProductSchema.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch product", error });
  }
});

app.post("/comments", async (req, res) => {
  const { productId, user, comment } = req.body;

  if (!productId || !user || !comment) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    let commentsDoc = await CommentsSchema.findOne({ productId });

    if (!commentsDoc) {
      // Create new comments document for product
      commentsDoc = new CommentsSchema({
        productId,
        comments: [{ user, comment }],
      });
    } else {
      // Add new comment to existing document
      commentsDoc.comments.push({ user, comment });
    }

    await commentsDoc.save();
    res.status(201).json({ message: "Comment added!", comments: commentsDoc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add comment", error: err });
  }
});

// GET: Fetch comments for a product
app.get("/comments/:productId", async (req, res) => {
  const { productId } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  try {
    const commentsDoc = await CommentsSchema.findOne({ productId })
      .populate("productId")
      .lean();

    if (!commentsDoc) {
      return res.json({ productId, comments: [] }); // Return empty array
    }

    commentsDoc.comments = commentsDoc.comments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    res.json(commentsDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch comments", error: err });
  }
});

app.post("/user_verification", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const existingUser = await UserSchema.findOne({ email });

    if (existingUser) {
      return res.json({ exists: true, user: existingUser });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

app.post("/create_user", async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    return res
      .status(400)
      .json({ message: "Name, email, and role are required" });
  }

  try {
    // Check if user already exists by email
    const existingUser = await UserSchema.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists", user: existingUser });
    }

    // Create new user
    const newUser = new UserSchema({ name, email: email.toLowerCase(), role });
    await newUser.save();

    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create user", error });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
