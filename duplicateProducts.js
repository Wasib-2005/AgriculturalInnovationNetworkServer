import mongoose from "mongoose";
import Product from "./models/ProductSchema.js";

async function duplicateProducts(times = 2) {
  try {
    await mongoose.connect(
      "mongodb://localhost:27017/AgriculturalInnovationNetwork",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    const products = await Product.find();

    let copies = [];
    for (let i = 0; i < times; i++) {
      products.forEach((product) => {
        const { _id, createdAt, updatedAt, __v, ...rest } = product.toObject();
        copies.push({ ...rest });
      });
    }

    console.log(`Creating ${copies.length} duplicate products...`);

    const inserted = await Product.insertMany(copies);
    console.log(
      `Duplicated products ${times} times. Added ${inserted.length} items.`
    );
    mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}

duplicateProducts(3); // change this number to how many times you want copies
