const mongoose = require("./db");

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      index: true,
    },
    stock: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

/*
Compound indexes
Common queries:
- filter by category + sort price
- filter by category + createdAt
- search category + name
*/

itemSchema.index({ category: 1, price: -1 });
itemSchema.index({ category: 1, createdAt: -1 });
itemSchema.index({ category: 1, name: 1 });

module.exports = mongoose.model("Item", itemSchema);
