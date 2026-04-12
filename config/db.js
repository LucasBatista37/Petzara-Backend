const mongoose = require("mongoose");

const conn = async () => {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    throw new Error("MONGO_URI não está definido");
  }
  const dbConn = await mongoose.connect(uri);
  console.log("Conectou ao banco!");
  return dbConn;
};

module.exports = conn;
